# Guion del video Loom — calibrado a 80–100 ppm

> **Ritmo objetivo: ~90 palabras por minuto** (rango 80–100). A ese paso, este guion dura **≈ 5:30** (≈ 6:10 a 80 ppm, ≈ 4:55 a 100 ppm). Cada bloque indica su **conteo de palabras** y su **duración objetivo a 90 ppm**. Está pensado para leerse **en voz neutra** (tú, sin voseo), pausado y claro, en una sola toma.
>
> **Cómo practicar el ritmo:** cronometra un bloque. Si terminás antes del tiempo objetivo, vas rápido (>100 ppm): respirá en cada `[pausa]`. Si te pasás, vas lento (<80 ppm): acortá las pausas. La regla simple: **~3 palabras cada 2 segundos**.

## Pre-grabación (una sola vez)

1. Credencial **Telegram API** creada y seleccionada en los 4 nodos Telegram (ya quedó auto-asignada `[SL]: Jafet`).
2. Credencial **Bearer `[SL]: Jafet`** seleccionada en `Upload Photo` (principal) y `Call Superlikers API` (Request).
3. **Publicar** el workflow principal (`b3xPAom7g5D4fNJW`) para registrar el webhook.
4. **Confirmar un valor de `tags` válido** de la campaña `3z` y dejarlo cableado en `Register Participant` — **sin esto el alta da 422 y la foto no otorga puntos**.
5. Pestañas abiertas: (1) chat de Telegram con el bot, (2) editor del workflow en n8n con la vista de **ejecuciones**, (3) Data Table `wa_superlikers_sessions`.
6. Fixtures listas: `fixtures/invoice-legible.png` y `fixtures/invoice-illegible.png`.

---

## Guion hablado (lee el texto en negrita; lo de `[corchetes]` es la acción en pantalla)

### Bloque 1 · Intro + arquitectura — 0:00 → 0:40 (≈ 60 palabras)

`[mostrar el canvas del workflow en n8n]`

**Hola. Te presento el chatbot de Telegram que construí en n8n para la campaña Superlikers 3z. El bot identifica al participante, recibe la foto del ticket, lee la factura con inteligencia artificial y otorga los puntos. `[pausa]` El diseño es una máquina de estados determinista: la inteligencia artificial actúa solo en dos puntos, y el control del flujo lo lleva el código, no el modelo.**

### Bloque 2 · Caso 1, usuario nuevo — 0:40 → 2:00 (≈ 120 palabras)

`[ir a Telegram]`

**Empecemos con un usuario nuevo. Le envío mi número de celular. `[enviar celular]` El bot consulta a Superlikers, confirma que no existo, y me pide el nombre. `[enviar nombre]` Le paso mi nombre; ahora me pide el correo. `[enviar email]` Escribo el correo y, antes de registrar, el bot me muestra un resumen y me pide confirmar. Respondo que sí. `[pausa]` El bot me da la bienvenida y me pide la foto del ticket. Le envío una factura clara. `[enviar invoice-legible.png]`**

`[cambiar a n8n, abrir la ejecución]`

**En n8n vemos la ejecución completa. La imagen se descarga una sola vez y alimenta en paralelo a la subida y a la lectura con visión. El modelo lee la factura correctamente: número y productos. El bot confirma los puntos.**

### Bloque 3 · Caso 2, usuario existente — 2:00 → 2:45 (≈ 65 palabras)

`[volver a Telegram]`

**Segundo caso: un participante que ya existe. Envío un celular ya registrado. `[enviar celular]` Esta vez el bot no me pide nombre ni correo: me reconoce y va directo a la foto. `[pausa]` Esto es por la búsqueda previa por celular, que evita registros duplicados. Envío la factura y otorga los puntos igual que antes.**

### Bloque 4 · Caso 3, factura ilegible — 2:45 → 3:30 (≈ 65 palabras)

`[enviar invoice-illegible.png]`

**Tercer caso: una imagen que no es una factura. Envío una selfie. `[pausa]` La inteligencia artificial la marca como ilegible, y el bot me pide una foto clara. `[mostrar en n8n]` Acá lo importante: la rama de monetización no se ejecuta. El nodo de compra nunca se llama, así que no se otorgan puntos por una imagen inválida.**

### Bloque 5 · Caso 4, duplicado — 3:30 → 4:10 (≈ 55 palabras)

`[reenviar la misma invoice-legible.png]`

**Cuarto caso: el duplicado. Reenvío la misma factura que ya cargué. `[pausa]` El bot responde que ese ticket ya fue registrado antes. La idempotencia se garantiza con el número de factura único: reenviar la misma compra nunca duplica los puntos. Esto lo resuelve el código, no el modelo.**

### Bloque 6 · Cómo se estructuraron los prompts — 4:10 → 4:55 (≈ 70 palabras)

`[abrir la carpeta prompts/]`

**Una palabra sobre la inteligencia artificial. La salida de marca es determinista: los mensajes son fijos, en español neutro, con cero alucinación. El modelo solo se usa para leer la factura, con un prompt que obliga a responder en JSON, y para interpretar texto libre, con guardrails contra prompt injection y temas fuera de alcance. Cada prompt está versionado en la carpeta prompts.**

### Bloque 7 · Cierre: robustez y mejoras — 4:55 → 5:40 (≈ 75 palabras)

`[mostrar docs/executions.md]`

**Para cerrar: cada paso valida y maneja sus errores. Si el alta falla, el bot lo deja en revisión en vez de prometer un registro que no ocurrió. Hay log de cada transacción, recordatorio por inactividad y una cola de reintentos para fallos de la API. `[pausa]` Como mejoras futuras: botón para compartir contacto, teclados en línea para confirmar, y métricas por estado. Eso es todo. Gracias por ver.**

---

## Resumen de tiempos (a 90 ppm)

| Bloque | Palabras | Fin objetivo |
|---|---|---|
| 1 · Intro + arquitectura | ~60 | 0:40 |
| 2 · Caso 1 (nuevo) | ~120 | 2:00 |
| 3 · Caso 2 (existente) | ~65 | 2:45 |
| 4 · Caso 3 (ilegible) | ~65 | 3:30 |
| 5 · Caso 4 (duplicado) | ~55 | 4:10 |
| 6 · Prompts / IA | ~70 | 4:55 |
| 7 · Cierre + mejoras | ~75 | 5:40 |
| **Total** | **~510** | **≈ 5:30** |

## Tips de entrega

- **No leas de corrido**: apoyate en lo que se ve en pantalla y usá el guion como red.
- Mostrá siempre el **par**: el mensaje en Telegram junto a la ejecución en n8n.
- Si una llamada a la API tarda, aprovechá la pausa para narrar la arquitectura.
- Si el `tags` de la campaña aún no está configurado, en el Bloque 2 narrá que **la factura se lee correctamente** y que el único paso pendiente es habilitar el `tag` de la campaña en el panel; el resto del flujo se demuestra igual.
