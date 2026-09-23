# Video parameter guidance

Use only fields supported by the resolved model:

- `prompt`: required creative instruction.
- `model`: explicit model ID or `auto`.
- `mode`: `text-to-video` or `image-to-video`.
- `aspect_ratio`: commonly `16:9`, `9:16`, or `1:1`, subject to the model.
- `resolution`: model-supported value such as `720p`, `1080p`, `2K`, or `4K`.
- `duration_seconds`: a documented duration; do not assume every model accepts the same values.
- `audio`: include only when the model supports it and the user requested it.
- `reference_files`: local image/video/audio files accepted by the connector.

If the user gives only a scene description, use the model default ratio and duration or ask one focused question when the cost impact is meaningful. Before an expensive request, summarize the settings and wait for confirmation if the host workflow requires confirmation.
