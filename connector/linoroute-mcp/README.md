# LinoRoute Remote MCP Connector

This service exposes LinoRoute image and video generation as a remote MCP
server over Streamable HTTP. It is the runtime layer used by the LinoRoute
Skills in `../../skills/`.

The connector uses the caller's `Authorization: Bearer <LinoRoute API key>`
for each request. It does not store user keys, use a shared provider key, or
write credentials to logs. The upstream base URL defaults to
`https://linoroute.com`; configure an origin without the `/v1` suffix.

## Tools

- `linoroute_list_models` — list models available to the supplied key.
- `linoroute_generate_image` — create an image and optionally edit from HTTPS reference URLs.
- `linoroute_generate_video` — create text-to-video or image-to-video tasks.
- `linoroute_get_video_task` — poll a video task without creating a duplicate task.

The tools return structured JSON with the resolved model, request parameters,
task IDs, and safe media URLs. The connector validates model-specific options
before sending a paid request and returns upstream status codes as safe error
messages.

## Local run

```sh
npm install
npm start
```

The MCP endpoint is `http://127.0.0.1:8787/mcp` by default. A hosted WorkBuddy
Connector must use HTTPS, a stable `/mcp` endpoint, and the platform's user-token
configuration. Put a TLS reverse proxy in front of this process in production.

## WorkBuddy setup

The directory already contains the four WorkBuddy Connector files:
`connector-meta.json`, `mcp.json`, `token-schema.json`, and `icon.svg`.
To create the upload archive from the repository root, run
`powershell -ExecutionPolicy Bypass -File scripts/build-workbuddy-connector.ps1`.

1. Deploy this service at an HTTPS hostname you control.
2. In `token-schema.json`, set the default `MCP_URL` to that hostname.
3. Submit the Connector package to WorkBuddy. It uses `auth_mode: "token"`
   and asks each user for their own LinoRoute API key.
4. Install one of the LinoRoute Skills and select this Connector when the
   platform asks for its dependency.
5. Test `linoroute_list_models` with a test account that has a small balance.

WorkBuddy injects `${LINOROUTE_API_KEY}` into the `Authorization: Bearer ...`
header and stores the value on the user's device. `${MCP_URL}` lets the same
package point at a public deployment or a user's private deployment without
hard-coding a host.

The endpoint must not be published with a server-side master key. If a host
cannot send a user token to the Connector, use LinoRoute's own login and issue
short-lived scoped tokens from a separate authentication service.

## Security notes

- Keep `.env` files, TLS keys, and provider credentials outside GitHub.
- Reference media must use HTTPS. Configure `MEDIA_ALLOWED_HOSTS` for a
  production allowlist, preferably your OSS/CDN hostname.
- Redirects are disabled and fetched media is size-limited to reduce SSRF and
  resource exhaustion risk.
- Put rate limiting, request timeouts, and access logs without Authorization
  headers at the reverse proxy.
