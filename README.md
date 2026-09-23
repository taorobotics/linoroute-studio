# LinoRoute Studio

An open-source creative workspace for image and video generation. Studio
supports text-to-image, image-to-image, text-to-video, image-to-video, prompt
libraries and a small local works archive in one compact interface.

The default documentation language is English. Translations:

[简体中文](README.zh-CN.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md) · [Français](README.fr.md)

Latest changes: [Changelog / 更新日志](CHANGELOG.md).

## Try it

- **Live demo:** [studio.linoroute.com](https://studio.linoroute.com)
- **Recommended compatible API:** [LinoRoute](https://linoroute.com)
- **API documentation:** [ninoroute.com/tutorials](https://ninoroute.com/tutorials/00-intro)

You can explore the interface and prompt libraries without a key. Real
generation requires an API key supplied by the user. LinoRoute is the default
provider; other providers need matching model names, routes and response
formats. Changing the upstream URL alone does not make every API compatible.

## Skills

The repository also includes open-source Skills for agent clients and Skill
marketplaces:

- [`LinoRoute Studio`](skills/linoroute-studio/SKILL.md) — natural-language routing for image and video requests.
- [`LinoRoute Image Creator`](skills/linoroute-image-creator/SKILL.md) — image generation and editing with model-aware parameters.
- [`LinoRoute Video Creator`](skills/linoroute-video-creator/SKILL.md) — text-to-video and image-to-video workflows.
- [`LinoRoute Prompt Engineer`](skills/linoroute-prompt-engineer/SKILL.md) — prompt drafting and optimization.

The Skills never contain API keys or OSS credentials. A host Connector/MCP
must provide secure user authentication and call the configured LinoRoute API.
WorkBuddy-ready ZIP packages can be built with
[`build-workbuddy-packages.ps1`](scripts/build-workbuddy-packages.ps1); each
package keeps `SKILL.md` at its archive root and is checked against the 3 MB
upload limit.

## Remote Connector / MCP

For WorkBuddy, the runtime Connector is in
[`connector/linoroute-mcp`](connector/linoroute-mcp/). It exposes image,
image-edit, text-to-video and image-to-video tools over HTTPS Streamable HTTP.
The Connector forwards each user's own LinoRoute API key for that request; no
provider master key is bundled in the repository. See its
[`DEPLOYMENT.md`](connector/linoroute-mcp/DEPLOYMENT.md) for Docker, HTTPS and
WorkBuddy `token-schema.json` setup. The upload archive is generated with
[`build-workbuddy-connector.ps1`](scripts/build-workbuddy-connector.ps1).

## Screenshots

Desktop UI examples. Preview media are demonstration assets, not
benchmarks or verified outputs of the model shown in a screenshot.

![Image workspace](screenshots/image-workspace.png)

![Video workspace](screenshots/video-workspace.png)

![GPT-image-2.5 workflow](screenshots/gpt-image-2-5.png)

![Image prompt library](screenshots/image-prompt-library.png)

![Video prompt library](screenshots/video-prompt-library.png)

## Features

- Image creation with GPT-image variants and reference images
- Video creation with Seedance, MiniMax, Kling, Veo, Gemini and other models
- Text-to-image, image-to-image, text-to-video and image-to-video flows
- Model-specific aspect ratio, resolution, quality and duration controls
- Prompt libraries for images and videos
- Local works and local file management in the browser
- Optional signed OSS uploads for temporary references and results, with a
  separate bucket for long-lived prompt previews
- English-first UI with Chinese translations; six documentation languages
- Provider relay with no server-side master API key

## Privacy and key handling

Studio follows a bring-your-own-key model. Your API key is entered by you and
sent only with the request that needs it. Do not commit keys to this repository,
place them in `VITE_*`/`NEXT_PUBLIC_*` variables, or paste them into issues.

The key is remembered in this tab's `sessionStorage`, so refreshing the page
keeps it. This is browser storage, not a cookie or a cloud account. Local works
use IndexedDB and do not sync across devices. Disconnect on shared computers;
browser session restoration can sometimes restore tab storage as well.

The optional OSS flow uses short-lived signed URLs. OSS access keys belong on
the server-side signer and are never part of the browser bundle. See
[`SECURITY.md`](SECURITY.md) and [`docs/provider-adapters.md`](docs/provider-adapters.md).

## Local development

Requirements: [Bun](https://bun.sh/) 1.4.2 and Node.js 24+. Optional OSS services
require Python 3.11+.

```bash
bun install
cp .env.example .env.local
bun run dev
```

Open `http://127.0.0.1:4178`. The default development upstream is
`https://linoroute.com`; set `STUDIO_API_UPSTREAM` to another compatible API
origin (without `/v1` or a trailing slash) when needed. Never put an API key in
`.env.local` for the browser build.

Useful checks:

```bash
bun run typecheck
bun run test
bun run build
```

## Deployment

`bun run build` produces `dist-studio-preview/`. Static hosting supports the
interface; real generation also needs the API relay. This repository includes
the local relay, an Nginx production example, and the optional Python OSS signer.
See [`deploy/studio/README.md`](deploy/studio/README.md) for configuration and
the exact server files. Nginx configuration is independent of `.env.local`.

For OSS storage, configure the server-side signer that returns a five-minute
upload URL and a seven-day read URL. Bucket lifecycle deletion is configured
separately in OSS. Keep `STUDIO_OSS_ACCESS_KEY_ID` and
`STUDIO_OSS_ACCESS_KEY_SECRET` outside GitHub and outside all public builds.

## Recommended API provider

The included adapters target LinoRoute's API routes. To use the hosted service,
visit [LinoRoute](https://linoroute.com): it provides the models, pricing and
account console used by the hosted demo. You can configure your own compatible
provider through `STUDIO_API_UPSTREAM` and adapt its contracts as documented in
[`docs/provider-adapters.md`](docs/provider-adapters.md).

## License and attribution

This project is available under the [GNU Affero General Public License v3 or
later](LICENSE). Parts of the UI are adapted from the new-api web client by
QuantumNous; upstream copyright headers and license obligations remain in
place. See [`NOTICE`](NOTICE) for brand, provider-logo and prompt-asset notes.

The LinoRoute name and logo identify the hosted service and are not permission
to imply endorsement of a fork.
