import { ca, type ErrorCode } from '@/i18n/ca'

// Les RPC fan `raise exception '<codi>'`; aquí es tradueix. Mai es mostra a
// l'usuari el text cru del servidor.
export function errorMessage(error: { message?: string } | null | undefined): string {
  const code = error?.message?.trim()
  if (code && code in ca.errors) return ca.errors[code as ErrorCode]
  return ca.errors.generic
}

export type ActionState = { error: string | null; ok?: boolean }

export const initialActionState: ActionState = { error: null }
