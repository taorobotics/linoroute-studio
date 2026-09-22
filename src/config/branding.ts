/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This file is adapted from the new-api web client. See LICENSE and NOTICE.
*/

export const SITE_BRAND = {
  systemName: 'LinoRoute Studio',
  logo: '/landing/lino-mark-v2.svg',
} as const

export function resolveSiteBrand(
  brand: { systemName?: string; logo?: string } = {}
) {
  return {
    systemName: brand.systemName?.trim() || SITE_BRAND.systemName,
    logo: brand.logo?.trim() || SITE_BRAND.logo,
  }
}
