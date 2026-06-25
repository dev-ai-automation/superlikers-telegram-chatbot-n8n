# Migración WhatsApp (Twilio) → Telegram

Este documento es el **delta** entre la primera versión (WhatsApp vía Twilio) y la actual (Telegram Bot API). La lógica de negocio, la FSM, la visión, los guardrails y la idempotencia **no cambiaron**: la migración se concentró en el canal.

## Por qué migrar

- **Sin dependencia de Twilio/WABA** ni números aprobados: un bot de @BotFather basta.
- **API de archivos nativa** (`getFile`) más simple y sin auth que expire (la `MediaUrl` de Twilio caduca y pide Basic auth).
- **Webhook gestionado por n8n**: el `Telegram Trigger` registra el webhook al publicar y responde el ACK solo.

## Qué quedó intacto (channel-agnostic)

Los 4 sub-workflows no se tocaron salvo 2 strings de texto: `Superlikers: Request`, `Vision: Read Invoice`, `Conversation: Understand` (cambió "WhatsApp"→"Telegram" en el system prompt del agente), `Superlikers: Retry Queue Worker`. También la FSM, las Data Tables y el log de transacciones.

## Mapeo nodo por nodo (workflow principal)

| Antes (WhatsApp/Twilio) | Después (Telegram) | Cambio |
|---|---|---|
| `Webhook WhatsApp Inbound` (`webhook` v2.1) | `Telegram Trigger` (`telegramTrigger` v1.3, `updates:["message"]`) | El trigger gestiona webhook + ACK 200. |
| `Respond 200` (`respondToWebhook`) | — (eliminado) | Ya no hace falta responder manualmente. |
| `Normalize Twilio Input` (lee `From`, `Body`, `NumMedia`, `MediaUrl0`) | `Normalize Telegram Input` (lee `message.chat.id`, `message.text \|\| caption`, `message.photo[].file_id`) | Toma la foto de mayor resolución (último elemento de `photo[]`). |
| `Download Twilio Media` (`httpRequest` GET `MediaUrl0` + Basic auth `twilioApi`) | `Download Telegram Media` (`telegram` `file/get`, `download:true`) | Resuelve `getFile` y baja el binario; sale en `data` (sin `binaryPropertyName` configurable). |
| `Send WhatsApp Reply` (`twilio` send) | `Send Telegram Reply` (`telegram` `sendMessage`, `parse_mode:Markdown`) | `chatId` en vez de `to: whatsapp:+...`. |
| `Send Photo Reminder` (`twilio`) | `Send Telegram Photo Reminder` (`telegram` `sendMessage`) | idem. |

## Clave de sesión: `phone` → `chatId`

El cambio conceptual más importante.

- **WhatsApp**: el `From` (número) hacía **doble función**: identidad del canal **y** celular del participante. La sesión se buscaba por `phone`.
- **Telegram**: la identidad del canal es `chat.id` (no es un teléfono). Telegram **no entrega el celular**. Por eso:
  - La Data Table `wa_superlikers_sessions` sumó una columna **`chatId`** (string), que es ahora la **clave de upsert/get** (`matchingColumns:["chatId"]`).
  - La columna **`phone`** se conserva, pero ahora es **dato de negocio**: el celular que el usuario **tipea** en el estado `phone`, usado por `participants/search` (`query.cellphone`) y por el registro (`properties.celular`).
  - El celular se sanea en `Resolve Context` (`typedPhone = text.replace(/\D/g,'')`) antes de validar/buscar, ya que el texto tipeado puede traer espacios o `+`.

Nodos afectados por la clave: `Get Session`, `Persist Session`, `Get Session Again` (filtro/match por `chatId`). Todos los nodos Code de respuesta ahora propagan `chatId` (y dejaron de propagar `fromRaw`).

## Delta de credenciales

- **Se quita**: credencial Twilio (`twilioApi`) y el Basic auth para `MediaUrl0`.
- **Se agrega**: una credencial **Telegram API** (`telegramApi`) con el bot token. La usan los 4 nodos Telegram. El token vive **solo** en la credencial (nunca en `.json`/git).
- **Sin cambios**: la credencial HTTP Bearer de Superlikers y la de Slack.

> ⚠️ Al crear el workflow vía MCP, los nodos Telegram quedan **sin credencial bindeada** (no existía ninguna `telegramApi`). El usuario crea la credencial y la selecciona en los 4 nodos antes de publicar.

## Archivos del repo

- **`workflows/superlikers-telegram-main.json`** — el principal Telegram (nuevo, importable a n8n). Workflow id `BRG7YnCZ2GEpiO64`.
- `workflows/superlikers-whatsapp-main.json` — se conserva como **referencia** de la versión WhatsApp (workflow archivado `4qFhph7LKYgFqctz`).
- `workflows/superlikers-telegram-main.sdk.ts` — fuente SDK (n8n Workflow SDK) con la que se construyó el workflow Telegram, útil para ver "por qué cada nodo".
- Los 4 sub-workflows (`*.subworkflow.json`, `*-retry-cron.json`) son los mismos; solo el NLU cambió 2 strings de texto.

## Mejora opcional no implementada

Telegram permite un `KeyboardButton` con `request_contact:true` para que el usuario comparta su celular con un toque. No se implementó por defecto porque el celular del registro debe ser el que el usuario **declara** (puede diferir del número de su cuenta de Telegram). Queda documentado como mejora.
