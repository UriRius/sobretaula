import type { Database } from '@/types/database'

export type GroupColor = Database['public']['Enums']['group_color']

// Paleta tancada (l'enum `group_color` de la BD). Els valors visuals viuen a
// globals.css (--group-*), amb versió clara i fosca.
export const GROUP_COLORS: Record<GroupColor, { label: string; cssVar: string }> = {
  tomaquet: { label: 'Tomàquet', cssVar: 'var(--group-tomaquet)' },
  taronja: { label: 'Taronja', cssVar: 'var(--group-taronja)' },
  mostassa: { label: 'Mostassa', cssVar: 'var(--group-mostassa)' },
  oliva: { label: 'Oliva', cssVar: 'var(--group-oliva)' },
  salvia: { label: 'Sàlvia', cssVar: 'var(--group-salvia)' },
  blau: { label: 'Blau', cssVar: 'var(--group-blau)' },
  pruna: { label: 'Pruna', cssVar: 'var(--group-pruna)' },
  rosa: { label: 'Rosa', cssVar: 'var(--group-rosa)' },
}

export const GROUP_COLOR_KEYS = Object.keys(GROUP_COLORS) as GroupColor[]

export const GROUP_EMOJIS = ['🍻', '❤️', '🍽️', '🍕', '🍷', '🥂', '🍣', '🌮', '👯', '🏡', '💼', '⚽'] as const

export const AVATAR_EMOJIS = ['🌶️', '🍷', '🧀', '🥢', '🍋', '🍕', '🍣', '🌮', '🥐', '🍜', '🥗', '🍰'] as const
