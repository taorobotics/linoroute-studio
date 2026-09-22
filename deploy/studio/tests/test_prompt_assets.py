# Copyright (C) 2023-2026 QuantumNous
# SPDX-License-Identifier: AGPL-3.0-or-later
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from prompt_assets import (  # noqa: E402
    PromptAssetSettings,
    build_migration_plan,
    ensure_dedicated_bucket,
    load_settings,
    rewrite_catalog,
)


class PromptAssetMigrationTest(unittest.TestCase):
    def setUp(self):
        self.settings = PromptAssetSettings(
            access_key_id='id-not-used-by-test',
            access_key_secret='secret-not-used-by-test',
            endpoint='https://oss-cn-guangzhou.aliyuncs.com',
            region='cn-guangzhou',
            bucket='linoroute-prompt-assets',
            prefix='prompt-library/images',
            public_base_url=(
                'https://linoroute-prompt-assets.'
                'oss-cn-guangzhou.aliyuncs.com'
            ),
        )

    def test_builds_stable_keys_and_public_urls_for_catalog_images(self):
        catalog = [
            {
                'id': 'gpt-image-544',
                'imageUrl': 'https://raw.githubusercontent.com/org/repo/a/case544.jpg',
            },
            {
                'id': 'nano-banana-1',
                'imageUrl': 'https://cms-assets.youmind.com/media/case.png',
            },
        ]

        plan = build_migration_plan(catalog, self.settings)

        self.assertEqual(
            [item.object_key for item in plan],
            [
                'prompt-library/images/gpt-image-544.jpg',
                'prompt-library/images/nano-banana-1.png',
            ],
        )
        self.assertEqual(
            plan[0].public_url,
            'https://linoroute-prompt-assets.oss-cn-guangzhou.aliyuncs.com/'
            'prompt-library/images/gpt-image-544.jpg',
        )

    def test_derives_public_base_url_from_the_dedicated_bucket(self):
        with tempfile.TemporaryDirectory() as directory:
            env_file = Path(directory) / '.env'
            env_file.write_text(
                '\n'.join(
                    [
                        'STUDIO_PROMPT_OSS_ACCESS_KEY_ID=test-id',
                        'STUDIO_PROMPT_OSS_ACCESS_KEY_SECRET=test-secret',
                        'STUDIO_PROMPT_OSS_ENDPOINT=https://oss-cn-guangzhou.aliyuncs.com',
                        'STUDIO_PROMPT_OSS_REGION=cn-guangzhou',
                        'STUDIO_PROMPT_OSS_BUCKET=linoroute-prompt-assets',
                        'STUDIO_PROMPT_OSS_PREFIX=prompt-library/images',
                        'STUDIO_PROMPT_OSS_PUBLIC_BASE_URL=',
                    ]
                ),
                encoding='utf-8',
            )

            settings = load_settings(env_file)

        self.assertEqual(
            settings.public_base_url,
            'https://linoroute-prompt-assets.oss-cn-guangzhou.aliyuncs.com',
        )

    def test_rejects_non_https_or_unapproved_source_hosts(self):
        for url in [
            'http://raw.githubusercontent.com/org/repo/image.jpg',
            'https://127.0.0.1/private.jpg',
            'https://example.com/image.jpg',
        ]:
            with self.subTest(url=url), self.assertRaises(ValueError):
                build_migration_plan(
                    [{'id': 'unsafe', 'imageUrl': url}], self.settings
                )

    def test_refuses_to_reuse_the_temporary_upload_bucket(self):
        with self.assertRaises(ValueError):
            ensure_dedicated_bucket(
                self.settings,
                {'STUDIO_OSS_BUCKET': 'linoroute-prompt-assets'},
            )

    def test_rewrites_only_preview_urls_after_every_asset_is_ready(self):
        catalog = [
            {
                'id': 'gpt-image-544',
                'imageUrl': 'https://raw.githubusercontent.com/org/repo/a/case544.jpg',
                'sourceCaseUrl': 'https://github.com/org/repo/case544',
            }
        ]
        plan = build_migration_plan(catalog, self.settings)

        rewritten = rewrite_catalog(catalog, plan)

        self.assertEqual(rewritten[0]['imageUrl'], plan[0].public_url)
        self.assertEqual(
            rewritten[0]['sourceCaseUrl'],
            'https://github.com/org/repo/case544',
        )
        self.assertNotEqual(catalog[0]['imageUrl'], rewritten[0]['imageUrl'])

    def test_keeps_reused_display_ids_as_distinct_oss_objects(self):
        catalog = [
            {
                'id': 'nano-banana-1',
                'imageUrl': 'https://cms-assets.youmind.com/media/featured.jpg',
            },
            {
                'id': 'nano-banana-1',
                'imageUrl': 'https://cms-assets.youmind.com/media/all-prompts.jpg',
            },
        ]

        plan = build_migration_plan(catalog, self.settings)
        rewritten = rewrite_catalog(catalog, plan)

        self.assertEqual(
            [item.object_key for item in plan],
            [
                'prompt-library/images/nano-banana-1.jpg',
                'prompt-library/images/nano-banana-1-2.jpg',
            ],
        )
        self.assertEqual(
            [item['imageUrl'] for item in rewritten],
            [item.public_url for item in plan],
        )
        self.assertNotEqual(
            rewritten[0]['imageUrl'], rewritten[1]['imageUrl']
        )

    def test_rewrite_preserves_the_original_download_url_for_future_runs(self):
        catalog = [
            {
                'id': 'gpt-image-544',
                'imageUrl': 'https://raw.githubusercontent.com/org/repo/a/case544.jpg',
            }
        ]
        plan = build_migration_plan(catalog, self.settings)

        rewritten = rewrite_catalog(catalog, plan)

        self.assertEqual(
            rewritten[0].get('sourceImageUrl'),
            'https://raw.githubusercontent.com/org/repo/a/case544.jpg',
        )

    def test_completed_catalog_can_build_the_same_plan_again(self):
        catalog = [
            {
                'id': 'gpt-image-544',
                'imageUrl': (
                    'https://studio.linoroute.com/studio-prompt-assets/'
                    'prompt-library/images/gpt-image-544.jpg'
                ),
                'sourceImageUrl': (
                    'https://raw.githubusercontent.com/org/repo/a/case544.jpg'
                ),
            }
        ]

        try:
            plan = build_migration_plan(catalog, self.settings)
        except Exception as exc:  # pragma: no cover - failure detail for RED
            self.fail(f'completed catalog is not resumable: {exc}')

        self.assertEqual(
            plan[0].source_url,
            'https://raw.githubusercontent.com/org/repo/a/case544.jpg',
        )


if __name__ == '__main__':
    unittest.main()
