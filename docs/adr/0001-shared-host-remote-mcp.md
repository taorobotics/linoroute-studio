# ADR-0001: Host the remote MCP Connector beside Studio

- Status: proposed
- Date: 2026-09-23

## Context

The WorkBuddy Skills need a remote MCP endpoint, while the existing Studio
site is already served by Nginx on the LinoRoute host. The Connector must use
each caller's API key, must not expose a provider master key, and must not
change the existing Studio routes.

## Decision

Run the Connector as a separate Node service bound only to
`127.0.0.1:8787`. Add a dedicated HTTPS virtual host such as
`mcp.linoroute.com` in Nginx and proxy only `/mcp` to that service. Keep the
Studio virtual host and its existing upstreams unchanged.

The DNS record will be created in Spaceship:

```text
Host: mcp
Type: A
Value: the same public server IP used by studio.linoroute.com
TTL: 300 or automatic
```

The Connector will receive `Authorization: Bearer <user key>` over HTTPS,
forward it for that request, and never write it to application logs or a
shared environment file.

## Alternatives considered

1. **Use a path on Studio** (`studio.linoroute.com/mcp`): possible, but it
   couples the MCP process to the website deployment and makes independent
   rollback harder.
2. **Use a separate server**: clean isolation, but unnecessary cost and
   another host to patch and monitor at the current expected load.
3. **Use a CNAME only**: DNS can point the name to Studio, but Nginx still
   needs a separate host rule and certificate for the new hostname.

## Consequences

- Existing Studio traffic remains isolated from MCP traffic at the process and
  Nginx route level.
- The host needs one additional Node runtime/service and one TLS certificate.
- WorkBuddy can use the user-token Connector mode with a stable HTTPS URL.
- A reverse-proxy rate limit, no credential logging, and an OSS host allowlist
  are required before public use.

## Rollback

Stop and disable the MCP systemd service, remove the dedicated Nginx server
block, and remove the `mcp` DNS record. The Studio server block is untouched.
