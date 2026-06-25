# Ejecuciones de prueba — Superlikers Telegram Ticket Bot (3z)

> **Workflow:** `BRG7YnCZ2GEpiO64` — "Superlikers: Telegram Ticket Bot (3z)" (51 nodos, FSM determinista)
> **Data Table de sesión:** `AsmN5sq4Pop0FVCi` (`wa_superlikers_sessions`)
> **Fecha de corrida:** 2026-06-24

## Qué son estas pruebas

Son **pruebas de SIMULACIÓN** ejecutadas con `test_workflow` + pin data del MCP de n8n. **No se publicó nada** y **no se pegó a ninguna API ni subworkflow real**.

El mecanismo de pin data fija la salida de los nodos que tocan el mundo externo, y deja correr **de verdad** todo lo demás. Concretamente:

| Se PINEA (salida simulada) | Corre DE VERDAD |
| --- | --- |
| `Telegram Trigger` (el update de entrada) | Toda la FSM: `Code` / `IF` / `Switch` |
| `Download Telegram Media` (credencial Telegram) | `Get Session` / `Persist Session` (Data Table real, aislada por `chatId` TEST*) |
| `Upload Photo` (HTTP Request) | `Merge Photo Results`, ruteo, decisiones |
| Subworkflows `executeWorkflow`: `Search Participant`, `Read Invoice (Vision)`, `Retail Buy`, `Accept Entry` | `Combine & Decide`, `Is Legible?`, `Is Ticket Duplicate?`, etc. |
| `Send Telegram Reply` (credencial Telegram) | |

> **Importante:** los nodos `executeWorkflow` **no** se auto-pinean. Para controlar las ramas sin disparar los subworkflows reales (búsqueda de participante, Vision, retail/buy, accept), se incluyeron explícitamente en la pin data con su salida canónica. Lo único que estas pruebas **no** cubren es el LLM real (Vision/NLU) y el e2e real punta a punta — eso se valida en vivo en el **Loom**.
>
> La pin data es por-ejecución y no deja indicador visual en el visor de ejecuciones de n8n.

## Resumen

| Caso | Estado esperado | executionId | Resultado |
| --- | --- | --- | --- |
| 1 — Usuario NUEVO (rama phone, no existe) | `awaiting_name`, `currentStep=3` | `1735` | **PASS** |
| 2 — Usuario EXISTENTE (salta a foto) | `awaiting_photo` | `1736` | **PASS** |
| 3 — Foto LEGIBLE → puntos | `completed`, `currentStep=9` | `1737` | **PASS** |
| 4 — Foto ILEGIBLE → pide otra (sin retail) | pide otra foto; `Retail Buy` NO corre | `1738` | **PASS** |
| 5 — DUPLICADO (sha1) | "ya fue registrado" | `1739` | **PASS** |

> Los casos 2, 4 y 5 terminan en estado `waiting` (no `success`) **a propósito**: dejan el status en `awaiting_photo`, así que la FSM entra a la rama de inactividad (`Wait 5min`) y suspende la ejecución esperando el recordatorio. La data de los nodos de assert ya es definitiva en ese punto.

---

## Caso 1 — Usuario NUEVO (rama phone, no existe)

**Input (redactado):** mensaje de texto `55••••5678` desde `chatId=TEST1`, sin fila de sesión previa.
`Search Participant` pineado con lista de participantes vacía.

**Salida — `Decide After Search`:**
```json
{
  "chatId": "TEST1",
  "phone": "55••••5678",
  "nextStep": 3,
  "distinctId": "",
  "name": "",
  "email": "",
  "replyText": "¡Hola! Para registrarte, ¿cuál es tu nombre completo?",
  "status": "awaiting_name"
}
```
**Salida — `Persist Session`:** `currentStep=3`, `status="awaiting_name"`.

**Qué prueba:** cuando el celular es válido pero no existe el participante, la FSM arranca el alta pidiendo el nombre y avanza el estado a `name` (3).

---

## Caso 2 — Usuario EXISTENTE (salta a foto)

**Input (redactado):** mensaje de texto `55••••5678` desde `chatId=TEST2`, sin fila previa.
`Search Participant` pineado con un participante encontrado (`distinct_id` redactado).

**Salida — `Decide After Search`:**
```json
{
  "chatId": "TEST2",
  "phone": "55••••5678",
  "nextStep": 6,
  "distinctId": "j••n@mail.com",
  "name": "Juan",
  "email": "j••n@mail.com",
  "replyText": "¡Te encontré! 📸 Mandame la foto de tu ticket o factura.",
  "status": "awaiting_photo"
}
```

**Qué prueba:** cuando el participante existe, la FSM se salta el alta (nombre/email/confirmación) y va directo a pedir la foto, dejando `status="awaiting_photo"` y `currentStep=6`. El `replyText` confirma el reconocimiento ("¡Te encontré!").

---

## Caso 3 — Foto LEGIBLE → puntos

**Input (redactado):** foto desde `chatId=TEST3` (fila sembrada en `awaiting_photo`, `currentStep=6`, `distinctId=t••t@mail.com`).
Pin: `Download Telegram Media` (file path), `Upload Photo` → `{id: "photo3"}` 200, `Read Invoice (Vision)` → factura legible `FAC-3Z-000142` con 2 productos, `Retail Buy` → `{points: 250}`, `Accept Entry` → ok.

**Salida — `Combine & Decide`** (verifica el fan-out + merge):
```json
{
  "sha1Taken": false,
  "activityId": "photo3",
  "legible": true,
  "ref": "FAC-3Z-000142",
  "products": [{ "ref": "A", "price": "1000", "quantity": "4" }, { "ref": "B", "price": "50000", "quantity": "2" }],
  "detected_type": "factura"
}
```
**Salida — `After Accept`:**
```json
{
  "chatId": "TEST3",
  "nextStep": 9,
  "invoiceRef": "FAC-3Z-000142",
  "photoActivityId": "photo3",
  "replyText": "🎉 ¡Listo! Ganaste 250 puntos.",
  "status": "completed"
}
```
**Salida — `Persist Session`:** `currentStep=9`, `status="completed"`.

**Qué prueba:** el camino feliz completo de la rama foto. El **fan-out** `Download → [Upload Photo, Read Invoice (Vision)]` y el `Merge` combinan correctamente (el `activityId` viene del Upload y `ref`/`products` de Vision). Con factura legible, no duplicada, retail OK y accept OK, se otorgan los 250 puntos y la sesión queda `completed` (9).

---

## Caso 4 — Foto ILEGIBLE → pide otra (sin retail)

**Input (redactado):** foto desde `chatId=TEST4` (fila sembrada `awaiting_photo`).
Pin: `Upload Photo` → `{id: "photo4"}` 200, `Read Invoice (Vision)` → `legible: false`, `detected_type: "selfie"`. **`Retail Buy` NO se pineó a propósito.**

**Salida — `Not Legible Reply`:**
```json
{
  "chatId": "TEST4",
  "nextStep": 6,
  "replyText": "Recibí un/a selfie, no un ticket 📷. Mandame una foto clara de tu factura (JPG/PNG).",
  "status": "awaiting_photo"
}
```

**Traza de nodos ejecutados (relevante):**
`… → Combine & Decide → Is Ticket Duplicate? (out 1) → Is Legible? (out 1) → Not Legible Reply → Persist Session → … → Wait 5min`

**Qué prueba:** cuando Vision marca la foto como ilegible, la FSM responde pidiendo una foto clara y **NO ejecuta la rama de monetización**. Verificado en el `runData` completo de la ejecución: **`Retail Buy` NO aparece** (tampoco `Accept Entry` ni `Route Retail Result`). El usuario sigue en `awaiting_photo`.

---

## Caso 5 — DUPLICADO (sha1)

**Input (redactado):** foto desde `chatId=TEST5` (fila sembrada `awaiting_photo`).
Pin: `Upload Photo` → `{error: "Sha1 is already taken"}` **statusCode 422**, `Read Invoice (Vision)` → factura legible `FAC-3Z-000142`.

**Salida — `Combine & Decide`** (detección de duplicado):
```json
{
  "sha1Taken": true,
  "activityId": "",
  "legible": true,
  "ref": "FAC-3Z-000142",
  "detected_type": "factura"
}
```
**Salida — `Duplicate Ticket Reply`:**
```json
{
  "chatId": "TEST5",
  "nextStep": 6,
  "replyText": "Ese ticket ya fue registrado antes ✋",
  "status": "awaiting_photo"
}
```

**Qué prueba:** aunque la factura sea legible, si el `Upload Photo` devuelve 422 con "Sha1 is already taken", `Combine & Decide` marca `sha1Taken=true` y la FSM corta antes de legibilidad/retail, avisando que el ticket ya fue registrado. El usuario queda en `awaiting_photo`.

---

## Trazabilidad

| Caso | executionId |
| --- | --- |
| 1 | `1735` |
| 2 | `1736` |
| 3 | `1737` |
| 4 | `1738` |
| 5 | `1739` |

- **workflowId:** `BRG7YnCZ2GEpiO64`
- **Data Table de sesión:** `AsmN5sq4Pop0FVCi` (`wa_superlikers_sessions`, project `ZBaqJyvdifxCV4uh`)
- Filas de sesión sembradas para la simulación: `chatId` ∈ {`TEST3`, `TEST4`, `TEST5`} (estado inicial `awaiting_photo`). Casos `TEST1` y `TEST2` se crean durante su propia corrida.

---

## Pruebas en vivo (webhook real) — bug encontrado y corregido

> A diferencia de los casos 1–5 (simulación con `test_workflow` + pin data), acá el workflow se **publicó** y se le escribieron **mensajes reales** desde Telegram. El `Telegram Trigger` recibe el update por el **webhook real** y la FSM responde sola. Esto destapó dos cosas que la simulación con pin data no podía ver: el manejo de `$env` en la instancia y la persistencia del `replyText`.

### 1. Quite de `$env` — la instancia es n8n Community self-hosted

Los workflows usaban `{{ $env.BASE_URL }}` para componer la URL de los endpoints Superlikers. En esta instancia **n8n Community self-hosted** las expresiones `$env` **no resuelven** (la variable no está expuesta al motor de expresiones), así que la URL quedaba vacía/rota y las llamadas HTTP fallaban antes de salir.

**Fix:** se reemplazó `$env.BASE_URL` por la URL **literal** `https://api.superlikerslabs.com/v1/...` en todos los workflows. Afectó:

- Subworkflow **Superlikers: Request** → nodo `Call Superlikers API`.
- Principal → nodo `Upload Photo` → `url: https://api.superlikerslabs.com/v1/photos`.

Aplicado en vivo y reflejado en los `.json` committeados. Verificado: ya no queda **ninguna** referencia `$env` en el workflow exportado.

### 2. Ejecución real `1741` — `Bad Request: message text is empty`

**Input (redactado):** el usuario mandó un `Hola` desde `chatId=7156•••85`. El update entró por el webhook real, la FSM corrió, pero el nodo **`Send Telegram Reply` falló** con:

```
Bad Request: message text is empty
```

**Causa raíz:** el `replyText` se calcula bien en los nodos `Code` de la FSM (p.ej. `Default To Phone` arma "¡Hola! Para empezar, pasame tu número…"), pero **`Persist Session` (Data Table) no tenía la columna `replyText`**. El nodo `upsert` devuelve la **fila guardada** (solo las columnas que existen en la tabla), así que al pasar de `Persist Session` → `Send Telegram Reply` el `replyText` **se perdía**: `Send Telegram Reply` leía `{{ $json.replyText }}` y recibía vacío → Telegram rechaza el `sendMessage` con texto vacío.

> Es un bug de **forma del dato post-Data Table**, invisible en la simulación: los casos 1–5 asertaban contra la salida de los nodos `Code` (donde `replyText` sí está), no contra lo que devuelve `Persist Session`.

### 3. Fix — columna `replyText` + mapeo en `Persist Session`

1. Se agregó la columna **`replyText` (string)** a la Data Table `AsmN5sq4Pop0FVCi` (`wa_superlikers_sessions`).
2. Se mapeó `replyText: {{ $json.replyText }}` en el nodo `Persist Session` (tanto en `columns.value` como en el `schema`).

Ahora `Persist Session` devuelve el `replyText` que `Send Telegram Reply` necesita río abajo.

### 4. Verificación — ejecución `1742`

Se corrió `test_workflow` (exec **`1742`**): `Persist Session` **ya devuelve `replyText`** en su salida. Confirmado el dato que faltaba.

### 5. Re-publicación y envío real del bot

Con el fix aplicado se **re-publicó** el workflow (`activeVersionId` `23bbcff0`). Se verificó **punta a punta** escribiendo un mensaje real al bot: respondió correctamente (`message_id` **6**). El bug de `message text is empty` ya no aparece.

### 6. PENDIENTE — bindear la credencial Bearer de Superlikers

Los endpoints reales de Superlikers (search / register / photos / buy / accept) siguen devolviendo error hasta que se **seleccione a mano** la credencial Bearer `[SL]: Jafet` (`SXkzMC9XmTKtBrB5`, `httpBearerAuth`) en el nodo `Call Superlikers API` del subworkflow **Request**. No es un bug: es una **limitación del MCP de n8n**, que no puede bindear auth genérica de HTTP — el método ya queda preconfigurado (`genericCredentialType` + `httpBearerAuth`), solo falta el clic en la UI. La FSM tolera ese error sin romperse (las ramas manejan el fallo de la API). Ver `docs/environment.md` → "n8n Community: sin `$env`".

### Trazabilidad — pruebas en vivo

| Evento | Referencia |
| --- | --- |
| Ejecución del bug (webhook real, `Hola`) | exec `1741` |
| Ejecución de verificación del fix | exec `1742` |
| `activeVersionId` tras re-publicar | `23bbcff0` |
| Mensaje real de respuesta del bot | `message_id` `6` |
| Columna agregada | `replyText` (string) en `AsmN5sq4Pop0FVCi` |
