---
name: linoroute-video-creator
description: Create videos through LinoRoute with model-aware text-to-video, image-to-video, duration, aspect ratio, resolution, and task polling.
---

# LinoRoute Video Creator

Use this skill for video generation through the configured LinoRoute Connector. Model families may include Seedance, MiniMax H3, Kling, Veo, and other models exposed by the user's account; exact IDs and supported parameters come from the live provider matrix.

## Resolve the request

- No reference file means text-to-video.
- A supplied image means image-to-video unless the user explicitly asks to use it only as inspiration.
- Honor an explicit model. Otherwise route by the user's priority and the reference type.
- Parse aspect ratio, resolution, duration, audio, and reference-frame instructions. Do not invent support for a model.
- Use the model's documented defaults for missing values. Because video is more expensive, show a preflight summary when duration, resolution, or cost is uncertain.

## Run and poll

Send a structured request to the connector. Treat generation as asynchronous unless the connector explicitly returns a completed result. Poll with a bounded backoff and a clear timeout; return the task ID and recovery guidance on timeout. Never create duplicate tasks simply because a poll was slow.

## Return

Report the resolved model, ratio, resolution, duration, and audio choice. Return a playable URL or OSS result when complete. Keep API keys, provider credentials, and signed storage secrets out of prompts, logs, and generated files.

Read [video-parameters.md](references/video-parameters.md) before constructing a connector call.
