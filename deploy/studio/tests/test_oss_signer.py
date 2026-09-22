# Copyright (C) 2023-2026 QuantumNous
# SPDX-License-Identifier: AGPL-3.0-or-later
import json
import sys
import tempfile
import unittest
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from oss_signer import OssSettings, StorageApplication, read_env_file  # noqa: E402


class FakeSigner:
    def __init__(self):
        self.calls = []

    def sign(self, method, object_key, expires, headers=None):
        self.calls.append((method, object_key, expires, headers))
        return (
            f"https://linoroute.oss-cn-guangzhou.aliyuncs.com/"
            f"{object_key}?signature={method.lower()}"
        )


class OssSignerApplicationTest(unittest.TestCase):
    def setUp(self):
        self.signer = FakeSigner()
        self.tokens = []
        self.app = StorageApplication(
            settings=OssSettings(
                access_key_id="id-not-used-by-test",
                access_key_secret="secret-not-used-by-test",
                endpoint="https://oss-cn-guangzhou.aliyuncs.com",
                region="cn-guangzhou",
                bucket="linoroute",
                prefix="studio",
            ),
            signer=self.signer,
            validate_token=lambda token: self.tokens.append(token) or True,
            now=lambda: datetime(2026, 9, 14, 12, 0, tzinfo=UTC),
            create_id=lambda: "fixed-id",
        )

    def request(self, payload, *, token="sk-valid", origin="http://127.0.0.1:4178"):
        return self.app.handle(
            "POST",
            "/v1/uploads",
            {
                "authorization": f"Bearer {token}",
                "content-type": "application/json",
                "origin": origin,
            },
            json.dumps(payload).encode(),
        )

    def test_valid_reference_returns_short_put_and_seven_day_read_urls(self):
        response = self.request(
            {
                "contentType": "image/png",
                "fileName": "../../portrait.png",
                "purpose": "reference",
                "size": 1234,
            }
        )

        self.assertEqual(response.status, 200)
        value = json.loads(response.body)
        self.assertEqual(value["objectKey"], "studio/reference/2026/09/14/fixed-id.png")
        self.assertEqual(value["expiresAt"], 1789992000000)
        self.assertIn("signature=put", value["uploadUrl"])
        self.assertIn("signature=get", value["readUrl"])
        self.assertEqual(self.tokens, ["sk-valid"])
        self.assertEqual(
            self.signer.calls,
            [
                (
                    "PUT",
                    "studio/reference/2026/09/14/fixed-id.png",
                    300,
                    {"Content-Type": "image/png"},
                ),
                (
                    "GET",
                    "studio/reference/2026/09/14/fixed-id.png",
                    604800,
                    None,
                ),
            ],
        )
        self.assertEqual(response.headers["Cache-Control"], "no-store")

    def test_invalid_origin_and_missing_token_are_rejected_before_signing(self):
        invalid_origin = self.request(
            {
                "contentType": "image/png",
                "fileName": "portrait.png",
                "purpose": "reference",
                "size": 1234,
            },
            origin="https://evil.example",
        )
        missing_token = self.app.handle(
            "POST",
            "/v1/uploads",
            {"content-type": "application/json", "origin": "https://studio.linoroute.com"},
            b"{}",
        )
        self.assertEqual(invalid_origin.status, 403)
        self.assertEqual(missing_token.status, 401)
        self.assertEqual(self.signer.calls, [])
        self.assertEqual(self.tokens, [])

    def test_unsafe_media_and_oversized_payloads_are_rejected(self):
        for payload in [
            {
                "contentType": "text/html",
                "fileName": "page.html",
                "purpose": "reference",
                "size": 10,
            },
            {
                "contentType": "video/mp4",
                "fileName": "huge.mp4",
                "purpose": "result",
                "size": 512 * 1024 * 1024 + 1,
            },
            {
                "contentType": "image/jpeg",
                "fileName": "image.jpg",
                "purpose": "other",
                "size": 10,
            },
        ]:
            with self.subTest(payload=payload):
                response = self.request(payload)
                self.assertEqual(response.status, 400)
        self.assertEqual(self.signer.calls, [])

    def test_invalid_api_key_is_not_reflected_in_the_response(self):
        self.app.validate_token = lambda token: False
        response = self.request(
            {
                "contentType": "image/webp",
                "fileName": "portrait.webp",
                "purpose": "reference",
                "size": 10,
            },
            token="sk-private-value",
        )
        self.assertEqual(response.status, 401)
        self.assertNotIn("sk-private-value", response.body.decode())
        self.assertEqual(self.signer.calls, [])

    def test_public_prompt_asset_route_redirects_only_to_the_fixed_private_prefix(self):
        prompt_signer = FakeSigner()
        self.app.prompt_signer = prompt_signer
        self.app.prompt_prefix = "prompt-library/images"

        response = self.app.handle(
            "GET",
            "/v1/prompt-assets/prompt-library/images/gpt-image-544.jpg",
            {},
            b"",
        )

        self.assertEqual(response.status, 302)
        self.assertEqual(response.headers["Cache-Control"], "no-store")
        self.assertEqual(
            response.headers["Location"],
            "https://linoroute.oss-cn-guangzhou.aliyuncs.com/"
            "prompt-library/images/gpt-image-544.jpg?signature=get",
        )
        self.assertEqual(
            prompt_signer.calls,
            [("GET", "prompt-library/images/gpt-image-544.jpg", 3600, None)],
        )
        self.assertEqual(self.signer.calls, [])

    def test_public_prompt_asset_route_rejects_other_keys_and_unsafe_paths(self):
        prompt_signer = FakeSigner()
        self.app.prompt_signer = prompt_signer
        self.app.prompt_prefix = "prompt-library/images"

        for path in [
            "/v1/prompt-assets/studio/result/private.png",
            "/v1/prompt-assets/prompt-library/images/../private.jpg",
            "/v1/prompt-assets/prompt-library/images/case.svg",
            "/v1/prompt-assets/prompt-library/images/case.jpg?download=1",
        ]:
            with self.subTest(path=path):
                response = self.app.handle("GET", path, {}, b"")
                self.assertEqual(response.status, 404)

        self.assertEqual(prompt_signer.calls, [])

    def test_prompt_oss_uses_its_own_environment_namespace_and_prefix(self):
        values = {
            "STUDIO_PROMPT_OSS_ACCESS_KEY_ID": "prompt-id",
            "STUDIO_PROMPT_OSS_ACCESS_KEY_SECRET": "prompt-secret",
            "STUDIO_PROMPT_OSS_ENDPOINT": "https://oss-cn-guangzhou.aliyuncs.com",
            "STUDIO_PROMPT_OSS_REGION": "cn-guangzhou",
            "STUDIO_PROMPT_OSS_BUCKET": "linoroute-prompt-image",
            "STUDIO_PROMPT_OSS_PREFIX": "prompt-library/images",
        }

        try:
            settings = OssSettings.from_mapping(
                values,
                namespace="STUDIO_PROMPT_OSS",
                expected_prefix="prompt-library/images",
            )
        except Exception as exc:  # pragma: no cover - failure detail for RED
            self.fail(f"dedicated prompt OSS configuration was rejected: {exc}")

        self.assertEqual(settings.bucket, "linoroute-prompt-image")
        self.assertEqual(settings.prefix, "prompt-library/images")

    def test_env_reader_keeps_upload_and_prompt_oss_namespaces(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "studio.env"
            path.write_text(
                "STUDIO_OSS_BUCKET=temporary\n"
                "STUDIO_PROMPT_OSS_BUCKET=long-lived\n"
                "UNRELATED_SECRET=do-not-load\n",
                encoding="utf-8",
            )

            values = read_env_file(path)

        self.assertEqual(
            values,
            {
                "STUDIO_OSS_BUCKET": "temporary",
                "STUDIO_PROMPT_OSS_BUCKET": "long-lived",
            },
        )


if __name__ == "__main__":
    unittest.main()
