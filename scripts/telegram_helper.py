#!/usr/bin/env python3
"""
telegram_helper.py — utilidades auxiliares para probar el bot de Superlikers (Telegram) en vivo.

El BOT TOKEN nunca se hardcodea: se lee de la variable de entorno TELEGRAM_BOT_TOKEN
(o de un archivo con --token-file). El archivo env-telegram.env NO se commitea (gitignore).

Uso:
  export TELEGRAM_BOT_TOKEN="<bot token de @BotFather>"
  python telegram_helper.py getme
  python telegram_helper.py getupdates
  python telegram_helper.py send <chat_id> "Texto del mensaje"
  python telegram_helper.py sendphoto <chat_id> ../fixtures/invoice-legible.png "Caption opcional"
  python telegram_helper.py fileid <chat_id> ../fixtures/invoice-legible.png
      -> envía la foto y muestra el file_id (sirve para armar un update de prueba)

Notas:
  - getupdates solo funciona si NO hay webhook activo (si el workflow está publicado,
    Telegram entrega los updates al webhook de n8n y getupdates devuelve 409 Conflict).
  - Para la prueba e2e real: publicá el workflow y escribí mensajes reales al bot;
    la FSM responde sola. Este helper sirve para enviar mensajes/fotos del lado del bot
    y para extraer file_id / chat_id.
"""
import json
import os
import sys
import urllib.request
import urllib.error

API = "https://api.telegram.org/bot{token}/{method}"


def get_token(argv):
    for i, a in enumerate(argv):
        if a == "--token-file" and i + 1 < len(argv):
            with open(argv[i + 1], "r", encoding="utf-8") as f:
                raw = f.read()
            # formato "api-key: <token>" o solo el token
            return raw.split(":", 1)[-1].strip() if raw.strip().lower().startswith("api-key") else raw.strip()
    tok = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    if not tok:
        sys.exit("ERROR: definí TELEGRAM_BOT_TOKEN o pasá --token-file <ruta>")
    return tok


def call(token, method, payload=None, files=None):
    url = API.format(token=token, method=method)
    if files:
        # multipart manual para sendPhoto con archivo
        boundary = "----superlikersBoundary"
        body = b""
        for k, v in (payload or {}).items():
            body += ("--%s\r\nContent-Disposition: form-data; name=\"%s\"\r\n\r\n%s\r\n" % (boundary, k, v)).encode("utf-8")
        for k, (fname, data) in files.items():
            body += ("--%s\r\nContent-Disposition: form-data; name=\"%s\"; filename=\"%s\"\r\n" % (boundary, k, fname)).encode("utf-8")
            body += b"Content-Type: application/octet-stream\r\n\r\n" + data + b"\r\n"
        body += ("--%s--\r\n" % boundary).encode("utf-8")
        req = urllib.request.Request(url, data=body)
        req.add_header("Content-Type", "multipart/form-data; boundary=%s" % boundary)
    else:
        data = json.dumps(payload or {}).encode("utf-8")
        req = urllib.request.Request(url, data=data)
        req.add_header("Content-Type", "application/json; charset=utf-8")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode("utf-8"))


def main():
    argv = sys.argv[1:]
    token = get_token(argv)
    argv = [a for a in argv if not a.startswith("--token")]
    args = [a for a in argv if a not in (None,)]
    # quitar el valor de --token-file si quedó
    if "--token-file" in sys.argv:
        idx = sys.argv.index("--token-file")
        skip = sys.argv[idx + 1] if idx + 1 < len(sys.argv) else None
        args = [a for a in args if a != skip]

    if not args:
        sys.exit(__doc__)
    cmd = args[0]

    if cmd == "getme":
        print(json.dumps(call(token, "getMe"), ensure_ascii=False, indent=2))
    elif cmd == "getupdates":
        print(json.dumps(call(token, "getUpdates", {"limit": 10}), ensure_ascii=False, indent=2))
    elif cmd == "send":
        chat_id, text = args[1], args[2]
        print(json.dumps(call(token, "sendMessage", {"chat_id": chat_id, "text": text}), ensure_ascii=False, indent=2))
    elif cmd in ("sendphoto", "fileid"):
        chat_id, path = args[1], args[2]
        caption = args[3] if len(args) > 3 else None
        with open(path, "rb") as f:
            data = f.read()
        payload = {"chat_id": str(chat_id)}
        if caption:
            payload["caption"] = caption
        res = call(token, "sendPhoto", payload, files={"photo": (os.path.basename(path), data)})
        if cmd == "fileid" and res.get("ok"):
            photos = res["result"].get("photo", [])
            best = photos[-1]["file_id"] if photos else None
            print("file_id (mayor resolución):", best)
        else:
            print(json.dumps(res, ensure_ascii=False, indent=2))
    else:
        sys.exit(__doc__)


if __name__ == "__main__":
    main()
