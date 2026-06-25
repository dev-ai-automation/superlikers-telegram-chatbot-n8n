# Guion del video Loom (3–5 min)

Demo en vivo del chatbot Telegram corriendo, con los 4 casos reales del reto. Pensado para grabarse en una sola toma. Tené abiertos en pestañas: (1) el chat de Telegram con el bot, (2) el editor del workflow `Superlikers: Telegram Ticket Bot (3z)` en n8n (vista de ejecuciones), (3) la Data Table `wa_superlikers_sessions`.

## Pre-grabación (una vez)

1. Crear la credencial **Telegram API** en n8n con el bot token y seleccionarla en los 4 nodos Telegram.
2. Seleccionar la credencial Bearer `[SL]: Jafet` en los nodos HTTP de Superlikers (Request + Upload).
3. **Publicar** el workflow principal (registra el webhook de Telegram).
4. Tener listas las 2 imágenes de `fixtures/`: `invoice-legible.png` y `invoice-illegible.png`.
5. Iniciar una conversación con el bot (mandarle `/start` o "hola") desde tu cuenta.

## Estructura (≈4 min)

**0:00–0:30 — Intro + arquitectura (sticky en n8n)**
- "Es un chatbot de Telegram en n8n para la campaña Superlikers 3z: registra al participante, sube la foto del ticket, lee la factura con IA y otorga puntos."
- Mostrá el canvas: "Es una **máquina de estados determinista**. La IA aparece solo en dos puntos: leer la factura (GPT‑4.1 Vision) e interpretar texto libre (Claude + Guardrails). El flujo y la idempotencia los garantiza el código."

**0:30–1:45 — Caso 1: usuario NUEVO (flujo completo)**
- En Telegram: mandá un celular (10 dígitos) → el bot busca y no existe → pide nombre → mandás nombre → pide email → mandás email → muestra resumen y pide confirmación → respondés "sí".
- "Quedaste registrado, mandame la foto." → enviás `invoice-legible.png`.
- El bot responde **"🎉 ¡Listo! Ganaste N puntos."**
- Cambiá a n8n: mostrá la ejecución en verde, el **fan-out** Download → Upload/Vision → Merge encendido. Mostrá la fila en `wa_superlikers_sessions` con `status: completed`, `currentStep: 9`.

**1:45–2:30 — Caso 2: usuario EXISTENTE (salta a foto)**
- Con un celular ya registrado, el bot responde directo **"¡Te encontré! 📸 Mandame la foto..."** sin volver a pedir nombre/email.
- Enviás la factura → puntos. Resaltá: "saltó el registro porque ya existía — búsqueda previa por celular, sin duplicar."

**2:30–3:15 — Caso 3: factura ILEGIBLE**
- Enviás `invoice-illegible.png` (un selfie).
- El bot responde **"Recibí un/a selfie, no un ticket 📷. Mandame una foto clara..."**
- En n8n mostrá que **`/retail/buy` NO se llamó** (la rama `Is Legible?` cortó). "La IA marcó `legible:false` y el código no otorgó puntos."

**3:15–3:50 — Caso 4: DUPLICADO**
- Reenviás la misma `invoice-legible.png` ya cargada → **"Ese ticket ya fue registrado antes ✋"** (sha1) y/o, si reintentás la compra, **"Esa compra ya generó puntos ✋"** (ref).
- "Idempotencia por `ref` único: reenviar no duplica puntos."

**3:50–4:30 — Cierre: entregables**
- Mostrá la carpeta `prompts/` (abrí el prompt de visión y el guardrail de jailbreak).
- Mostrá `docs/executions.md` con los IDs de ejecución reales.
- Cerrá con "qué mejoraría": botón de compartir contacto, inline keyboards para confirmación, log a Sheets, métricas por estado.

## Tips
- Hablá sobre lo que se ve; no leas el guion palabra por palabra.
- Si una llamada a la API tarda, aprovechá para narrar la arquitectura.
- Mostrá siempre el **par**: mensaje en Telegram ↔ ejecución en n8n.
