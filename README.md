# Superlikers Telegram Ticket Bot (n8n)

Chatbot de **Telegram** que registra participantes y carga **tickets/facturas** de la campaña Superlikers `3z` (entorno *labs*), orquestado en **n8n** con lectura de factura por IA y otorgamiento automático de puntos.

> Prueba técnica **AI Automation Specialist** · Entorno de pruebas Superlikers (labs) · Campaign `3z`.
> Migrado desde una primera versión sobre WhatsApp (Twilio) → ver [`docs/migration-whatsapp-to-telegram.md`](docs/migration-whatsapp-to-telegram.md).

## TL;DR

- **Máquina de estados determinista** (no un agente suelto): reproducible, segura y barata. El LLM aparece solo donde aporta valor irremplazable: **leer la factura** (GPT‑4.1 Vision) e **interpretar texto libre** (Claude + Guardrails).
- **SOLID por sub-workflows**: un núcleo Open/Closed (`Superlikers: Request`) centraliza auth + timeout + retry + normalización de errores; ningún "Workflow Maestro".
- **Resiliencia**: retry inmediato + cola de reintentos diferidos (CRON 2h) + alertas Slack. Idempotencia por `ref` único.
- **Seguridad**: Guardrails OWASP (LLM01/05/06) depurados por dominio (PII apagado para no romper el registro), observabilidad de ingress (log del payload crudo antes de parsear).

## Arquitectura (resumen)

```
Telegram (Bot API) → Telegram Trigger → Log Ingress → Normalize (chatId, text, photo file_id)
   → Get Session (por chatId) → Resolve Context → Switch(estado)
        phone / name / email / confirm / photo
   → Persist Session → Log → Send Telegram Reply  → (Wait 5min inactividad → recordatorio)
```

La clave de sesión es el **`chat.id`** de Telegram. El **celular del participante** se pide por texto (Telegram no lo entrega) y se usa para `participants/search`. Detalle completo en [`docs/architecture.md`](docs/architecture.md).

## Workflows (n8n)

| Workflow | Rol |
|---|---|
| `Superlikers: Telegram Ticket Bot (3z)` | Orquestador FSM (principal) |
| `Superlikers: Request` | Sub-workflow Open/Closed: 1 llamada JSON con Bearer + timeout + retry + normalización de errores |
| `Vision: Read Invoice` | Sub-workflow: compress 1024 → GPT‑4.1 Vision → parseo seguro |
| `Conversation: Understand` | Sub-workflow NLU: Guardrails (OWASP) + AI Agent + Structured Output Parser (autoFix) |
| `Superlikers: Retry Queue Worker` | CRON 2h: reintenta ops idempotentes fallidas + Slack |

Exportados en [`workflows/`](workflows/). Data Tables: `wa_superlikers_sessions` (key `chatId`), `wa_superlikers_retry_queue`. Los 4 sub-workflows son **agnósticos al canal**: la migración WhatsApp→Telegram solo tocó el principal.

## Prompts

Todos los prompts (visión, NLU, 3 guardrails, plantillas de marca) están extraídos a [`prompts/`](prompts/) con frontmatter (modelo, nodo de origen, OWASP). Índice y decisiones de estructuración en [`prompts/README.md`](prompts/README.md).

## ¿Por qué cada nodo? (decisiones técnicas)

| Necesidad | Nodo elegido | Por qué (no la alternativa) |
|---|---|---|
| Recibir mensajes | `Telegram Trigger` | Gestiona el webhook y el ACK 200 solo; no hace falta `Respond to Webhook` ni validar firma como con un webhook genérico. |
| Estado conversacional | `Switch` sobre `currentStep` (FSM) | Determinista y reproducible. Un agente "suelto" decidiendo el flujo viola OWASP LLM06 y no es testeable. |
| Persistencia de sesión | `Data Table` (key `chatId`) | Estado por chat sin DB externa; `updatedAt` da la última interacción gratis. |
| Bajar la foto | `Telegram` `file/get` (`download:true`) | Resuelve `getFile` + descarga el binario en un nodo; el binario sale en `data`, listo para multipart y visión. |
| 1 foto → 2 usos | `Download → fan-out → Upload /photos + Vision → Merge` | Evita que `Upload` "pise" el binario que necesita `Vision`. Ambos leen el mismo `data`. |
| Llamadas a Superlikers | sub-workflow `Request` (Open/Closed) | Auth + timeout + retry + normalización en un solo lugar; endpoints nuevos = parámetros nuevos, cero código. |
| Leer la factura | `GPT-4.1 Vision` + `Safe Parse` | Visión irremplazable; el parseo seguro convierte cualquier no‑JSON en `legible:false` sin error silencioso. |
| Interpretar "sí/no", email, etc. | `Guardrails → Agent → Structured Output (autoFix)` | NLU acotado y blindado; la salida es un contrato, no charla. |
| Responder | `Telegram` `sendMessage` (`parse_mode:Markdown`) | Mensajes de marca con formato; `appendAttribution:false` para no ensuciar. |
| Resiliencia | `Retry Queue` (CRON 2h) + Slack | Reintenta solo ops idempotentes (timeout/503) y avisa al equipo. |

## Quickstart

1. **Importar** los `.json` de `workflows/` en tu instancia n8n.
2. **Credencial Telegram**: creá una credencial **Telegram API** con el **bot token** de @BotFather y seleccionala en los 4 nodos Telegram (`Telegram Trigger`, `Download Telegram Media`, `Send Telegram Reply`, `Send Telegram Photo Reminder`). El token vive **solo** en la credencial, nunca en el `.json` ni en git.
3. **Variables de entorno** (`BASE_URL`, `CAMPAIGN=3z`): ver [`docs/environment.md`](docs/environment.md). El `api_key` de Superlikers va en la credencial HTTP Bearer.
4. **Publicar** el workflow principal: al activarlo, Telegram registra el webhook del bot automáticamente.
5. **Validar + probar** los 4 casos del checklist ([`docs/test-cases.md`](docs/test-cases.md)) con las imágenes de [`fixtures/`](fixtures/).

## Credenciales

Los **IDs de credencial** de n8n son referencias (no secretos) y pueden vivir en los `.json`. Los **secretos** (bot token, api_key de Superlikers) nunca se commitean — viven en el sistema de credenciales de n8n. Mapa completo en [`docs/environment.md`](docs/environment.md).

## Pruebas

- **Fixtures**: [`fixtures/`](fixtures/) trae `invoice-legible.png` (factura válida, `FAC-3Z-000142`) e `invoice-illegible.png` (no‑factura → `legible:false`), más el generador reproducible.
- **Casos**: los 4 del reto (usuario nuevo, usuario existente, factura ilegible, duplicado) + edge cases, en [`docs/test-cases.md`](docs/test-cases.md).
- **Ejecuciones reales** (con IDs y salidas redactadas): [`docs/executions.md`](docs/executions.md).

## Mejoras y valor agregado

Más allá de lo solicitado, sin sobre-ingeniería:

- **Observabilidad de ingress**: log del payload crudo (size-capped) **antes** de parsear — los mismatches de forma se ven al instante.
- **Optimizador de imagen** (≈50% menos tokens de visión) preservando legibilidad.
- **Guardrails OWASP/CISCO depurados por dominio**: PII apagado donde el bot recolecta email/celular legítimamente.
- **Structured Output Parser con autoFix**: cubre *"Model output doesn't match required format"* sin errores silenciosos.
- **Cola de reintentos + CRON + Slack**: resiliencia y observabilidad ante caídas de API.
- **Descomposición SOLID**: Open/Closed en el núcleo de requests (nuevos endpoints por parámetro, cero código nuevo).
- **Idempotencia**: `ref` único evita doble otorgamiento de puntos.

## Qué mejoraría (con más tiempo)

- **Botón "Compartir contacto"** (`request_contact`) de Telegram para capturar el celular con un toque en vez de tipearlo (validando que coincida con el del registro).
- **Inline keyboards** para la confirmación (SÍ/NO como botones) en vez de texto libre → menos dependencia del NLU.
- **Log de transacciones a Google Sheets/DB** (hoy es log estructurado en consola; falta el `documentId`/`sheetName`).
- **Métricas**: tablero de conversión por estado de la FSM (cuántos abandonan en cada paso).
- **Tests automatizados en CI** disparando `execute_workflow` con pin data en cada push.
- **Multi-idioma** del NLU y plantillas según `from.language_code` de Telegram.

## Estructura del repo

```
.
├── README.md
├── env.example
├── .gitignore
├── workflows/            # .json exportados de n8n
├── prompts/              # prompts en carpetas (visión, nlu, guardrails, messages)
├── fixtures/             # imágenes de prueba + generador
└── docs/
    ├── architecture.md
    ├── environment.md
    ├── runbook.md
    ├── test-cases.md
    ├── executions.md
    ├── migration-whatsapp-to-telegram.md
    └── decisions/        # ADRs ligeros
```
