# Provider adapters

Studio is a client for OpenAI-compatible image and video APIs. The bundled
development relay defaults to `https://linoroute.com`, but the upstream URL is
configurable through `STUDIO_API_UPSTREAM`.

The relay forwards the API key supplied by the user for the current request.
It does not contain a service-wide key and must not be changed to do so.

For another provider:

1. Set `STUDIO_API_UPSTREAM` to the provider's API origin, without `/v1` or a
   trailing slash. The relay appends each full API path.
2. Confirm that its routes and response shapes match the capability map in
   `src/studio-preview/live-relay.ts` and `live-client.ts`.
3. Add a focused contract test with mocked responses.
4. Document the provider's model names, image/video capabilities and terms.

OSS storage is optional. The browser calls `/studio-storage/v1/uploads`; the
local relay forwards it to `STUDIO_STORAGE_SIGNER`. The included Python signer
returns signed upload/read URLs. OSS access keys stay on that server. Its
token validation currently uses LinoRoute's `/v1/models`; when changing
providers, update `validate_lino_token` in `deploy/studio/oss_signer.py` too.

The development relay only accepts `http://127.0.0.1:4178`. Production uses
the separate Nginx examples; edit the host, origin allowlist and upstream there
for your deployment. See [deployment instructions](../deploy/studio/README.md).
