"""Tiny dev server for dev/harness.html (no Node needed).

    python dev/server.py            # then open http://localhost:8765/dev/harness.html

It serves the project folder and accepts POST /save?name=file.svg, which writes into docs/images
(used to regenerate the README pictures from the real visual code).
"""
import os
import re
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = os.path.join(ROOT, "docs", "images")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_POST(self):
        url = urlparse(self.path)
        name = parse_qs(url.query).get("name", [""])[0]
        if url.path != "/save" or not re.fullmatch(r"[A-Za-z0-9._-]+\.svg", name):
            self.send_error(400, "only /save?name=<file>.svg is allowed")
            return
        length = int(self.headers.get("Content-Length", 0))
        data = self.rfile.read(length)
        os.makedirs(IMAGES, exist_ok=True)
        with open(os.path.join(IMAGES, name), "wb") as f:
            f.write(data)
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b"ok")


if __name__ == "__main__":
    print("Serving", ROOT, "on http://localhost:8765/dev/harness.html")
    ThreadingHTTPServer(("127.0.0.1", 8765), Handler).serve_forever()
