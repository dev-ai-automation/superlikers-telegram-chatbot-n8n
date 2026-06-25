# Runbook operativo

## Cómo se dispara

- **Inbound**: el **`Telegram Trigger`** del workflow principal recibe cada `message` del bot. Al **publicar** el workflow, el trigger registra el webhook contra la Bot API automáticamente (no hay que configurar URL a mano) y responde el ACK 200 solo.
- **Retry CRON**: el `Retry Queue Worker` corre **cada 2 horas** automáticamente (Schedule Trigger).

## Qué observar

| Señal | Dónde | Acción |
|---|---|---|
| `[INGRESS superlikers-wa]` en logs | Ejecuciones del principal | Confirma que llegó el update de Telegram (raw, size-capped) ANTES de parsear |
| `status=manual_review` | `wa_superlikers_sessions` | Ticket con `execution_error` al aceptar → revisar manualmente en el Panel |
| Filas `pending` que crecen | `wa_superlikers_retry_queue` | La API estuvo caída; el CRON las reintenta. Si > 500, investigar |
| Alerta en Slack `[n8n-integration]: Global PR` | Canal configurado | Un reintento agotó 3 intentos → intervención manual |

## Manejo de incidentes

### "El bot no responde en Telegram"
1. ¿El workflow principal está **publicado** (active)? El `Telegram Trigger` solo registra el webhook y escucha si está activo.
2. ¿La credencial `telegramApi` (bot token) está seleccionada en el `Telegram Trigger`? Sin token válido no se registra el webhook.
3. Revisar la última ejecución: el `Log Incoming Event` muestra el update crudo. Si falta `message.chat.id` / `message.text`, el mapeo de Telegram cambió.

### "No otorga puntos en una factura válida"
1. Revisar la salida de `Vision: Read Invoice`: ¿`legible:true` con `ref` y `products`?
2. Revisar `Superlikers: Request` para `retail/buy`: `errorType`. Si `ref_duplicate`, esa factura ya generó puntos.
3. Si `execution_error` en `entries/accept` → quedó en revisión manual (esperado).

### "Credencial inválida (401)"
- **Superlikers**: `errorType=unauthorized`. Verificar que el nodo HTTP tenga seleccionada la credencial **`[SL]: Jafet`** (Bearer) — recordá que se selecciona **manualmente** en la UI.
- **Telegram**: si el trigger no registra el webhook o `sendMessage` falla con `401 Unauthorized`, el bot token de la credencial `telegramApi` es inválido o fue revocado en @BotFather → regenerarlo y actualizar la credencial.

## Cola de reintentos (operación)

- Solo se encolan ops **idempotentes** que fallaron por **timeout/503** (no 401/422, que son errores de datos).
- El CRON reintenta hasta **3 veces**; luego marca `fail` + Slack.
- Mantener la tabla pequeña: borrar filas `done`/`fail` periódicamente (rinde óptimo < 500 filas).

## Tono de marca

Los mensajes salientes mantienen una persona fija (cercana, clara, máximo 1 emoji). Los Guardrails de entrada absorben tonos hostiles/off-topic antes de llegar al LLM, y hay un fallback determinista: el bot **nunca** queda sin voz consistente.
