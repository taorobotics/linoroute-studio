---
name: linoroute-image-creator
description: Create or edit images through LinoRoute with model-aware sizes, aspect ratios, quality, formats, backgrounds, and reference-image handling.
---

# LinoRoute Image Creator

Use this skill for image generation and image editing. Supported model families include the configured GPT-image variants and Nano Banana Pro; use the live LinoRoute model matrix as the authority for exact model IDs and options.

## Resolve the request

- No reference file means text-to-image.
- One or more reference files means image-to-image or reference-guided generation; preserve the user's intent and pass files to the connector rather than asking them to paste a URL.
- Honor an explicit model. Otherwise choose by speed, quality, price, or reference-image support and disclose the choice.
- Parse “横版/竖版/正方形” into an aspect ratio and “1K/2K/4K” into a supported output size. Do not confuse output dimensions with upload file size.
- Default to one image. Apply the model's documented quality, format, background, and size defaults when the user did not specify them.

## Clarify only when needed

Ask one concise question if the requested aspect ratio, resolution, or quality changes cost materially, or if the selected model cannot support the combination. Otherwise show a short preflight summary and generate.

## Return

Report the resolved model and image settings, then return the generated image URL or OSS result. Explain validation, balance, or safety failures in plain language; do not retry a rejected request with a different model unless the user approves the change.

Read [image-parameters.md](references/image-parameters.md) before constructing a connector call.
