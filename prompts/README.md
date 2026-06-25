# Prompts

Todos los prompts del chatbot, extraídos de los nodos n8n a archivos versionables. Cada archivo tiene frontmatter con el modelo, el nodo de origen, el workflow y el control OWASP que aplica.

> **Filosofía de diseño.** La conversación NO la decide un LLM: es una **máquina de estados determinista** (FSM). El modelo aparece solo en dos puntos donde aporta valor irremplazable —**leer la factura** (visión) e **interpretar texto libre** (NLU acotado)— y siempre detrás de **guardrails** y de un **parseo seguro**. Por eso hay tres familias de prompts: *visión*, *NLU* y *guardrails*; más las *plantillas deterministas* de marca (que NO son LLM, son texto fijo de la FSM, pero forman parte de "cómo se estructuraron los prompts").

## Índice

| Prompt | Archivo | Modelo | Nodo de origen | Workflow | OWASP |
|---|---|---|---|---|---|
| Lectura de factura (visión) | [`vision/read-invoice.system.md`](vision/read-invoice.system.md) | GPT‑4.1 (vision) | `GPT-4.1 Vision Analyze` | `Vision: Read Invoice` | — |
| Interpretación NLU | [`nlu/interpret-message.system.md`](nlu/interpret-message.system.md) | Claude Sonnet 4.6 | `Interpret Message` (agent) | `Conversation: Understand` | LLM06 (límite de agencia) |
| Guardrail · Jailbreak | [`guardrails/jailbreak.classifier.md`](guardrails/jailbreak.classifier.md) | Claude Sonnet 4.6 | `Guardrails (Input)` | `Conversation: Understand` | **LLM01** / LLM07 |
| Guardrail · NSFW | [`guardrails/nsfw.classifier.md`](guardrails/nsfw.classifier.md) | Claude Sonnet 4.6 | `Guardrails (Input)` | `Conversation: Understand` | **LLM05** |
| Guardrail · Topic Alignment | [`guardrails/topical-alignment.classifier.md`](guardrails/topical-alignment.classifier.md) | Claude Sonnet 4.6 | `Guardrails (Input)` | `Conversation: Understand` | **LLM06** |
| Plantillas de marca (deterministas) | [`messages/brand-templates.md`](messages/brand-templates.md) | — (texto fijo FSM) | nodos Code del principal | `Superlikers: Telegram Ticket Bot (3z)` | — |

> Además, el nodo `Guardrails (Input)` activa el guardrail nativo **`secretKeys`** (`permissiveness: balanced`) para no dejar pasar claves/secretos en la entrada del usuario. No tiene prompt custom (es heurística del nodo), por eso no figura como archivo.

## Decisiones de estructuración de prompts

- **Salida estructurada obligatoria.** Visión devuelve **solo JSON** (sin markdown, sin fences) y la NLU usa un **Structured Output Parser con `autoFix`**. Ningún prompt "conversa": cada uno responde un contrato. Esto evita el error *"Model output doesn't match required format"* y permite parseo seguro (`Safe Parse Invoice`, `Flatten Output`).
- **Guardrails depurados por dominio.** Se activan `jailbreak`, `nsfw`, `topicalAlignment` y `secretKeys`. **PII se apagó a propósito**: el bot recolecta email y celular legítimamente, así que un guardrail de PII rompería el registro. Esa decisión está documentada en cada archivo.
- **Idempotencia y dinero fuera del LLM.** El otorgamiento de puntos lo decide el código (FSM + `ref` único en `/retail/buy`), nunca el modelo → evita **OWASP LLM06 (Excessive Agency)**.
- **Reemplazabilidad.** El prompt de visión vive aislado en su subworkflow: cambiar GPT‑4.1 por otro modelo no toca al resto del flujo.
- **Versionado.** Cada archivo trae `version`. Cambiar un prompt = bump de versión + nota del porqué.
