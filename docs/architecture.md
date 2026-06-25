# Arquitectura

## Visión de una línea

Chatbot de Telegram (Bot API) que registra participantes y carga tickets de la campaña Superlikers `3z` (entorno *labs*), orquestado en **n8n** como **máquina de estados determinista** con IA solo en los dos puntos donde aporta valor irremplazable.

## Por qué una FSM determinista (y no un único agente)

El control del diálogo NO lo decide un LLM. Un `Switch` sobre `currentStep` produce el mismo camino siempre — las 4 pruebas del checklist son reproducibles, la idempotencia (`ref` único en `/retail/buy`) la garantiza el código, y se evita **OWASP LLM06 (Excessive Agency)**: ningún modelo decide cuándo otorgar puntos (= dinero). El LLM aparece solo en: (1) **lectura de factura** (visión, irremplazable) y (2) **interpretación de texto libre/tono** (NLU acotado).

## Diagrama de flujo (workflow principal)

```
Telegram (Bot API)
  │
  ▼
[Telegram Trigger] → [📥 Log Incoming Event] → [Normalize Telegram Input]
  │  (gestiona webhook        (raw payload, size-capped,      (chat.id, text||caption,
  │   + ACK 200 solo)          ANTES de parsear)               photo[último].file_id)
  ▼
[Get Session] → [Resolve Context] → [Route by State]  ← FSM (Switch)
                                          │
   ┌──────────────┬──────────────┬────────┴───────┬──────────────┐
 phone          name           email          confirm          photo
  │              │               │               │                │
 search        capturar        validar        SÍ → registrar    download → /photos
 participante   nombre          email          NO → reiniciar    → Vision → /retail/buy
  │                                                              → /entries/accept
  └──────────────┴───────────────┴───────────────┴──────────────┘
                                          │
                                          ▼
              [Persist Session] → [Log Transaction] → [Send Telegram Reply]
                                                          │
                                          (status awaiting_photo) → [Wait 5min] → recordatorio
```

## Estados de la FSM (`currentStep` en la Data Table de sesión)

| Estado | currentStep | Qué espera | Acción al recibir |
|---|---|---|---|
| `phone` | 1 | celular | valida → `participants/search` → existe (→photo) / no (→name) |
| `name` | 3 | nombre | captura → pide email |
| `email` | 4 | email | valida → muestra resumen → pide confirmación |
| `confirm` | 5 | SÍ/NO | NLU → SÍ: `participants` (registra) → pide foto · NO: reinicia |
| `photo` | 6 | foto | descarga media → `photos` → Vision → `retail/buy` → `entries/accept` |
| `done` | 9 | — | completado (permite subir otro ticket) |

## Componentes (SOLID)

| Componente | Tipo | Responsabilidad única |
|---|---|---|
| `Superlikers: Request` | sub-workflow | **Open/Closed**: 1 llamada JSON a la API con Bearer + timeout + retry + onError + **normalización de errores**. Nuevos endpoints = nuevos parámetros, cero código nuevo. |
| `Vision: Read Invoice` | sub-workflow | Único punto LLM de visión: compress 1024 → GPT‑4.1 → parseo seguro. Reemplazable (OpenAI↔Gemini) sin tocar al caller. |
| `Conversation: Understand` | sub-workflow | NLU acotado: Guardrails (OWASP) + AI Agent + Structured Output Parser (autoFix). |
| `Telegram Ticket Bot (3z)` | workflow | Orquestador FSM (narrador lineal legible). |
| `Retry Queue Worker` | workflow | CRON 2h: reintenta ops idempotentes fallidas por timeout/503 + Slack. |

## Persistencia

| Data Table | Rol |
|---|---|
| `wa_superlikers_sessions` | Estado FSM por chat de Telegram (lookup/upsert por `chatId`). La columna `phone` se conserva como **dato de negocio**: el celular que el usuario tipea (`participants/search`). `updatedAt` automático = última interacción. |
| `wa_superlikers_retry_queue` | Cola de reintentos diferidos. Solo ops idempotentes (timeout/503). Disciplina < 500 filas. |

## Decisiones clave

- **Auth**: Bearer header a Superlikers (NO `api_key` en el body — mala práctica verificada). El acceso a la Bot API de Telegram va con la credencial `telegramApi` (bot token). Ver [ADR‑0001 implícito en environment.md].
- **Media**: se resuelve el `file_id` con `getFile` y se descarga el binario vía `Download Telegram Media` (`telegram` `file/get`, `download:true`), luego se sube **multipart** a `/photos`. Sigue siendo descarga de binario (no `image_url`): el archivo de Telegram no es una URL pública persistente y el mismo binario alimenta a `Vision`. Ver `decisions/0002-download-binary-vs-image-url.md`.
- **Inbound**: `Telegram Trigger` nativo (gestiona webhook + ACK 200), no un `Webhook` genérico + `Respond to Webhook`. Ver `decisions/0001-webhook-vs-twilio-trigger.md`.
- **Observabilidad de ingress**: el trigger loguea el payload crudo (size-capped) ANTES de parsear — los mismatches de forma se ven al instante.
