// Variables públiques (viatgen al navegador). La clau publicable no dona accés
// a res sense sessió: anon no té cap privilegi (vegeu CLAUDE.md, Seguretat).
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!

/** Supabase local (Docker)? Activa l'entrada ràpida amb els usuaris de prova. */
export const IS_LOCAL_SUPABASE = /^https?:\/\/(127\.0\.0\.1|localhost)([:/]|$)/.test(SUPABASE_URL ?? '')
