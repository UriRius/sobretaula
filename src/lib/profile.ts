import 'server-only'
import { requireUser } from '@/lib/auth'
import { publicName } from '@/lib/people'
import { getGroup, getMyGroups, type MyGroup } from '@/lib/queries'
import { exigencyRanking, profileStats, type MemberExigency, type ProfileStats } from '@/lib/scoring'
import { createClient } from '@/lib/supabase/server'
import { getVisibleVotes, getVisitsWithVotes, type VisitWithVotes } from '@/lib/visits'

// Perfils. PRIVADESA: quan miro el perfil d'algú, només en veig els grups que
// compartim. No és un filtre de la UI: totes les consultes passen per la meva
// sessió i la RLS només em dona els grups on sóc. Aquí, a més, el context
// («Tots els grups» o un de concret) es limita a aquests grups.

export type ProfilePerson = {
  id: string
  name: string
  avatarUrl: string | null
  avatarEmoji: string | null
  createdAt: string
}

export type ProfileData = {
  person: ProfilePerson
  isMe: boolean
  /** Els grups que puc veure d'aquesta persona (els meus, si sóc jo). */
  groups: MyGroup[]
  /** El grup triat, o null = tots. */
  selected: MyGroup | null
  stats: ProfileStats<VisitWithVotes>
  /** Dins d'un grup: on queda a l'exigència (1 = qui puntua més baix). */
  exigencyPosition: { position: number; of: number } | null
}

export async function getProfile(userId: string, groupParam: string | null): Promise<ProfileData | null> {
  const [me, myGroups] = await Promise.all([requireUser(), getMyGroups()])
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, avatar_emoji, created_at, deleted_at')
    .eq('id', userId)
    .maybeSingle()
  if (!profile) return null

  const isMe = userId === me.id
  let groups = myGroups
  if (!isMe) {
    // La RLS només em deixa veure les pertinences i els vots dels meus grups.
    const [{ data: memberships }, votes] = await Promise.all([
      supabase.from('group_members').select('group_id').eq('user_id', userId),
      getVisibleVotes(myGroups.map((g) => g.id)),
    ])
    const shared = new Set((memberships ?? []).map((m) => m.group_id))
    for (const v of votes) if (v.userId === userId) shared.add(v.groupId)
    groups = myGroups.filter((g) => shared.has(g.id))
  }

  const selected = groups.find((g) => g.id === groupParam) ?? null
  const visits = await getVisitsWithVotes(selected ? [selected.id] : groups.map((g) => g.id))
  const stats = profileStats(userId, visits)

  let exigencyPosition: ProfileData['exigencyPosition'] = null
  if (selected && stats.exigency.value !== null) {
    const group = await getGroup(selected.id)
    const ranking = exigencyRanking(group?.members.map((m) => m.userId) ?? [userId], visits).filter((r) => r.value !== null)
    const index = ranking.findIndex((r) => r.userId === userId)
    if (index >= 0) exigencyPosition = { position: index + 1, of: ranking.length }
  }

  return {
    person: {
      id: profile.id,
      name: publicName(profile),
      avatarUrl: profile.avatar_url,
      avatarEmoji: profile.avatar_emoji,
      createdAt: profile.created_at,
    },
    isMe,
    groups,
    selected,
    stats,
    exigencyPosition,
  }
}

/** «Més exigent ↔ més generós» dels membres d'un grup. */
export async function getGroupExigency(groupId: string): Promise<MemberExigency[]> {
  const group = await getGroup(groupId)
  if (!group) return []
  const visits = await getVisitsWithVotes([groupId])
  return exigencyRanking(
    group.members.map((m) => m.userId),
    visits,
  )
}
