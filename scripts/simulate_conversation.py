#!/usr/bin/env python3
"""
simulate_conversation.py — simula que el usuario (chat 715690785) le escribe al bot de
Superlikers (Telegram) y cubre los casos del checklist del reto, en DOS modos:

  --mode pindata   (por defecto)  imprime el/los `update` de Telegram listos para pinear
                                   el nodo "Telegram Trigger" en `test_workflow` (MCP) o
                                   en la UI de n8n. NO toca la red ni publica nada.

  --mode webhook --url <URL>       POSTea cada `update` al webhook de PRODUCCIÓN del
                                   workflow publicado. El `Telegram Trigger` lo recibe
                                   como si Telegram lo hubiera entregado y la FSM responde
                                   sola: el bot te contesta en tu Telegram real (715690785).

El chat id por defecto es **715690785** (el chat real del tester). Cambialo con --chat-id.

El BOT TOKEN nunca se usa acá: el modo webhook NO necesita token (POSTea directo al webhook
de n8n). Para conseguir un `file_id` REAL del paso foto (modo webhook), enviá la fixture con
el helper y copiá el id:

    python telegram_helper.py fileid 715690785 ../fixtures/invoice-legible.png
    python simulate_conversation.py --mode webhook --url <URL> --case photo_legible \
        --file-id "<file_id real>"

Casos disponibles (--case, o "all" = conversación nueva completa, en orden):
  phone        celular nuevo            -> rama phone (busca participante)
  name         "Jafet Escobar"          -> rama name  (guarda nombre, pide email)
  email        email                    -> rama email (valida, pide confirmación)
  confirm      "Sí"                     -> rama confirm (registra, pide foto)
  photo_legible   foto (fixture legible)   -> rama photo legible  -> puntos
  photo_illegible foto (fixture selfie)    -> rama photo ilegible -> pide otra
  photo_duplicate foto (sha1 duplicado)    -> rama photo duplicado

Uso típico (simulación, sin publicar):
    python simulate_conversation.py                      # imprime los updates del flujo nuevo
    python simulate_conversation.py --case photo_legible # imprime un update de foto

Uso e2e en vivo (workflow publicado + credenciales bindeadas):
    python simulate_conversation.py --mode webhook --url \
        "https://n8n.srv1499692.hstgr.cloud/webhook/<webhookId>/webhook"
"""
import argparse
import json
import sys
import urllib.request
import urllib.error

DEFAULT_CHAT_ID = "715690785"
FALLBACK_FILE_ID = "AgACAgEAAxkBAAExSIMULATED-file_id-de-prueba"  # placeholder para pindata

# Orden de la conversación de un usuario NUEVO (las pruebas 1 y 4 del reto).
CONVERSATION = ["phone", "name", "email", "confirm", "photo_legible"]


def _base_message(chat_id, message_id, date, text=None, photo_file_id=None, caption=None):
    """Arma un objeto message de Telegram (texto o foto)."""
    msg = {
        "message_id": message_id,
        "from": {
            "id": int(chat_id),
            "is_bot": False,
            "first_name": "Jafet",
            "last_name": "Escobar",
            "language_code": "es",
        },
        "chat": {
            "id": int(chat_id),
            "first_name": "Jafet",
            "last_name": "Escobar",
            "type": "private",
        },
        "date": date,
    }
    if photo_file_id is not None:
        # Telegram entrega varias resoluciones; la FSM toma la última (mayor).
        msg["photo"] = [
            {"file_id": photo_file_id + "_s", "file_unique_id": "u_s", "width": 90, "height": 67, "file_size": 1380},
            {"file_id": photo_file_id, "file_unique_id": "u_l", "width": 1024, "height": 768, "file_size": 92160},
        ]
        if caption is not None:
            msg["caption"] = caption
    else:
        msg["text"] = text
    return msg


def build_update(chat_id, update_id, message_id, date, text=None, photo_file_id=None, caption=None):
    """Arma un `update` de Telegram (lo que el Telegram Trigger recibe del webhook)."""
    return {
        "update_id": update_id,
        "message": _base_message(chat_id, message_id, date, text=text, photo_file_id=photo_file_id, caption=caption),
    }


def case_update(case, chat_id, file_id, update_id, message_id, date):
    """Devuelve (descripcion, update) para un caso del checklist."""
    if case == "phone":
        return ("Celular nuevo (rama phone)",
                build_update(chat_id, update_id, message_id, date, text="5512345678"))
    if case == "name":
        return ("Nombre (rama name)",
                build_update(chat_id, update_id, message_id, date, text="Jafet Escobar"))
    if case == "email":
        return ("Email (rama email)",
                build_update(chat_id, update_id, message_id, date, text="dev.automation@arthromed.com.mx"))
    if case == "confirm":
        return ("Confirmacion SI (rama confirm)",
                build_update(chat_id, update_id, message_id, date, text="Sí"))
    if case == "photo_legible":
        return ("Foto LEGIBLE (rama photo -> puntos)",
                build_update(chat_id, update_id, message_id, date, photo_file_id=file_id, caption=""))
    if case == "photo_illegible":
        return ("Foto ILEGIBLE/selfie (rama photo -> pide otra)",
                build_update(chat_id, update_id, message_id, date, photo_file_id=file_id + "_selfie", caption=""))
    if case == "photo_duplicate":
        return ("Foto DUPLICADA (sha1 ya registrado)",
                build_update(chat_id, update_id, message_id, date, photo_file_id=file_id + "_dup", caption=""))
    sys.exit("ERROR: caso desconocido '%s'" % case)


def emit_pindata(case, chat_id, update):
    """Imprime el bloque pinData para pegar en `test_workflow` / nodo Telegram Trigger."""
    pin = {"Telegram Trigger": [{"json": update}]}
    print("# Caso: %s  | chatId=%s" % (case, chat_id))
    print(json.dumps(pin, ensure_ascii=False, indent=2))
    print()


def post_webhook(url, update):
    data = json.dumps(update).encode("utf-8")
    req = urllib.request.Request(url, data=data)
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode("utf-8", "replace")
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:  # noqa: BLE001
        return 0, str(e)


def main():
    ap = argparse.ArgumentParser(description="Simula mensajes del chat 715690785 al bot de Superlikers (Telegram).")
    ap.add_argument("--mode", choices=["pindata", "webhook"], default="pindata")
    ap.add_argument("--url", help="URL del webhook de produccion (modo webhook).")
    ap.add_argument("--chat-id", default=DEFAULT_CHAT_ID)
    ap.add_argument("--case", default="all",
                    help="Caso a simular o 'all' (conversacion nueva completa). "
                         "Opciones: phone,name,email,confirm,photo_legible,photo_illegible,photo_duplicate,all")
    ap.add_argument("--file-id", default=FALLBACK_FILE_ID,
                    help="file_id real de la foto (modo webhook). Obtenelo con telegram_helper.py fileid.")
    ap.add_argument("--update-id", type=int, default=900000001, help="update_id inicial (se incrementa).")
    ap.add_argument("--date", type=int, default=1750000000, help="epoch del mensaje (se incrementa por caso).")
    args = ap.parse_args()

    if args.mode == "webhook" and not args.url:
        sys.exit("ERROR: --mode webhook requiere --url <webhook de produccion>")

    cases = CONVERSATION if args.case == "all" else [args.case]

    for i, case in enumerate(cases):
        desc, update = case_update(case, args.chat_id, args.file_id,
                                   args.update_id + i, 1000 + i, args.date + i)
        if args.mode == "pindata":
            emit_pindata("%s — %s" % (case, desc), args.chat_id, update)
        else:
            status, body = post_webhook(args.url, update)
            print("[%s] %s -> HTTP %s" % (case, desc, status))
            if body:
                print("    %s" % body[:500])


if __name__ == "__main__":
    main()
