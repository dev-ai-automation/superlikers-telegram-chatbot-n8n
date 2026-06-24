# ADR 0001 — Webhook + Respond to Webhook (no Twilio Trigger)

**Estado:** aceptada

## Contexto
n8n ofrece dos formas de recibir mensajes de Twilio WhatsApp: el nodo `Twilio Trigger` (basado en *Event Streams* de Twilio, configuración a nivel cuenta) o un `Webhook` genérico apuntado al *Messaging webhook* del número.

## Decisión
Usar **`Webhook` (v2.1) + `Respond to Webhook` (v1.5)**.

## Razón
El *Messaging webhook* de Twilio POSTea el payload completo por mensaje (`From`, `Body`, `NumMedia`, `MediaUrl0`, `MediaContentType0`) — exactamente lo que necesita un chatbot que recibe imágenes. `Twilio Trigger` depende de Event Streams (config extra) y no es el encaje natural para media por-mensaje. Además, `Respond to Webhook` permite cerrar el request de Twilio con un 200 inmediato y seguir el procesamiento async, evitando timeouts del webhook (~15s).

## Consecuencias
- Hay que configurar la URL del webhook en el número WABA de Twilio.
- La validación `X-Twilio-Signature` queda como hardening opcional (no bloqueante para el reto).
