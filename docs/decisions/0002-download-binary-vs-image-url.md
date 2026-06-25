# ADR 0002 — Descargar binario y subir multipart (no image_url)

**Estado:** aceptada

## Contexto
El endpoint `POST /photos` de Superlikers acepta dos modos: subir el archivo binario (`multipart/form-data`, campo `upload_photo`) o enviar una URL pública (`image_url`). La imagen llega desde Telegram como un `file_id` dentro de `message.photo[]`.

## Decisión
**Descargar el binario** del `file_id` con `Download Telegram Media` (`n8n-nodes-base.telegram`, resource `file` / operation `get`, `download:true`) y **subirlo multipart** a `/photos`.

## Razón
La lógica de fondo no cambió respecto de la versión WhatsApp: **descargamos el binario, no pasamos una URL**. Telegram no expone una URL pública persistente de la foto — primero hay que resolver el `file_id` con `getFile` para obtener un `file_path`, y la URL de descarga resultante incluye el bot token (no es algo que convenga pasarle a Superlikers como `image_url`, y además es efímera). El nodo `telegram` `file/get` con `download:true` hace `getFile` + descarga en un paso y deja el binario en la property `data` (sin `binaryPropertyName` configurable). Subir ese binario multipart es el camino confiable, y el **mismo binario** alimenta a `Vision: Read Invoice`.

## Consecuencias
- Un hop extra (resolución `getFile` + descarga) y un binario en memoria por ticket.
- Requiere la credencial `telegramApi` (bot token) en el nodo de descarga.
- El binario sale en la property `data` (no es configurable); los nodos aguas abajo deben referenciar esa property.
- El binario cruza el boundary del sub-workflow `Vision` vía `passthrough` (válido para Execute Workflow; la restricción de binarios aplica solo a *tools* de Agent).

## Historia (versión WhatsApp/Twilio)
Antes la imagen llegaba como `MediaUrl0` de Twilio, protegida con **HTTP Basic auth** (Account SID / Auth Token) y con un **302** a un objeto S3 que **expiraba**. Superlikers no tenía credenciales de Twilio, así que `image_url` habría dado 401 o expirado. Se descargaba el binario con un `httpRequest` GET + Basic auth (`twilioApi`). En Telegram el problema concreto es otro (URL con token, efímera, vía `getFile`), pero **la conclusión es idéntica**: descargar el binario y subir multipart.
