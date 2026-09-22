# Contributing

Issues and pull requests are welcome for the open-source Studio client.

Before opening a pull request:

1. Keep the change focused and explain the user-visible behavior.
2. Do not include API keys, OSS secrets, private user data or production URLs
   that are not already public.
3. Run `bun run typecheck`, `bun run test` and `bun run build` locally.
4. Preserve upstream copyright headers and third-party license notices.
5. Add or update a regression test for behavior changes.

For new providers, prefer a small adapter with explicit capability metadata.
Do not add a provider-specific master key to the browser bundle.
