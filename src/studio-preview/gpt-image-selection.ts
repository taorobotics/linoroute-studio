/* Copyright (C) 2023-2026 QuantumNous
SPDX-License-Identifier: AGPL-3.0-or-later */
export interface ImageModelOption {
  id: string
  label: string
  productionCandidateId?: string | null
}

export type SelectionMode = 'demo' | 'live'
export const GPT_IMAGE_FAMILIES = {
  gpt2: { id: 'gpt-image-2-family', label: 'GPT-image-2' },
  gpt25: { id: 'gpt-image-2.5-family', label: 'GPT-image-2.5' },
} as const
export type GptImageFamily = keyof typeof GPT_IMAGE_FAMILIES

// Explicit gateway aliases only. Never infer a billing mode from an unknown model suffix.
export const GPT2_OPTIONS = [
  { apiId: 'gpt-image-2-c', billing: 'Per request' },
  { apiId: 'gpt-image-2', billing: 'By tokens' },
] as const
export const GPT25_OPTIONS = [
  { apiId: 'gpt-image-2.5-flare-c', version: 'Flare', billing: 'Per request' },
  {
    apiId: 'gpt-image-2.5-sunburst-c',
    version: 'Sunburst',
    billing: 'Per request',
  },
  { apiId: 'gpt-image-2.5-flare', version: 'Flare', billing: 'By tokens' },
  {
    apiId: 'gpt-image-2.5-sunburst',
    version: 'Sunburst',
    billing: 'By tokens',
  },
] as const

const GPT_IMAGE_OPTIONS = [
  ...GPT2_OPTIONS.map((option) => ({
    ...option,
    family: 'gpt2' as const,
    version: null,
  })),
  ...GPT25_OPTIONS.map((option) => ({ ...option, family: 'gpt25' as const })),
]

export function gptImageOption(model?: ImageModelOption) {
  return GPT_IMAGE_OPTIONS.find(
    (option) => option.apiId === (model?.productionCandidateId ?? model?.id)
  )
}

export function readGptImagePreference(
  mode: SelectionMode,
  family: GptImageFamily
): string | undefined {
  try {
    const saved = localStorage.getItem(`linoroute-studio:${family}:${mode}`)
    return GPT_IMAGE_OPTIONS.find(
      (option) => option.family === family && option.apiId === saved
    )?.apiId
  } catch {
    return undefined
  }
}

export function rememberGptImagePreference(
  model: ImageModelOption,
  mode: SelectionMode
): void {
  const choice = gptImageOption(model)
  if (!choice) return
  try {
    // Only the public model ID is saved, never the key, prompt or session.
    localStorage.setItem(
      `linoroute-studio:${choice.family}:${mode}`,
      choice.apiId
    )
    localStorage.setItem(`linoroute-studio:image-family:${mode}`, choice.family)
  } catch {
    // Restricted browser storage must not prevent selecting or generating.
  }
}

export function preferredGptImageModel(
  models: readonly ImageModelOption[],
  familyId: GptImageFamily,
  preferred?: string
): ImageModelOption | undefined {
  const family = models.filter(
    (model) => gptImageOption(model)?.family === familyId
  )
  return (
    family.find((model) => gptImageOption(model)?.apiId === preferred) ??
    family.find((model) => gptImageOption(model)?.billing === 'Per request') ??
    family[0]
  )
}

export function initialImageModelId(
  models: readonly ImageModelOption[],
  mode: SelectionMode
): string {
  // Preserve preferences saved before GPT-image-2 gained billing selection.
  let family = readGptImagePreference(mode, 'gpt25')
    ? ('gpt25' as const)
    : gptImageOption(models[0])?.family
  try {
    const last = localStorage.getItem(`linoroute-studio:image-family:${mode}`)
    if (last === 'gpt2' || last === 'gpt25') family = last
  } catch {
    // Selecting a model still works without persistent browser storage.
  }
  if (family) {
    const preferred = preferredGptImageModel(
      models,
      family,
      readGptImagePreference(mode, family)
    )
    if (preferred) return preferred.id
  }
  const firstFamily = gptImageOption(models[0])?.family
  if (firstFamily) return preferredGptImageModel(models, firstFamily)?.id ?? ''
  return models[0]?.id ?? ''
}
