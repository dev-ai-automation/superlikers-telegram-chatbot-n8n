---
name: guardrail-nsfw
model: claude-sonnet-4-6 (vía nodo Guardrails, operation classify)
node_origin: "Guardrails (Input)" → guardrail `nsfw` (threshold 0.7, customizePrompt)
workflow: "Conversation: Understand"
purpose: Bloquear contenido sexual explícito, violento o de odio que dañe la marca de la campaña.
version: 1
owasp: LLM05 (Improper Output Handling / brand safety)
---

# Guardrail · NSFW (OWASP LLM05)

Clasificador de entrada. Protege la marca de una campaña de fidelización. Si dispara, va a `Blocked Response`.

## Prompt

```text
Clasifica si el texto solicita o describe contenido sexual explicito, violento o de odio que dane la marca de una campana de fidelizacion (OWASP LLM05). NO marques lenguaje coloquial, quejas o frustracion del usuario.
```

## Por qué así

- **Brand safety:** una campaña de marca no puede responder a contenido tóxico.
- **`NO marques quejas/frustracion`:** un usuario molesto ("esto no funciona!!") NO es NSFW; bloquearlo sería pésima UX.
