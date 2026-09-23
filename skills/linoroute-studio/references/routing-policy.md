# LinoRoute model routing policy

## Explicit choice wins

If the user names a model, preserve it exactly and validate the requested options against that model. Examples include `gpt-image-2`, `gpt-image-2.5`, `nano-banana-pro`, `seedance-2.5`, `minimax-h3`, and `kling-video-3`.

## Otherwise route by intent

- Quality/detail priority: choose a compatible high-quality model and disclose that it may cost more.
- Speed priority: choose a fast variant when one is available.
- Price priority: choose the lowest-cost compatible model.
- Reference-image or image-to-video request: choose only a model that accepts the supplied reference type.
- Unsupported combination: explain the conflict and offer the nearest supported option; never silently drop a requested constraint.

When two models remain equally suitable, prefer the user's current model selection in the host UI. If there is no current selection, use the LinoRoute service default and show it in the preflight summary.

## Minimal clarification

Ask one question only when needed, for example: “你更在意速度、质量还是价格？” Do not ask for every optional field. If a request is low-cost and compatible, use documented defaults and proceed.
