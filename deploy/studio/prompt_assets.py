# Copyright (C) 2023-2026 QuantumNous
# SPDX-License-Identifier: AGPL-3.0-or-later
import argparse
import copy
import json
import mimetypes
import re
from dataclasses import dataclass
from pathlib import Path
from urllib.parse import quote, urlparse

ALLOWED_SOURCE_HOSTS = {
    'raw.githubusercontent.com',
    'cms-assets.youmind.com',
}
ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}
MAX_IMAGE_BYTES = 20 * 1024 * 1024


@dataclass(frozen=True)
class PromptAssetSettings:
    access_key_id: str
    access_key_secret: str
    endpoint: str
    region: str
    bucket: str
    prefix: str
    public_base_url: str


@dataclass(frozen=True)
class PromptAssetPlan:
    item_id: str
    source_url: str
    object_key: str
    public_url: str
    content_type: str


def read_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for line in path.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        name, value = line.split('=', 1)
        values[name.strip()] = value.strip().strip('"').strip("'")
    return values


def load_settings(path: Path, *, require_credentials: bool = True) -> PromptAssetSettings:
    values = read_env(path)
    key_id = values.get('STUDIO_PROMPT_OSS_ACCESS_KEY_ID', '').strip()
    key_secret = values.get('STUDIO_PROMPT_OSS_ACCESS_KEY_SECRET', '').strip()
    endpoint = values.get('STUDIO_PROMPT_OSS_ENDPOINT', '').strip().rstrip('/')
    region = values.get('STUDIO_PROMPT_OSS_REGION', '').strip()
    bucket = values.get('STUDIO_PROMPT_OSS_BUCKET', '').strip()
    prefix = values.get(
        'STUDIO_PROMPT_OSS_PREFIX', 'prompt-library/images'
    ).strip(' /')
    public_base_url = values.get(
        'STUDIO_PROMPT_OSS_PUBLIC_BASE_URL', ''
    ).strip().rstrip('/')

    if require_credentials and (not key_id or not key_secret):
        raise ValueError('Fill the dedicated prompt OSS AccessKey ID and secret.')
    if not endpoint or urlparse(endpoint).scheme != 'https':
        raise ValueError('STUDIO_PROMPT_OSS_ENDPOINT must be an HTTPS URL.')
    if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,62}', bucket):
        raise ValueError('Fill a valid dedicated STUDIO_PROMPT_OSS_BUCKET.')
    if not prefix:
        raise ValueError('STUDIO_PROMPT_OSS_PREFIX cannot be empty.')
    if not public_base_url:
        endpoint_host = urlparse(endpoint).hostname
        public_base_url = f'https://{bucket}.{endpoint_host}'
    if not public_base_url or urlparse(public_base_url).scheme != 'https':
        raise ValueError('Fill an HTTPS STUDIO_PROMPT_OSS_PUBLIC_BASE_URL.')

    return PromptAssetSettings(
        access_key_id=key_id,
        access_key_secret=key_secret,
        endpoint=endpoint,
        region=region,
        bucket=bucket,
        prefix=prefix,
        public_base_url=public_base_url,
    )


def ensure_dedicated_bucket(
    settings: PromptAssetSettings, upload_values: dict[str, str]
) -> None:
    upload_bucket = upload_values.get('STUDIO_OSS_BUCKET', '').strip()
    if upload_bucket and upload_bucket == settings.bucket:
        raise ValueError(
            'The prompt library must use a different bucket from temporary uploads.'
        )


def _source_extension(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != 'https' or parsed.hostname not in ALLOWED_SOURCE_HOSTS:
        raise ValueError(f'Unapproved image source: {url}')
    extension = Path(parsed.path).suffix.lower()
    if extension not in ALLOWED_EXTENSIONS:
        raise ValueError(f'Unsupported image extension: {url}')
    return '.jpg' if extension == '.jpeg' else extension


def build_migration_plan(
    catalog: list[dict], settings: PromptAssetSettings
) -> list[PromptAssetPlan]:
    plans: list[PromptAssetPlan] = []
    id_occurrences: dict[str, int] = {}
    object_keys: set[str] = set()
    for item in catalog:
        item_id = str(item.get('id', '')).strip()
        if not re.fullmatch(r'[a-z0-9][a-z0-9-]{1,99}', item_id):
            raise ValueError(f'Invalid catalog item ID: {item_id}')
        occurrence = id_occurrences.get(item_id, 0) + 1
        id_occurrences[item_id] = occurrence
        source_url = str(
            item.get('sourceImageUrl') or item.get('imageUrl', '')
        ).strip()
        extension = _source_extension(source_url)
        object_stem = item_id if occurrence == 1 else f'{item_id}-{occurrence}'
        object_key = f'{settings.prefix}/{object_stem}{extension}'
        if object_key in object_keys:
            raise ValueError(f'Duplicate OSS object key: {object_key}')
        object_keys.add(object_key)
        public_url = (
            f'{settings.public_base_url}/{quote(object_key, safe="/")}'
        )
        plans.append(
            PromptAssetPlan(
                item_id=item_id,
                source_url=source_url,
                object_key=object_key,
                public_url=public_url,
                content_type=mimetypes.types_map.get(extension, 'image/jpeg'),
            )
        )
    return plans


def rewrite_catalog(
    catalog: list[dict], plans: list[PromptAssetPlan]
) -> list[dict]:
    rewritten = copy.deepcopy(catalog)
    if len(rewritten) != len(plans):
        raise ValueError('The completed upload plan does not match the catalog.')
    for item, plan in zip(rewritten, plans, strict=True):
        source_url = str(
            item.get('sourceImageUrl') or item.get('imageUrl', '')
        ).strip()
        if (
            str(item.get('id', '')).strip() != plan.item_id
            or source_url != plan.source_url
        ):
            raise ValueError('The completed upload plan does not match the catalog.')
        item['sourceImageUrl'] = plan.source_url
        item['imageUrl'] = plan.public_url
    return rewritten


def _download(session, plan: PromptAssetPlan) -> bytes:
    response = session.get(
        plan.source_url,
        timeout=(10, 90),
        stream=True,
        allow_redirects=False,
        headers={'User-Agent': 'LinoRoute-prompt-asset-migrator/1.0'},
    )
    response.raise_for_status()
    content_type = response.headers.get('content-type', '').split(';', 1)[0]
    if content_type not in {'image/jpeg', 'image/png', 'image/webp'}:
        raise ValueError(f'Unexpected content type for {plan.item_id}: {content_type}')
    chunks: list[bytes] = []
    size = 0
    for chunk in response.iter_content(128 * 1024):
        if not chunk:
            continue
        size += len(chunk)
        if size > MAX_IMAGE_BYTES:
            raise ValueError(f'Image exceeds 20 MiB: {plan.item_id}')
        chunks.append(chunk)
    if not size:
        raise ValueError(f'Empty image response: {plan.item_id}')
    return b''.join(chunks)


def migrate(settings: PromptAssetSettings, plans: list[PromptAssetPlan]) -> None:
    import oss2
    import requests

    bucket = oss2.Bucket(
        oss2.Auth(settings.access_key_id, settings.access_key_secret),
        settings.endpoint,
        settings.bucket,
        region=settings.region or None,
    )
    session = requests.Session()
    for index, plan in enumerate(plans, start=1):
        if bucket.object_exists(plan.object_key):
            print(f'[{index}/{len(plans)}] exists {plan.object_key}')
            continue
        body = _download(session, plan)
        result = bucket.put_object(
            plan.object_key,
            body,
            headers={
                'Content-Type': plan.content_type,
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        )
        if result.status != 200:
            raise RuntimeError(
                f'OSS upload failed for {plan.item_id}: HTTP {result.status}'
            )
        print(f'[{index}/{len(plans)}] uploaded {plan.object_key}')


def _write_json_atomic(path: Path, value) -> None:
    temporary = path.with_suffix(f'{path.suffix}.tmp')
    temporary.write_text(
        f'{json.dumps(value, ensure_ascii=False, indent=2)}\n', encoding='utf-8'
    )
    temporary.replace(path)


def main() -> None:
    project_root = Path(__file__).resolve().parents[2]
    parser = argparse.ArgumentParser(
        description='Migrate public image-prompt previews to dedicated long-lived OSS.'
    )
    parser.add_argument(
        '--env',
        type=Path,
        default=project_root / '.env.studio-prompt-oss.local',
    )
    parser.add_argument(
        '--catalog',
        type=Path,
        default=(
            project_root / 'src/studio-preview/image-prompt-catalog.json'
        ),
    )
    parser.add_argument('--dry-run', action='store_true')
    arguments = parser.parse_args()

    settings = load_settings(
        arguments.env, require_credentials=not arguments.dry_run
    )
    ensure_dedicated_bucket(
        settings, read_env(project_root / '.env.studio-oss.local')
    )
    catalog = json.loads(arguments.catalog.read_text(encoding='utf-8'))
    plans = build_migration_plan(catalog, settings)
    if arguments.dry_run:
        print(
            f'Dry run: {len(plans)} images -> '
            f'{settings.bucket}/{settings.prefix}/'
        )
        return

    migrate(settings, plans)
    rewritten = rewrite_catalog(catalog, plans)
    _write_json_atomic(arguments.catalog, rewritten)
    print(f'Updated {arguments.catalog} with {len(plans)} OSS preview URLs.')


if __name__ == '__main__':
    main()
