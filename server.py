#!/usr/bin/env python3
from __future__ import annotations

import json
import mimetypes
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.response import addinfourl
from pathlib import Path
from typing import Final

ROOT: Final[Path] = Path(__file__).resolve().parent
MAX_REQUEST_BYTES: Final[int] = 2 * 1024 * 1024
HOP_BY_HOP_HEADERS: Final[frozenset[str]] = frozenset({
    "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
    "te", "trailer", "transfer-encoding", "upgrade",
})
type JsonValue = str | int | float | bool | None | list[JsonValue] | dict[str, JsonValue]


class LocalHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_GET(self) -> None:
        relative = self.path.split("?", 1)[0].lstrip("/") or "index.html"
        candidate = (ROOT / relative).resolve()
        if ROOT not in candidate.parents and candidate != ROOT:
            self.send_error(403, "Forbidden")
            return
        if not candidate.is_file():
            self.send_error(404, "Not found")
            return
        content = candidate.read_bytes()
        if candidate.name == "index.html":
            content = content.replace(b"window.__llmctLocalRelay = false;", b"window.__llmctLocalRelay = true;")
        content_type = mimetypes.guess_type(candidate.name)[0] or "application/octet-stream"
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self) -> None:
        if self.path != "/_llmct/proxy":
            self.send_error(404, "Not found")
            return
        try:
            request = self._read_json()
            target = self._read_target(request)
            upstream = self._open_upstream(target)
        except ValueError as error:
            self.send_error(400, str(error))
            return
        except urllib.error.HTTPError as error:
            self._send_upstream_error(error)
            return
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            self.send_error(502, f"Upstream connection failed: {error}")
            return

        with upstream:
            self.send_response(upstream.status)
            self.send_header("Connection", "close")
            for name, value in upstream.headers.items():
                if name.lower() not in HOP_BY_HOP_HEADERS:
                    self.send_header(name, value)
            self.end_headers()
            while chunk := upstream.read(64 * 1024):
                self.wfile.write(chunk)
                self.wfile.flush()

    def _read_json(self) -> dict[str, JsonValue]:
        length_text = self.headers.get("Content-Length", "0")
        try:
            length = int(length_text)
        except ValueError as error:
            raise ValueError("Invalid Content-Length") from error
        if length < 0 or length > MAX_REQUEST_BYTES:
            raise ValueError("Request body is too large")
        try:
            value = json.loads(self.rfile.read(length))
        except json.JSONDecodeError as error:
            raise ValueError("Proxy body must be valid JSON") from error
        if not isinstance(value, dict):
            raise ValueError("Proxy body must be a JSON object")
        return value

    @staticmethod
    def _read_target(request: dict[str, JsonValue]) -> tuple[str, str, dict[str, str], bytes | None]:
        url = request.get("url")
        method = request.get("method", "GET")
        headers = request.get("headers", {})
        body = request.get("body")
        if not isinstance(url, str) or not url.startswith(("http://", "https://")):
            raise ValueError("Upstream URL must start with http:// or https://")
        if not isinstance(method, str) or method not in {"GET", "POST"}:
            raise ValueError("Only GET and POST are supported")
        if not isinstance(headers, dict):
            raise ValueError("Invalid upstream headers")
        normalized_headers: dict[str, str] = {}
        for key, value in headers.items():
            if not isinstance(value, str):
                raise ValueError("Invalid upstream headers")
            normalized_headers[key] = value
        if body is not None and not isinstance(body, str):
            raise ValueError("Upstream body must be a string or null")
        return url, method, normalized_headers, body.encode() if isinstance(body, str) else None

    @staticmethod
    def _open_upstream(target: tuple[str, str, dict[str, str], bytes | None]) -> addinfourl:
        url, method, headers, body = target
        request = urllib.request.Request(url, data=body, headers=headers, method=method)
        return urllib.request.urlopen(request, timeout=90)

    def _send_upstream_error(self, error: urllib.error.HTTPError) -> None:
        body = error.read()
        self.send_response(error.code)
        self.send_header("Content-Type", error.headers.get("Content-Type", "application/json"))
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format_string: str, *args: str) -> None:
        print(f"[llmct] {self.address_string()} - {format_string % args}")


def main() -> None:
    host = os.environ.get("LLMCT_HOST", "127.0.0.1")
    port = int(os.environ.get("LLMCT_PORT", "8777"))
    server = ThreadingHTTPServer((host, port), LocalHandler)
    print(f"LLM Concurrency Test: http://{host}:{port}/")
    print("Local API relay: enabled at /_llmct/proxy")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
