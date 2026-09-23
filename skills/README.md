# LinoRoute Skills

These open-source Skills provide natural-language routing and parameter guidance for LinoRoute image and video generation. They contain no API keys, OSS credentials, user data, or bundled model output.

## Packages

- `linoroute-studio`: the all-in-one entry point and automatic model router.
- `linoroute-image-creator`: text-to-image and image-to-image workflows.
- `linoroute-video-creator`: text-to-video and image-to-video workflows.
- `linoroute-prompt-engineer`: prompt writing and optimization without changing user intent.

Each Skill is self-contained and can be published separately. WorkBuddy release ZIP files contain only `SKILL.md` and the Skill's `references/` directory; Codex-specific UI metadata under `agents/` remains in the GitHub source tree.

## Authentication and billing

Real generation requires a user-supplied LinoRoute API key or a short-lived scoped token configured through the host's secure secret mechanism. Do not paste keys into prompts, commit them to GitHub, or bundle them in a release ZIP. The external LinoRoute Connector/MCP is responsible for authentication, balance checks, API calls, polling, and results.

## Packaging

Create one ZIP per Skill with `SKILL.md` at the archive root and include its `references/` directory. Exclude `.git`, `agents/`, local environment files, screenshots, generated media, logs, and dependencies. Verify each archive is under the marketplace's 3 MB limit before upload.
