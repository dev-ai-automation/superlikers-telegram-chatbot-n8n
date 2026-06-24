# Casos de prueba (checklist del reto)

Las 4 pruebas obligatorias del reto, mapeadas a la FSM. Cada una debe ser **reproducible** (esa es la ventaja del diseño determinista).

## Prueba 1 — Usuario nuevo (flujo completo)

| Paso | Mensaje del usuario | Estado | Resultado esperado |
|---|---|---|---|
| 1 | celular nuevo | `phone` | `participants/search` → vacío → pide nombre |
| 2 | "Juan Pérez" | `name` | guarda nombre → pide email |
| 3 | "juan@mail.com" | `email` | valida → muestra resumen → pide confirmación |
| 4 | "SÍ" | `confirm` | `participants` (registra activo+verificado) → pide foto |
| 5 | foto de factura legible | `photo` | `photos` → Vision (legible) → `retail/buy` → `entries/accept` → "🎉 ganaste N puntos" |

**Verificar**: fila en `wa_superlikers_sessions` con `status=completed`; fila en el log de transacciones.

## Prueba 2 — Usuario existente (salta registro)

| Paso | Mensaje | Estado | Resultado |
|---|---|---|---|
| 1 | celular ya registrado | `phone` | `participants/search` → encontrado → guarda `distinctId` → **salta directo a pedir foto** |
| 2 | foto legible | `photo` | upload → vision → buy → accept → puntos |

## Prueba 3 — Factura ilegible / no es factura

| Paso | Mensaje | Resultado |
|---|---|---|
| n | foto de una selfie / borrosa | Vision devuelve `legible:false` + `detected_type` → **NO** llama `/retail/buy` → *"Recibí un/a selfie, no un ticket 📷. Mandame una foto clara de tu factura (JPG/PNG)."* |

**Verificar**: no se otorgan puntos; el bot pide nueva foto sin avanzar de estado.

## Prueba 4 — Foto / factura duplicada

| Caso | Disparador | Resultado |
|---|---|---|
| Foto duplicada | `/photos` devuelve `Sha1 is already taken` | `errorType=sha1_taken` → *"Ese ticket ya fue registrado antes ✋"* (no reintenta) |
| Compra duplicada | `/retail/buy` con `ref` repetido | `errorType=ref_duplicate` → *"Esa compra ya generó puntos ✋"* |

## Escenarios de error adicionales (tabla del reto)

| Situación | Comportamiento |
|---|---|
| Celular/email inválido | Re-pide explicando el formato (sin avanzar) |
| Texto donde se espera imagen | Recordatorio amable de enviar la foto |
| `execution_error` al aceptar | *"Tu ticket quedó en revisión manual 🕒"* + Slack |
| API timeout / 503 | retry inmediato (3x) → si persiste: encola en `retry_queue` + *"intentá más tarde"* + CRON 2h |
| Usuario inactivo 5 min | Wait 5 min → si sigue esperando foto → recordatorio |

## Cómo ejecutar (sin tráfico real)

Con el MCP de n8n: `prepare_test_pin_data` + `test_workflow` pinpean el webhook/Twilio/HTTP con data simulada. Los Code/IF/Switch corren de verdad. Para el inbound de Twilio, simular el body form: `{ From: "whatsapp:+573001234567", Body: "3001234567", NumMedia: "0" }`.
