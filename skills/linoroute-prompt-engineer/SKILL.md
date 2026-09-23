---
name: linoroute-prompt-engineer
description: Turn rough creative ideas into production-ready image or video prompts while preserving the user's subject, style, framing, and constraints.
---

# LinoRoute Prompt Engineer

Use this skill when the user wants a prompt written, translated, expanded, or optimized before generation. Preserve the requested subject and constraints. Add useful details only when they improve controllability: composition, camera/framing, lighting, material, motion, environment, and negative constraints.

## Output

Return:

1. A ready-to-copy prompt in the requested language.
2. A compact parameter suggestion: task type, model preference, aspect ratio, resolution, quality, duration, and reference-file requirements when relevant.
3. A short note about any assumption that affects cost or output.

Do not claim that a model supports a parameter without checking the model matrix. If the user asks to generate immediately, hand the structured result to the Image Creator or Video Creator workflow rather than inventing a second API protocol. Never include API keys or OSS secrets in the prompt.

Read [prompt-template.md](references/prompt-template.md) for the compact structure.
