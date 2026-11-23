'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useSyncExternalStore } from 'react'
import { ca } from '@/i18n/ca'

type Theme = 'system' | 'light' | 'dark'
const KEY = 'sobretaula-theme'

// La preferència és del dispositiu (localStorage), no de la BD: el canvi ha
// de ser instantani. L'script del <head> l'aplica abans de pintar.
function read(): Theme {
  try {
    const t = localStorage.getItem(KEY)
    return t === 'light' || t === 'dark' ? t : 'system'
  } catch {
    return 'system'
  }
}

const listeners = new Set<() => void>()
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function apply(theme: Theme) {
  try {
    if (theme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, theme)
  } catch {
    // sense emmagatzematge (navegació privada): s'aplica només ara
  }
  if (theme === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', theme)
  listeners.forEach((l) => l())
}

const OPTIONS = [
  { value: 'system', label: ca.profile.themeSystem, icon: Monitor },
  { value: 'light', label: ca.profile.themeLight, icon: Sun },
  { value: 'dark', label: ca.profile.themeDark, icon: Moon },
] as const

export function ThemePicker() {
  const theme = useSyncExternalStore(subscribe, read, () => 'system' as Theme)
  return (
    <div role="radiogroup" aria-label={ca.profile.themeTitle} className="grid grid-cols-3 gap-2 rounded-xl bg-surface-2 p-1">
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = theme === value
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => apply(value)}
            className={`flex h-12 items-center justify-center gap-1.5 rounded-lg text-sm font-medium transition ${
              selected ? 'bg-surface text-heading shadow-card' : 'text-subtle hover:text-heading'
            }`}
          >
            <Icon size={18} aria-hidden />
            {label}
          </button>
        )
      })}
    </div>
  )
}
