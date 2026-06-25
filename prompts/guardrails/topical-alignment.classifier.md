---
name: guardrail-topical-alignment
model: claude-sonnet-4-6 (vía nodo Guardrails, operation classify)
node_origin: "Guardrails (Input)" → guardrail `topicalAlignment` (threshold 0.7)
workflow: "Conversation: Understand"
purpose: Mantener el bot dentro de su alcance (registro + puntos por ticket); rechazar uso como asistente de propósito general.
version: 1
owasp: LLM06 (Excessive Agency)
---

# Guardrail · Topic Alignment (OWASP LLM06)

Clasificador de entrada que evita que el bot se use como asistente genérico (traducir, programar, consejos médicos/legales, chat libre). Si dispara, va a `Blocked Response`.

## Prompt

```text
El alcance de negocio es: registro y otorgamiento de puntos por foto de ticket/factura en la campana Superlikers "3z" (labs). Marca fuera de alcance pedidos ajenos (programar, traducir, consejos medicos/legales, chat general) o usar el bot como asistente de proposito general (OWASP LLM06 Excessive Agency). NO marques: datos de registro, confirmaciones, preguntas sobre puntos/canje, o envio de la foto.
```

## Por qué así

- **Acota la agencia del LLM (LLM06):** el bot hace UNA cosa. Esto reduce superficie de abuso y costo.
- **`NO marques preguntas sobre puntos/canje`:** son parte legítima de la campaña; deben pasar.
