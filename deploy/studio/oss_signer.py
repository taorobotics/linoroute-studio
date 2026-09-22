# Copyright (C) 2023-2026 QuantumNous
# SPDX-License-Identifier: AGPL-3.0-or-later
"""Small, local-only OSS URL signer for LinoRoute Studio.

The browser never receives the long-lived OSS credentials.  It authenticates
with the user's LinoRoute API key, then receives one short-lived PUT URL and a
seven-day GET URL for a server-selected object key.
"""

from __future__ import annotations

import argparse
import http.client
import json
import os
import re
import ssl
import sys
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Callable, Mapping, Protocol
from urllib.parse import urlparse


MAX_REQUEST_BODY = 8 * 1024
MAX_MEDIA_SIZE = 512 * 1024 * 1024
UPLOAD_EXPIRES_SECONDS = 5 * 60
READ_EXPIRES_SECONDS = 7 * 24 * 60 * 60
PROMPT_ASSET_EXPIRES_SECONDS = 60 * 60
ALLOWED_ORIGINS = frozenset(
    {"http://127.0.0.1:4178", "https://studio.linoroute.com"}
)
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
}
TOKEN_RE = re.compile(r"^[A-Za-z0-9._-]{3,512}$")
NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
REGION_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}$")
BUCKET_RE = re.compile(r"^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$")


@dataclass(frozen=True)
class OssSettings:
    access_key_id: str
    access_key_secret: str
    endpoint: str
    region: str
    bucket: str
    prefix: str = "studio"

    @classmethod
    def from_mapping(
        cls,
        values: Mapping[str, str],
        *,
        namespace: str = "STUDIO_OSS",
        expected_prefix: str = "studio",
    ) -> "OssSettings":
        settings = cls(
            access_key_id=values.get(
                f"{namespace}_ACCESS_KEY_ID", ""
            ).strip(),
            access_key_secret=values.get(
                f"{namespace}_ACCESS_KEY_SECRET", ""
            ).strip(),
            endpoint=values.get(f"{namespace}_ENDPOINT", "").strip(),
            region=values.get(f"{namespace}_REGION", "").strip(),
            bucket=values.get(f"{namespace}_BUCKET", "").strip(),
            prefix=values.get(
                f"{namespace}_PREFIX", expected_prefix
            ).strip(" /"),
        )
        settings.validate(expected_prefix=expected_prefix)
        return settings

    def validate(self, *, expected_prefix: str = "studio") -> None:
        parsed = urlparse(self.endpoint)
        if (
            not self.access_key_id
            or not self.access_key_secret
            or parsed.scheme != "https"
            or not parsed.hostname
            or parsed.username
            or parsed.password
            or parsed.path not in ("", "/")
            or parsed.query
            or parsed.fragment
            or not parsed.hostname.endswith(".aliyuncs.com")
            or not parsed.hostname.startswith("oss-")
            or not REGION_RE.fullmatch(self.region)
            or not BUCKET_RE.fullmatch(self.bucket)
            or self.prefix != expected_prefix
        ):
            raise ValueError("Invalid OSS configuration")


@dataclass(frozen=True)
class AppResponse:
    status: int
    headers: dict[str, str]
    body: bytes


class UrlSigner(Protocol):
    def sign(
        self,
        method: str,
        object_key: str,
        expires: int,
        headers: Mapping[str, str] | None = None,
    ) -> str: ...


class OssV4Signer:
    def __init__(self, settings: OssSettings):
        try:
            import oss2
        except ImportError as exc:  # pragma: no cover - exercised at service start
            raise RuntimeError(
                "Missing dependency: install deploy/studio/requirements.txt"
            ) from exc
        auth = oss2.AuthV4(settings.access_key_id, settings.access_key_secret)
        self.bucket = oss2.Bucket(
            auth,
            settings.endpoint,
            settings.bucket,
            region=settings.region,
        )

    def sign(
        self,
        method: str,
        object_key: str,
        expires: int,
        headers: Mapping[str, str] | None = None,
    ) -> str:
        return self.bucket.sign_url(
            method,
            object_key,
            expires,
            headers=dict(headers) if headers else None,
            slash_safe=True,
        )


class StorageApplication:
    def __init__(
        self,
        *,
        settings: OssSettings,
        signer: UrlSigner,
        validate_token: Callable[[str], bool],
        prompt_signer: UrlSigner | None = None,
        prompt_prefix: str = "",
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
        create_id: Callable[[], str] = lambda: uuid.uuid4().hex,
    ):
        self.settings = settings
        self.signer = signer
        self.validate_token = validate_token
        self.prompt_signer = prompt_signer
        self.prompt_prefix = prompt_prefix
        self.now = now
        self.create_id = create_id

    @staticmethod
    def _response(status: int, payload: Mapping[str, object]) -> AppResponse:
        return AppResponse(
            status=status,
            headers={
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
            },
            body=json.dumps(payload, separators=(",", ":")).encode(),
        )

    def handle(
        self,
        method: str,
        path: str,
        headers: Mapping[str, str],
        body: bytes,
    ) -> AppResponse:
        if method == "GET" and self.prompt_signer and self.prompt_prefix:
            expected_path = re.fullmatch(
                rf"/v1/prompt-assets/({re.escape(self.prompt_prefix)}/"
                r"[a-z0-9][a-z0-9-]{1,127}\.(?:jpg|png|webp))",
                path,
            )
            if expected_path:
                try:
                    signed_url = self.prompt_signer.sign(
                        "GET",
                        expected_path.group(1),
                        PROMPT_ASSET_EXPIRES_SECONDS,
                        None,
                    )
                except Exception:
                    return self._response(
                        503, {"error": "storage_unavailable"}
                    )
                return AppResponse(
                    status=302,
                    headers={
                        "Location": signed_url,
                        "Cache-Control": "no-store",
                        "X-Content-Type-Options": "nosniff",
                        "Content-Security-Policy": (
                            "default-src 'none'; frame-ancestors 'none'"
                        ),
                    },
                    body=b"",
                )
        normalized = {name.lower(): value for name, value in headers.items()}
        if method != "POST" or path != "/v1/uploads":
            return self._response(404, {"error": "not_found"})
        if normalized.get("origin") not in ALLOWED_ORIGINS:
            return self._response(403, {"error": "forbidden"})
        authorization = normalized.get("authorization", "")
        if not authorization.startswith("Bearer "):
            return self._response(401, {"error": "unauthorized"})
        token = authorization[7:]
        if not TOKEN_RE.fullmatch(token):
            return self._response(401, {"error": "unauthorized"})
        if len(body) > MAX_REQUEST_BODY or not normalized.get(
            "content-type", ""
        ).lower().startswith("application/json"):
            return self._response(400, {"error": "invalid_request"})
        try:
            authorized = self.validate_token(token)
        except Exception:
            return self._response(503, {"error": "authorization_unavailable"})
        if not authorized:
            return self._response(401, {"error": "unauthorized"})
        try:
            payload = json.loads(body)
        except (UnicodeDecodeError, json.JSONDecodeError):
            return self._response(400, {"error": "invalid_request"})
        if not isinstance(payload, dict):
            return self._response(400, {"error": "invalid_request"})

        content_type = payload.get("contentType")
        file_name = payload.get("fileName")
        purpose = payload.get("purpose")
        size = payload.get("size")
        if (
            content_type not in CONTENT_TYPE_EXTENSIONS
            or purpose not in ("reference", "result")
            or not isinstance(file_name, str)
            or len(file_name) > 255
            or isinstance(size, bool)
            or not isinstance(size, int)
            or not 0 < size <= MAX_MEDIA_SIZE
        ):
            return self._response(400, {"error": "invalid_media"})
        generated_id = self.create_id()
        if not NAME_RE.fullmatch(generated_id):
            return self._response(503, {"error": "storage_unavailable"})

        instant = self.now().astimezone(UTC)
        extension = CONTENT_TYPE_EXTENSIONS[content_type]
        object_key = (
            f"{self.settings.prefix}/{purpose}/{instant:%Y/%m/%d}/"
            f"{generated_id}{extension}"
        )
        try:
            upload_url = self.signer.sign(
                "PUT",
                object_key,
                UPLOAD_EXPIRES_SECONDS,
                {"Content-Type": content_type},
            )
            read_url = self.signer.sign(
                "GET", object_key, READ_EXPIRES_SECONDS, None
            )
        except Exception:
            return self._response(503, {"error": "storage_unavailable"})
        expires_at = int(
            (instant + timedelta(seconds=READ_EXPIRES_SECONDS)).timestamp() * 1000
        )
        return self._response(
            200,
            {
                "uploadUrl": upload_url,
                "readUrl": read_url,
                "objectKey": object_key,
                "expiresAt": expires_at,
            },
        )


def validate_lino_token(token: str) -> bool:
    connection = http.client.HTTPSConnection(
        "linoroute.com", 443, timeout=8, context=ssl.create_default_context()
    )
    try:
        connection.request(
            "GET",
            "/v1/models",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/json",
                "User-Agent": "LinoRoute-Studio-Storage/1.0",
            },
        )
        response = connection.getresponse()
        response.read(1024)
        return response.status == 200
    finally:
        connection.close()


def read_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        return values
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        name = name.strip()
        if name.startswith(("STUDIO_OSS_", "STUDIO_PROMPT_OSS_")):
            values[name] = value.strip().strip('"').strip("'")
    return values


class StorageHandler(BaseHTTPRequestHandler):
    server_version = "LinoRouteStorage"
    sys_version = ""

    def do_POST(self) -> None:  # noqa: N802
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = MAX_REQUEST_BODY + 1
        if length < 0 or length > MAX_REQUEST_BODY:
            response = StorageApplication._response(
                413, {"error": "request_too_large"}
            )
        else:
            body = self.rfile.read(length)
            response = self.server.application.handle(  # type: ignore[attr-defined]
                "POST", self.path, dict(self.headers.items()), body
            )
        self.send_response(response.status)
        for name, value in response.headers.items():
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(response.body)))
        self.end_headers()
        self.wfile.write(response.body)

    def do_GET(self) -> None:  # noqa: N802
        response = self.server.application.handle(  # type: ignore[attr-defined]
            "GET", self.path, dict(self.headers.items()), b""
        )
        self.send_response(response.status)
        for name, value in response.headers.items():
            self.send_header(name, value)
        self.send_header("Content-Length", str(len(response.body)))
        self.end_headers()
        self.wfile.write(response.body)

    def log_message(self, format: str, *args: object) -> None:
        return


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", type=Path)
    parser.add_argument("--port", type=int, default=4181)
    args = parser.parse_args()
    values = read_env_file(args.env) if args.env else {}
    values.update(
        {
            name: value
            for name, value in os.environ.items()
            if name.startswith(("STUDIO_OSS_", "STUDIO_PROMPT_OSS_"))
        }
    )
    try:
        settings = OssSettings.from_mapping(values)
        signer = OssV4Signer(settings)
        prompt_signer = None
        prompt_prefix = ""
        if any(name.startswith("STUDIO_PROMPT_OSS_") for name in values):
            prompt_settings = OssSettings.from_mapping(
                values,
                namespace="STUDIO_PROMPT_OSS",
                expected_prefix="prompt-library/images",
            )
            if prompt_settings.bucket == settings.bucket:
                raise ValueError("Prompt OSS must use a dedicated bucket")
            prompt_signer = OssV4Signer(prompt_settings)
            prompt_prefix = prompt_settings.prefix
    except (ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    application = StorageApplication(
        settings=settings,
        signer=signer,
        validate_token=validate_lino_token,
        prompt_signer=prompt_signer,
        prompt_prefix=prompt_prefix,
    )
    server = ThreadingHTTPServer(("127.0.0.1", args.port), StorageHandler)
    server.application = application  # type: ignore[attr-defined]
    print(f"LinoRoute Studio OSS signer listening on 127.0.0.1:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
