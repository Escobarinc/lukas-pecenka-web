"""Lokální server webu pro prezentaci – prohlížeč si nic neukládá, vždy ukáže aktuální verzi.
Spuštění:  python3 server.py   → http://localhost:8765
"""
import http.server, os, socketserver

PORT = int(os.environ.get("PORT", "8765"))

class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))
socketserver.TCPServer.allow_reuse_address = True
try:
    srv = http.server.ThreadingHTTPServer(("", PORT), NoCache)
except OSError:
    print(f"Web už běží – otevřete v prohlížeči http://localhost:{PORT}")
    raise SystemExit(0)
with srv:
    print(f"Web běží na http://localhost:{PORT}  (ukončení: Ctrl+C)")
    srv.serve_forever()
