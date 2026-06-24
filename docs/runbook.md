# Runbook operativo

## Cómo se dispara

- **Inbound**: Twilio POSTea cada mensaje de WhatsApp al **Webhook** del workflow principal (`path: superlikers-whatsapp`). Configurar esa URL en el número WABA (`+17876639222`, campo *"A message comes in"*).
- **Retry CRON**: el `Retry Queue Worker` corre **cada 2 horas** automáticamente (Schedule Trigger).

## Qué observar

| Señal | Dónde | Acción |
|---|---|---|
| `[INGRESS superlikers-wa]` en logs | Ejecuciones del principal | Confirma que llegó el payload de Twilio (raw, size-capped) ANTES de parsear |
| `status=manual_review` | `wa_superlikers_sessions` | Ticket con `execution_error` al aceptar → revisar manualmente en el Panel |
| Filas `pending` que crecen | `wa_superlikers_retry_queue` | La API estuvo caída; el CRON las reintenta. Si > 500, investigar |
| Alerta en Slack `[n8n-integration]: Global PR` | Canal configurado | Un reintento agotó 3 intentos → intervención manual |

## Manejo de incidentes

### "El bot no responde a WhatsApp"
1. ¿El workflow principal está **publicado** (active)? El webhook solo escucha si está activo.
2. ¿La URL del webhook está configurada en Twilio?
3. Revisar la última ejecución: el `Log Incoming Event` muestra el payload crudo. Si falta `From`/`Body`, el mapeo de Twilio cambió.

### "No otorga puntos en una factura válida"
1. Revisar la salida de `Vision: Read Invoice`: ¿`legible:true` con `ref` y `products`?
2. Revisar `Superlikers: Request` para `retail/buy`: `errorType`. Si `ref_duplicate`, esa factura ya generó puntos.
3. Si `execution_error` en `entries/accept` → quedó en revisión manual (esperado).

### "Credencial inválida (401)"
- `errorType=unauthorized`. Verificar que el nodo HTTP tenga seleccionada la credencial **`[SL]: Jafet`** (Bearer) — recordá que se selecciona **manualmente** en la UI.

## Cola de reintentos (operación)

- Solo se encolan ops **idempotentes** que fallaron por **timeout/503** (no 401/422, que son errores de datos).
- El CRON reintenta hasta **3 veces**; luego marca `fail` + Slack.
- Mantener la tabla pequeña: borrar filas `done`/`fail` periódicamente (rinde óptimo < 500 filas).

## Tono de marca

Los mensajes salientes mantienen una persona fija (cercana, clara, máximo 1 emoji). Los Guardrails de entrada absorben tonos hostiles/off-topic antes de llegar al LLM, y hay un fallback determinista: el bot **nunca** queda sin voz consistente.
