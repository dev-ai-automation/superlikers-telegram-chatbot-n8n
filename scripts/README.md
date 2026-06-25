# scripts/ — utilidades de prueba

## `telegram_helper.py`

Helper de línea de comandos para probar el bot de Superlikers (Telegram) **en vivo**, del lado del bot. Sirve para mandar mensajes/fotos al chat, inspeccionar el bot y extraer `file_id` / `chat_id` para armar updates de prueba.

### Para qué sirve cada comando

| Comando | Qué hace |
| --- | --- |
| `getme` | Llama a `getMe` — confirma que el token es válido y muestra los datos del bot. |
| `getupdates` | Llama a `getUpdates` — trae los últimos updates pendientes (ver nota del 409). |
| `send <chat_id> "<texto>"` | Envía un `sendMessage` al chat. |
| `sendphoto <chat_id> <ruta> ["caption"]` | Envía una foto (`sendPhoto`) con caption opcional. |
| `fileid <chat_id> <ruta>` | Envía la foto y devuelve el `file_id` de mayor resolución — útil para armar un update de prueba con una foto real. |

### Token: nunca hardcodeado

El **bot token nunca se escribe en el código ni se commitea**. Se resuelve, en este orden:

1. Variable de entorno `TELEGRAM_BOT_TOKEN`.
2. Flag `--token-file <ruta>` (acepta el formato `api-key: <token>` o el token suelto).

Si no hay ninguno de los dos, el script aborta con un error claro. El archivo `env-telegram.env` está en `.gitignore` (`*.env`), así que el token vive solo en tu entorno local o en la credencial `telegramApi` de n8n.

```bash
export TELEGRAM_BOT_TOKEN="<bot token de @BotFather>"
python telegram_helper.py getme
python telegram_helper.py send 123456789 "Probando el bot 👋"
python telegram_helper.py fileid 123456789 ../fixtures/invoice-legible.png
```

### e2e real: cómo se prueba punta a punta

Para la prueba **end-to-end real** no se simula nada: se **publica el workflow** y se escriben **mensajes reales** al bot desde Telegram. El `Telegram Trigger` recibe el update por su webhook y la **FSM responde sola** — este helper solo sirve para empujar mensajes/fotos del lado del bot y para extraer `file_id` / `chat_id`.

> **Nota — 409 en `getupdates`:** `getUpdates` solo funciona si **no hay webhook activo**. Cuando el workflow está publicado, Telegram entrega los updates al **webhook de n8n** y `getUpdates` devuelve **409 Conflict**. Es lo esperado: significa que el webhook está vivo y recibiendo. Si necesitás `getupdates`, primero hay que despublicar (quitar el webhook).
