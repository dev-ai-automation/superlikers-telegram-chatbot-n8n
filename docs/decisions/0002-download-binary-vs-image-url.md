# ADR 0002 — Descargar binario y subir multipart (no image_url)

**Estado:** aceptada

## Contexto
El endpoint `POST /photos` de Superlikers acepta dos modos: subir el archivo binario (`multipart/form-data`, campo `upload_photo`) o enviar una URL pública (`image_url`). La imagen llega desde Twilio como `MediaUrl0`.

## Decisión
**Descargar el binario** de `MediaUrl0` dentro de n8n (HTTP Request con Basic auth de Twilio) y **subirlo multipart** a `/photos`.

## Razón
El `MediaUrl0` de Twilio está protegido con **HTTP Basic auth** (Account SID / Auth Token) y devuelve un **302** a un objeto S3 que **expira**. Superlikers no tiene credenciales de Twilio, así que **no puede** hacer `GET` de esa URL — `image_url` daría 401 o expiraría. El multipart con el binario es el único camino confiable. La misma imagen binaria alimenta a `Vision: Read Invoice`.

## Consecuencias
- Un hop extra (descarga) y un binario en memoria por ticket.
- Requiere una credencial `httpBasicAuth` con el SID/Token de Twilio (se crea en la UI).
- El binario cruza el boundary del sub-workflow `Vision` vía `passthrough` (válido para Execute Workflow; la restricción de binarios aplica solo a *tools* de Agent).
