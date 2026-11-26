import { ca } from '@/i18n/ca'

// El nom que es veu d'una persona. Un compte esborrat (migració 4) té el
// perfil anònim: el text el posa la UI, mai l'SQL.
export function publicName(profile: { display_name: string; deleted_at?: string | null }): string {
  return profile.deleted_at ? ca.profile.deletedName : profile.display_name
}
