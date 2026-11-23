import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Supabase (pla gratuït) pausa el projecte després de 7 dies sense activitat,
// i reactivar-lo és manual. El cron de Vercel (vercel.json) crida això cada
// dia: una consulta lleugera n'hi ha prou. Protegit amb CRON_SECRET (Vercel
// l'envia com a capçalera Authorization).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { count, error } = await supabase.from('groups').select('id', { count: 'exact', head: true })
  if (error) return Response.json({ ok: false }, { status: 500 })
  return Response.json({ ok: true, groups: count })
}
