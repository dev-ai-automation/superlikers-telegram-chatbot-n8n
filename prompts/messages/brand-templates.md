---
name: brand-message-templates
model: — (texto determinista, NO LLM)
node_origin: nodos Code de la FSM (replyText)
workflow: "Superlikers: Telegram Ticket Bot (3z)"
purpose: Mensajes de marca fijos que la FSM envía por Telegram en cada estado/transición.
version: 1
owasp: —
---

# Plantillas de marca (deterministas)

Estos mensajes **no** los genera un LLM: son strings fijos en los nodos Code de la máquina de estados. Garantizan tono consistente, cero alucinación y costo cero. Forman parte de "cómo se estructuraron los prompts": el LLM solo interpreta entrada; **la voz de marca de salida es determinista** (salvo `reply_text` del NLU, que es el fallback conversacional).

Se envían con `parse_mode: Markdown` (de ahí el `*foto*` en negrita).

| Estado / evento | Nodo | Mensaje |
|---|---|---|
| Bienvenida / pedir celular | `Default To Phone` | `¡Hola! Para empezar, pasame tu número de celular (10 dígitos) 📱` |
| Reintento celular | `Ask Phone Again` | `Pasame tu número de celular (solo números, 10 dígitos) 📱` |
| Participante encontrado → foto | `Decide After Search` | `¡Te encontré! 📸 Mandame la foto de tu ticket o factura.` |
| Nuevo → pedir nombre | `Decide After Search` | `¡Hola! Para registrarte, ¿cuál es tu nombre completo?` |
| Nombre OK → pedir email | `Capture Name` | `¡Gracias! Ahora tu correo electrónico ✉️` |
| Nombre vacío → reintento | `Capture Name` | `No te entendí. ¿Cuál es tu nombre completo?` |
| Resumen + confirmación | `Save Email & Summary` | `Confirmemos: Nombre {name}, Cel {phone}, Correo {email}. ¿Es correcto? Respondé SÍ para continuar.` |
| Email inválido → reintento | `Ask Email Again` | `Ese correo no parece válido. Mandámelo de nuevo ✉️` |
| Registrado → pedir foto | `After Register` | `¡Listo, quedaste registrado! 📸 Mandame la foto de tu ticket.` |
| Confirmación = NO → reinicia | `Cancel Confirm` | `Sin problema, empecemos de nuevo. ¿Tu nombre?` |
| Confirmación ambigua → reintento | `Retry Confirm` | `No te entendí. Respondé SÍ para confirmar o NO para corregir.` (o `reply_text` del NLU) |
| Falló la descarga de la foto | `Download Failed` | `No pude descargar tu foto, reintentá 📷` |
| Se esperaba foto, llegó texto | `Remind Photo` | `Necesito la *foto* de tu ticket 📸 (no texto).` |
| Ticket duplicado (sha1) | `Duplicate Ticket Reply` | `Ese ticket ya fue registrado antes ✋` |
| Compra duplicada (ref) | `Ref Duplicate Reply` | `Esa compra ya generó puntos ✋` |
| Error registrando compra | `Retail Failed Reply` | `Hubo un problema registrando tu compra, intentá más tarde` |
| No es factura legible | `Not Legible Reply` | `Recibí un/a {detected_type}, no un ticket 📷. Mandame una foto clara de tu factura (JPG/PNG).` |
| Éxito + puntos | `After Accept` | `🎉 ¡Listo! Ganaste {points} puntos.` |
| Aceptación falló → revisión manual | `After Accept` | `Tu ticket quedó en revisión manual 🕒` |
| Recordatorio por inactividad (5 min) | `Send Telegram Photo Reminder` | `¿Seguís ahí? Mandame la foto de tu ticket cuando puedas 📸` |
| Entrada bloqueada por guardrails | `Blocked Response` (NLU) | `Disculpa, eso no puedo ayudarte. Estoy aca para registrar tu ticket y sumarte puntos. Mandame tu numero de celular o la foto de tu factura.` |

## Por qué deterministas

- **Tono consistente y cero alucinación** en los mensajes de marca.
- **Costo cero** (no hay llamada a LLM para responder).
- **Reproducibilidad** de los 4 casos de prueba del reto: el mismo input produce el mismo mensaje siempre.
