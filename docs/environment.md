# Entorno y credenciales

## Variables de entorno (n8n)

| Var | Valor | Uso |
|---|---|---|
| `BASE_URL` | `https://api.superlikerslabs.com/v1` | Base de todos los endpoints Superlikers |
| `CAMPAIGN` | `3z` | Campaña (entorno labs) |

> El **bot token** de Telegram NO es una variable de entorno: vive solo en la credencial `telegramApi` de n8n.
> Los **secretos** (api_key Superlikers, bot token Telegram) viven en el sistema de credenciales de n8n, **nunca** en variables ni en los `.json`. Exportar un workflow filtra la *referencia* (ID de credencial), no el secreto.

## Mapa de credenciales (verificado con `list_credentials`)

| Servicio | Credencial n8n | ID | Tipo | Binding |
|---|---|---|---|---|
| Superlikers (Bearer) | `[SL]: Jafet` | `SXkzMC9XmTKtBrB5` | `httpBearerAuth` | **Manual en UI** ⚠️ |
| Google Sheets (log) | `Notifications Global \| PR - GCP` | `zPSbCwnVsmQZu2Wt` | `googleSheetsOAuth2Api` | Manual en UI |
| Telegram (bot @BotFather) | `Telegram API` | *(crear en UI)* | `telegramApi` | **Manual en UI** ⚠️ (no existía al crear el workflow) |
| Slack | `[n8n-integration]: Global PR` | `tpnxMkAqiii9UBMa` | `slackOAuth2Api` | Auto-asignada |
| OpenAI (Vision) | `[Sandbox]: Jafet - Personal` | `E8NkAR6oYCCT73Nm` | `openAiApi` | setNodeCredential |
| Claude/Anthropic | `[Sandbox]: Jafet - Personal` | `BoCFnuc0S2yk9LyX` | `anthropicApi` | setNodeCredential |

### ⚠️ Corrección importante (verificada)

La instrucción inicial mapeaba `zPSbCwnVsmQZu2Wt` como credencial Bearer para Superlikers. **`list_credentials` confirmó que ese ID es Google Sheets OAuth2**, no Bearer — n8n lo rechaza en un slot `httpBearerAuth`. La credencial Bearer real es **`SXkzMC9XmTKtBrB5` (`[SL]: Jafet`)**, la misma del ejemplo de autenticación original. `zPSbCwnVsmQZu2Wt` queda reservada para el log en Google Sheets.

## Selección manual de credenciales (nodos HTTP)

El MCP de n8n **no puede** bindear credenciales de auth genérica a nodos `HTTP Request` (limitación conocida), y al crear el workflow no existía ninguna credencial `telegramApi`, así que los 4 nodos Telegram quedan **sin credencial bindeada**. El **método** de auth ya queda pre-configurado (`genericCredentialType` + `httpBearerAuth` para Superlikers); solo falta **seleccionar la credencial** en la UI (1 clic). Nodos afectados:

1. `Superlikers: Request` → "Call Superlikers API" → credencial **`[SL]: Jafet`** (Bearer).
2. Principal → los 4 nodos Telegram (`Telegram Trigger`, `Download Telegram Media`, `Send Telegram Reply`, `Send Telegram Photo Reminder`) → credencial **`Telegram API`** (`telegramApi`, bot token de @BotFather; crear en UI).
3. Principal → "Upload Photo Multipart" → credencial **`[SL]: Jafet`** (Bearer).
4. Principal → "Log Transaction" (Google Sheets) → credencial **`Notifications Global`** + seleccionar hoja.

## Prerrequisitos en la UI de n8n

1. Crear la credencial `telegramApi` con el **bot token** de @BotFather y seleccionarla en los 4 nodos Telegram.
2. **Publicar** el workflow: el `Telegram Trigger` registra el webhook contra la Bot API automáticamente (no hay que configurar URL a mano). Telegram **no entrega el celular**: el participante lo tipea en el estado `phone`.
3. Verificar en el Panel de Superlikers que el campo de celular del formulario esté ligado a `cellphone` (la búsqueda por celular depende de esto).
4. (Opcional) Activar un *Error Workflow* a nivel instancia → Slack.

## IDs de workflows desplegados (instancia n8n)

Instancia: https://n8n.srv1499692.hstgr.cloud · Proyecto: Dev Automation (ZBaqJyvdifxCV4uh)

| Workflow | ID |
|---|---|
| Superlikers: Telegram Ticket Bot (3z) | 4qFhph7LKYgFqctz |
| Superlikers: Request | iMWPZE5gVhbc4Sge |
| Vision: Read Invoice | VeL0Lewf2pIojSsm |
| Conversation: Understand | EI6Ax3aTtjVGRwAp |
| Superlikers: Retry Queue Worker | MJSCstoF7CU20JUm |

Data Tables: wa_superlikers_sessions (AsmN5sq4Pop0FVCi), wa_superlikers_retry_queue (F7RemUCjuKZT4JBL)
