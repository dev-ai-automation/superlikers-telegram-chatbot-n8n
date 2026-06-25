# ADR 0001 — Telegram Trigger nativo (no Webhook genérico)

**Estado:** aceptada (supersede la decisión original de WhatsApp/Twilio — ver *Historia*)

## Contexto
Para recibir mensajes en n8n hay dos enfoques: un `Webhook` genérico al que el canal POSTea cada mensaje (cerrando el request a mano con `Respond to Webhook`), o un **trigger nativo del canal** que gestiona el registro del webhook y el ACK por nosotros. Con Telegram, ese trigger es `Telegram Trigger`.

## Decisión
Usar el **`Telegram Trigger`** (`n8n-nodes-base.telegramTrigger` v1.3, `updates:["message"]`).

## Razón
El `Telegram Trigger` **registra el webhook** contra la Bot API al publicar el workflow (no hay que configurar una URL a mano en ningún panel externo) y **responde el ACK 200 solo**. Filtrando `updates:["message"]` recibimos exactamente lo que necesita el bot (texto y fotos), sin el ruido de otros tipos de update. Es el encaje natural en Telegram y elimina dos nodos (`Webhook` + `Respond to Webhook`) frente al enfoque genérico.

## Consecuencias
- El bot token vive en la credencial `telegramApi`; sin token válido el trigger no registra el webhook.
- No hay que tocar ninguna config fuera de n8n: publicar el workflow basta.
- El payload crudo se sigue logueando (size-capped) ANTES de parsear, en el primer Code tras el trigger.

## Historia (versión WhatsApp/Twilio)
En la primera versión (WhatsApp vía Twilio) **no existía** un trigger nativo cómodo para media por-mensaje: el `Twilio Trigger` depende de *Event Streams* (config a nivel cuenta) y no era el encaje natural. Por eso se usó **`Webhook` (v2.1) + `Respond to Webhook` (v1.5)**: el *Messaging webhook* de Twilio POSTeaba el payload completo (`From`, `Body`, `NumMedia`, `MediaUrl0`) y `Respond to Webhook` cerraba el request con un 200 inmediato para evitar el timeout (~15s) y seguir async. Eso obligaba a configurar la URL del webhook en el número WABA a mano. Con Telegram, el trigger nativo absorbe ambas responsabilidades, así que esos dos nodos se eliminaron.
