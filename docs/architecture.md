# Arquitectura

## Visión de una línea

Chatbot de WhatsApp (Twilio) que registra participantes y carga tickets de la campaña Superlikers `3z` (entorno *labs*), orquestado en **n8n** como **máquina de estados determinista** con IA solo en los dos puntos donde aporta valor irremplazable.

## Por qué una FSM determinista (y no un único agente)

El control del diálogo NO lo decide un LLM. Un `Switch` sobre `currentStep` produce el mismo camino siempre — las 4 pruebas del checklist son reproducibles, la idempotencia (`ref` único en `/retail/buy`) la garantiza el código, y se evita **OWASP LLM06 (Excessive Agency)**: ningún modelo decide cuándo otorgar puntos (= dinero). El LLM aparece solo en: (1) **lectura de factura** (visión, irremplazable) y (2) **interpretación de texto libre/tono** (NLU acotado).

## Diagrama de flujo (workflow principal)

```
WhatsApp (Twilio)
  │
  ▼
[Webhook] → [📥 Log Incoming Event] → [Normalize Twilio Input] → [Respond 200]
  │            (raw payload, size-capped, ANTES de parsear)        (cierra Twilio)
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
              [Persist Session] → [Log Transaction] → [Twilio Reply]
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
| `WhatsApp Ticket Bot (3z)` | workflow | Orquestador FSM (narrador lineal legible). |
| `Retry Queue Worker` | workflow | CRON 2h: reintenta ops idempotentes fallidas por timeout/503 + Slack. |

## Persistencia

| Data Table | Rol |
|---|---|
| `wa_superlikers_sessions` | Estado FSM por celular (lookup/upsert por `phone`). `updatedAt` automático = última interacción. |
| `wa_superlikers_retry_queue` | Cola de reintentos diferidos. Solo ops idempotentes (timeout/503). Disciplina < 500 filas. |

## Decisiones clave

- **Auth**: Bearer header (NO `api_key` en el body — mala práctica verificada). Ver [ADR‑0001 implícito en environment.md].
- **Media**: se descarga el binario de Twilio (`MediaUrl0` con Basic auth) y se sube **multipart** a `/photos`. El `image_url` no sirve (la URL de Twilio expira y pide auth). Ver `decisions/0002-download-binary-vs-image-url.md`.
- **Inbound**: `Webhook` + `Respond to Webhook`, no `Twilio Trigger`. Ver `decisions/0001-webhook-vs-twilio-trigger.md`.
- **Observabilidad de ingress**: el webhook loguea el payload crudo (size-capped) ANTES de parsear — los mismatches de forma se ven al instante.
