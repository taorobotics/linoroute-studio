# Self-hosting Studio

The frontend, request relay, OSS signer and prompt-asset migration utility are
included. No hosted credentials, customer records or private deployment files
are required or included. API usage and storage can incur provider charges.

## Local development

Run `bun install --frozen-lockfile` and `bun run dev` at the repository root.
Use `http://127.0.0.1:4178` (the relay deliberately checks that exact origin).
Enter your own API key in the UI for real requests. The included adapters target
LinoRoute; see [provider adapters](../../docs/provider-adapters.md) for changes.

## Optional private OSS storage

Use Python 3.11+ in a virtual environment. From the repository root:

```sh
python -m venv .venv
# Linux/macOS: source .venv/bin/activate
# PowerShell: .\.venv\Scripts\Activate.ps1
python -m pip install -r deploy/studio/requirements.txt
cp deploy/studio/oss.env.example .env.studio-oss.local
python deploy/studio/oss_signer.py --env .env.studio-oss.local --port 4181
```

Fill the local file with your private bucket and least-privilege RAM credentials
before starting the signer. In PowerShell, `Copy-Item` can replace `cp`.
The browser never receives the long-lived OSS credentials. The signer validates
the user's API key using `https://linoroute.com/v1/models` before issuing URLs.

- Keep the bucket private. Allow OSS CORS for your Studio origin, `PUT`, `GET`
  and `HEAD`, and the request headers your browser sends (including Content-Type).
- Upload URLs expire after five minutes; read URLs after seven days. Configure
  lifecycle deletion for the `studio/` prefix separately in the OSS console.
  A URL expiration is not a bucket deletion rule.
- History stays in the browser. OSS stores media, not account history or a
  cross-device user database.

## Long-lived prompt preview images

`prompt_assets.py` migrates the catalog's public source images to a separate
bucket. Copy `prompt-oss.env.example` to `.env.studio-prompt-oss.local`, fill it,
and configure the public base URL for your deployment. Do not apply the upload
bucket's seven-day deletion rule to these previews.

For a private prompt bucket, use
`https://YOUR_STUDIO_DOMAIN/studio-prompt-assets` as the public base URL. Add the
`STUDIO_PROMPT_OSS_*` values to the signer's environment as well; the signer will
redirect permitted preview requests to one-hour signed read URLs. In production
the supplied systemd unit reads both environment files.

```sh
python deploy/studio/prompt_assets.py --dry-run
# This next command uploads files and updates the catalog:
python deploy/studio/prompt_assets.py
```

The included catalog currently references public previews on the hosted Studio.
Forks should use their own hosting or the original source URLs for independence.
Check each source's attribution and media terms before redistribution.

## Production example: Nginx + optional signer

These are templates from the hosted layout, not an automatic installer. Adapt
them to your server before enabling them:

1. Build with `bun run build`. Place the contents of `dist-studio-preview/` in
   your static web root (the example uses `/opt/linoroute-studio/current/site`).
   Place `studio-error.json` in that web root as well.
2. Put `nginx-site.conf` and `nginx-security.conf` in
   `/etc/nginx/linoroute-studio/`. Include `nginx-globals.conf` once in Nginx's
   `http` context, and load the HTTP/HTTPS server templates using your normal
   sites configuration. Do not duplicate an existing default server.
3. Replace `studio.linoroute.com` with your domain in the Nginx files and in
   `ALLOWED_ORIGINS` in `oss_signer.py`. Set certificate paths to certificates
   issued for your domain. Review the static root, DNS resolver, upstream host,
   CA bundle path and rate limits for your environment. `.env.local` does not
   configure these Nginx files.
4. For OSS, put credentials in `/etc/linoroute-studio/oss.env` (and optionally
   `prompt-oss.env`) with mode `600`. Create a Python environment, install
   `requirements.txt`, and adapt the paths and service user in
   `linoroute-studio-oss.service`. Its signer listens only on loopback. Use the
   service account permissions supported by your deployment.
5. Run `nginx -t`, then reload through your server's service manager. Check
   `/healthz`, the page, Key configuration, and uploads on your own domain.

The production relay forwards the user's supplied key to allowlisted endpoints.
It does not use a shared master key. Preserve HTTPS, origin checks, request
limits, no-store responses and credential-free logs when adapting it.

## Tests without real credentials

```sh
python -m unittest discover -s deploy/studio/tests -p 'test_*.py'
```

These tests use fake signers and tokens; they do not upload to OSS or incur API
usage. Production TLS, DNS and bucket policies must be checked on your server.
