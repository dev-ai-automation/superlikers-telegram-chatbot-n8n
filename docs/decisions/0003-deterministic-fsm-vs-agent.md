# ADR 0003 — FSM determinista + LLM puntual (no agente conversacional)

**Estado:** aceptada

## Contexto
El diálogo del reto tiene 8 pasos ordenados con ramificación. Podría modelarse como un único AI Agent conversacional con herramientas, o como una máquina de estados determinista con LLM solo en los puntos difusos.

## Decisión
**FSM determinista** (`Switch` sobre `currentStep` leído de una Data Table de sesión) + LLM **solo** en 2 puntos: (1) lectura de factura por visión y (2) interpretación de texto libre (`Conversation: Understand`).

## Razón
| Dimensión | Determinista + LLM puntual | Agente conversacional |
|---|---|---|
| Control de `/retail/buy` (= dinero) | Total, por código | El modelo podría otorgar puntos por inferencia errónea (**LLM06**) |
| Reproducibilidad de las 4 pruebas | Garantizada | El agente puede reordenar/saltar pasos |
| Costo / latencia | Bajo (LLM en 2 nodos) | Alto (1 llamada por turno) |
| Superficie de prompt injection | Mínima | Amplia (el agente tiene tools) |
| Mantenibilidad | Narrador lineal + sub-workflows | Riesgo de "Workflow Maestro" |

Para una campaña donde el LLM podría disparar acciones con valor monetario, la "naturalidad" del diálogo no justifica el riesgo de **Excessive Agency**.

## Consecuencias
- El estado vive en `wa_superlikers_sessions` (n8n es stateless entre webhooks).
- El tono de marca se mantiene con persona fija + plantillas, no con un LLM por mensaje.
