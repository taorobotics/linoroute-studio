# Deploy the remote Connector

The Connector is the small server between a WorkBuddy Skill and the LinoRoute
API. WorkBuddy sends the caller's API key in an `Authorization` header; the
server forwards that key to LinoRoute for the single request and does not store
it.

## 1. Give it an HTTPS hostname

Use a dedicated hostname such as `mcp.linoroute.com`. The local process listens
on port `8787`; it should not be exposed directly to the public Internet.

Example with Docker:

```sh
docker build -t linoroute-mcp ./connector/linoroute-mcp
docker run -d --restart unless-stopped --name linoroute-mcp \
  -p 127.0.0.1:8787:8787 \
  -e HOST=0.0.0.0 \
  -e MCP_ALLOWED_ORIGINS=https://open.workbuddy.cn \
  -e MEDIA_ALLOWED_HOSTS=your-bucket.oss-cn-guangzhou.aliyuncs.com \
  linoroute-mcp
```

Put a TLS reverse proxy in front of it. For example, Caddy can terminate TLS
and proxy `https://mcp.linoroute.com/mcp` to `127.0.0.1:8787/mcp`:

```text
mcp.linoroute.com {
  reverse_proxy 127.0.0.1:8787
}
```

Do not put a LinoRoute key in the Docker image, `.env.example`, reverse-proxy
configuration, or GitHub. The upstream base URL is `https://linoroute.com`
without `/v1`.

## 2. Package it for WorkBuddy

Submit the directory containing these files:

```text
connector-meta.json
mcp.json
token-schema.json
icon.svg
```

The included `mcp.json` uses the WorkBuddy user-token mode:

```json
{
  "type": "streamableHttp",
  "url": "${MCP_URL}",
  "headers": { "Authorization": "Bearer ${LINOROUTE_API_KEY}" }
}
```

The user fills in the HTTPS MCP URL and their own API Key once. WorkBuddy
stores those values locally and injects them when the Skill calls a tool. The
Skill never sees the raw key.

## 3. Test before submission

```sh
npm install
npm test
npm start
```

Check `GET /healthz`, then connect WorkBuddy to the `/mcp` URL and call
`linoroute_list_models` with a test account that has only a small balance.
After that, test one image generation, one image edit using an HTTPS OSS URL,
and one video task followed by `linoroute_get_video_task`.

## Important operational limits

- Configure rate limiting and request-size limits at the reverse proxy.
- Keep `MEDIA_ALLOWED_HOSTS` restricted to your OSS/CDN hostname in production.
- Never log `Authorization`, request bodies containing prompts, or returned
  base64 image data.
- Use a separate test LinoRoute key for connector review; do not use a master
  or administrator key.
