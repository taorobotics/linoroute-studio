---
name: linoroute-studio
description: Route natural-language image and video requests through LinoRoute, choosing a compatible model and asking only for decisions that materially affect cost or output.
---

# LinoRoute Studio

Use this skill as the general entry point for LinoRoute image and video generation. It translates a user's natural-language request into a validated, structured generation request; it does not invent unsupported model parameters.

## Workflow

1. Detect the task: text-to-image, image-to-image, text-to-video, or image-to-video.
2. Respect an explicit model name. If none is given, route by the user's priority (quality, speed, price, or reference-image support) using the capability matrix in [routing-policy.md](references/routing-policy.md).
3. Extract requested parameters such as aspect ratio, resolution, duration, quality, format, background, count, and reference files.
4. Apply documented defaults only when the request is unambiguous. Use one image by default. For video, use the selected model's documented defaults for duration and resolution.
5. Ask at most one focused question when a missing choice materially changes price, composition, or compatibility. For high-cost 2K/4K or long-video requests, show a preflight summary before calling the API.
6. Call the configured LinoRoute Connector/MCP with structured parameters. Never put an API key, OSS secret, or upstream provider credential in the prompt or package.
7. Return the resolved model, parameters, estimated cost when available, and the result URL or task status. If the account is not configured or lacks balance, provide the LinoRoute setup message instead of retrying endlessly.

## Safety and billing

- A user must supply their own LinoRoute API key through the host's secure configuration, or use a short-lived scoped token issued by the service.
- Do not silently switch to a more expensive model or resolution.
- Do not claim that a Skill invocation is a paid API call; the LinoRoute Connector is the billing boundary.
- Local reference files should be passed to the connector's file input. Ask for a URL only when the connector cannot accept files.

Read [parameter-contract.md](references/parameter-contract.md) when constructing the connector payload and [routing-policy.md](references/routing-policy.md) when the user did not choose a model.
