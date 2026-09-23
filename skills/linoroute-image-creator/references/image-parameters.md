# Image parameter guidance

The connector payload should keep these concepts separate:

- `prompt`: the visual instruction, required for every request.
- `model`: an explicit LinoRoute model ID or `auto`.
- `aspect_ratio`: for example `1:1`, `3:2`, `2:3`, `16:9`, or `9:16` when supported.
- `size`: the model-supported pixel size such as `1024x1024`, `1536x1024`, `2048x1152`, or a documented `2K/4K` alias.
- `quality`: only values documented for the resolved model.
- `format`: `png`, `jpeg`, or `webp` only when supported.
- `background`: `auto`, opaque, or transparent only when supported.
- `n`: default `1`.
- `image` / `reference_files`: local files or connector-accepted file references for edits.

If the user says “图片大小”, determine whether they mean output dimensions or upload byte limit. Ask only if the distinction changes the request.
