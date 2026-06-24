# Entorno y credenciales

## Variables de entorno (n8n)

| Var | Valor | Uso |
|---|---|---|
| `BASE_URL` | `https://api.superlikerslabs.com/v1` | Base de todos los endpoints Superlikers |
| `CAMPAIGN` | `3z` | Campaña (entorno labs) |
| `TWILIO_WHATSAPP_FROM` | `whatsapp:+17876639222` | Número WABA emisor |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | *(secreto)* | Solo referencia; el binding real es por credencial n8n |

> Los **secretos** (api_key Superlikers, tokens Twilio) viven en el sistema de credenciales de n8n, **nunca** en variables ni en los `.json`. Exportar un workflow filtra la *referencia* (ID de credencial), no el secreto.

## Mapa de credenciales (verificado con `list_credentials`)

| Servicio | Credencial n8n | ID | Tipo | Binding |
|---|---|---|---|---|
| Superlikers (Bearer) | `[SL]: Jafet` | `SXkzMC9XmTKtBrB5` | `httpBearerAuth` | **Manual en UI** ⚠️ |
| Google Sheets (log) | `Notifications Global \| PR - GCP` | `zPSbCwnVsmQZu2Wt` | `googleSheetsOAuth2Api` | Manual en UI |
| Twilio (WABA +17876639222) | `[Production]: Angeliz` | `Pq4OgNnjv6rFaizo` | `twilioApi` | Auto / setNodeCredential |
| Slack | `[n8n-integration]: Global PR` | `tpnxMkAqiii9UBMa` | `slackOAuth2Api` | Auto-asignada |
| OpenAI (Vision) | `[Sandbox]: Jafet - Personal` | `E8NkAR6oYCCT73Nm` | `openAiApi` | setNodeCredential |
| Claude/Anthropic | `[Sandbox]: Jafet - Personal` | `BoCFnuc0S2yk9LyX` | `anthropicApi` | setNodeCredential |

### ⚠️ Corrección importante (verificada)

La instrucción inicial mapeaba `zPSbCwnVsmQZu2Wt` como credencial Bearer para Superlikers. **`list_credentials` confirmó que ese ID es Google Sheets OAuth2**, no Bearer — n8n lo rechaza en un slot `httpBearerAuth`. La credencial Bearer real es **`SXkzMC9XmTKtBrB5` (`[SL]: Jafet`)**, la misma del ejemplo de autenticación original. `zPSbCwnVsmQZu2Wt` queda reservada para el log en Google Sheets.

## Selección manual de credenciales (nodos HTTP)

El MCP de n8n **no puede** bindear credenciales de auth genérica a nodos `HTTP Request` (limitación conocida). El **método** de auth ya queda pre-configurado (`genericCredentialType` + `httpBearerAuth`/`httpBasicAuth`); solo falta **seleccionar la credencial** en la UI (1 clic). Nodos afectados:

1. `Superlikers: Request` → "Call Superlikers API" → credencial **`[SL]: Jafet`** (Bearer).
2. Principal → "Download Twilio Media" → credencial **httpBasicAuth** con `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` (crear en UI).
3. Principal → "Upload Photo Multipart" → credencial **`[SL]: Jafet`** (Bearer).
4. Principal → "Log Transaction" (Google Sheets) → credencial **`Notifications Global`** + seleccionar hoja.

## Prerrequisitos en la UI de n8n

1. Crear credencial `httpBasicAuth` con Twilio Account SID (user) + Auth Token (pass) para descargar `MediaUrl0`.
2. Configurar el webhook de Twilio: número WABA `+17876639222`, campo *"A message comes in"* → URL de producción del nodo Webhook (tras publicar).
3. Verificar en el Panel de Superlikers que el campo de celular del formulario esté ligado a `cellphone` (la búsqueda por celular depende de esto).
4. (Opcional) Activar un *Error Workflow* a nivel instancia → Slack.

## IDs de workflows desplegados (instancia n8n)

Instancia: https://n8n.srv1499692.hstgr.cloud · Proyecto: Dev Automation (ZBaqJyvdifxCV4uh)

| Workflow | ID |
|---|---|
| Superlikers: WhatsApp Ticket Bot (3z) | 4qFhph7LKYgFqctz |
| Superlikers: Request | iMWPZE5gVhbc4Sge |
| Vision: Read Invoice | VeL0Lewf2pIojSsm |
| Conversation: Understand | EI6Ax3aTtjVGRwAp |
| Superlikers: Retry Queue Worker | MJSCstoF7CU20JUm |

Data Tables: wa_superlikers_sessions (AsmN5sq4Pop0FVCi), wa_superlikers_retry_queue (F7RemUCjuKZT4JBL)
