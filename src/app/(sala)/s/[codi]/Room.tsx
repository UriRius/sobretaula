'use client'

import type { RealtimeChannel } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CATEGORIES, type Category } from '@/config/scoring'
import { ca } from '@/i18n/ca'
import { errorMessage } from '@/lib/errors'
import { publicName } from '@/lib/people'
import type { Vote } from '@/lib/scoring'
import { getBrowserClient } from '@/lib/supabase/client'
import type { RoomInitial, RoomParticipant, RoomPerson, VisitStatus } from '@/lib/visits'
import { CancelledView } from './CancelledView'
import { FinalView } from './FinalView'
import { RevealView } from './RevealView'
import { RoomHeader } from './RoomHeader'
import { VotingView } from './VotingView'

// La sala en directe.
//
// Font de veritat: la BD. Realtime només avisa que alguna cosa ha canviat:
//  * Postgres Changes de `visits` (estat, pas) i `visit_participants` (qui
//    entra, quantes categories ha votat). Mai vots ni comentaris.
//  * Broadcast `advance` de qui fa avançar la sala (arriba abans que el canvi
//    de la BD) i `cancel`.
//  * Presència: qui té la sala oberta ara mateix.
// Quan canvia el pas, cada mòbil torna a llegir els vots i la RLS li dona
// només les categories ja revelades.

export type RoomVisitState = { status: VisitStatus; revealStep: number; hostId: string }

const ROOM_CHANNEL = (visitId: string) => `visit:${visitId}`

/** Canals que s'estan tancant (per tema): un de nou espera que acabin. */
const closingChannels = new Map<string, Promise<unknown>>()

export function Room({ initial }: { initial: RoomInitial }) {
  const router = useRouter()
  const visitId = initial.visit.id
  const meId = initial.me.id

  const [state, setState] = useState<RoomVisitState>({
    status: initial.visit.status,
    revealStep: initial.visit.revealStep,
    hostId: initial.visit.hostId,
  })
  const [participants, setParticipants] = useState<RoomParticipant[]>(initial.participants)
  const [people, setPeople] = useState<RoomPerson[]>(initial.people)
  const [votes, setVotes] = useState<Vote[]>(initial.votes)
  // Per a quin moment de la sala són els vots que tenim (per girar les cartes
  // quan arriben els de la categoria nova, no abans).
  const [votesFor, setVotesFor] = useState(`${initial.visit.status}:${initial.visit.revealStep}`)
  const [online, setOnline] = useState<string[]>([])
  const [connected, setConnected] = useState(true)
  const [cancelled, setCancelled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const stateKey = `${state.status}:${state.revealStep}`

  const loadVotes = useCallback(async (forKey: string) => {
    const { data, error: votesError } = await getBrowserClient()
      .from('votes')
      .select('user_id, category, value')
      .eq('visit_id', visitId)
    if (votesError) return
    setVotes((data ?? []).map((v) => ({ userId: v.user_id, category: v.category, value: v.value })))
    setVotesFor(forKey)
  }, [visitId])

  const loadParticipants = useCallback(async () => {
    const supabase = getBrowserClient()
    const { data } = await supabase
      .from('visit_participants')
      .select('user_id, votes_cast, joined_at')
      .eq('visit_id', visitId)
      .order('joined_at')
    if (!data) return
    setParticipants(data.map((p) => ({ userId: p.user_id, votesCast: p.votes_cast, joinedAt: p.joined_at })))
    const known = new Set(people.map((p) => p.id))
    const unknown = data.map((p) => p.user_id).filter((id) => !known.has(id))
    if (unknown.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, avatar_emoji, deleted_at')
        .in('id', unknown)
      if (profiles?.length) {
        setPeople((prev) => [
          ...prev,
          ...profiles
            .filter((p) => !prev.some((q) => q.id === p.id))
            .map((p) => ({ id: p.id, name: publicName(p), avatarUrl: p.avatar_url, avatarEmoji: p.avatar_emoji })),
        ])
      }
    }
  }, [visitId, people])

  /**
   * Nou estat de la sala (des de Realtime, d'una acció pròpia o d'una
   * relectura). Si ha canviat el pas, es llegeixen els vots: la RLS dona la
   * categoria nova i res més.
   */
  const lastVotesKey = useRef(`${initial.visit.status}:${initial.visit.revealStep}`)
  const applyState = useCallback(
    (next: { status: VisitStatus; revealStep: number; hostId?: string }, forceVotes = false) => {
      setState((prev) => ({ ...prev, ...next }))
      const key = `${next.status}:${next.revealStep}`
      if (forceVotes || (next.status !== 'voting' && lastVotesKey.current !== key)) {
        lastVotesKey.current = key
        void loadVotes(key)
      }
    },
    [loadVotes],
  )

  /** Torna a llegir-ho tot (en connectar, en tornar a la pantalla, després d'un error). */
  const reload = useCallback(async () => {
    const { data: visit } = await getBrowserClient()
      .from('visits')
      .select('status, reveal_step, host_id')
      .eq('id', visitId)
      .maybeSingle()
    if (!visit) {
      setCancelled(true)
      return
    }
    applyState({ status: visit.status, revealStep: visit.reveal_step, hostId: visit.host_id }, true)
    await loadParticipants()
  }, [visitId, loadParticipants, applyState])

  // Els callbacks de Realtime es registren un sol cop: llegeixen sempre la
  // versió més nova de les funcions a través d'aquesta ref.
  const handlers = useRef({ reload, loadParticipants, applyState })
  useEffect(() => {
    handlers.current = { reload, loadParticipants, applyState }
  }, [reload, loadParticipants, applyState])

  // Entrar a la sala (una sola vegada). No es fa en pintar la pàgina al
  // servidor: una precàrrega d'un enllaç no t'ha de fer entrar a cap sala.
  useEffect(() => {
    if (initial.visit.status !== 'voting' || initial.participants.some((p) => p.userId === meId)) return
    void getBrowserClient()
      .rpc('join_visit', { p_code: initial.visit.roomCode })
      .then(({ error: joinError }) => {
        if (joinError) setError(errorMessage(joinError))
        else void handlers.current.loadParticipants()
      })
  }, [initial.visit.status, initial.visit.roomCode, initial.participants, meId])

  // Temps real.
  useEffect(() => {
    const supabase = getBrowserClient()
    const topic = ROOM_CHANNEL(visitId)
    let disposed = false
    let channel: RealtimeChannel | null = null

    void (async () => {
      // supabase.channel(topic) REAPROFITA un canal amb el mateix nom. Si
      // l'efecte es torna a muntar (StrictMode, o en tornar a la pantalla amb
      // Activity) abans que l'anterior s'hagi tancat, rebríem el canal que
      // s'està tancant i la sala es quedaria sorda. Primer, que acabi de tancar.
      await closingChannels.get(topic)
      await supabase.realtime.setAuth()
      if (disposed) return

      const ch = supabase.channel(topic, {
        config: { private: true, presence: { key: meId }, broadcast: { self: false } },
      })
      channel = ch
      channelRef.current = ch

      ch.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'visits', filter: `id=eq.${visitId}` }, (payload) => {
        const row = payload.new as { status: VisitStatus; reveal_step: number; host_id: string }
        handlers.current.applyState({ status: row.status, revealStep: row.reveal_step, hostId: row.host_id })
      })
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'visit_participants', filter: `visit_id=eq.${visitId}` },
          () => void handlers.current.loadParticipants(),
        )
        .on('broadcast', { event: 'advance' }, ({ payload }) => {
          handlers.current.applyState(payload as { status: VisitStatus; revealStep: number })
        })
        .on('broadcast', { event: 'cancel' }, () => setCancelled(true))
        .on('presence', { event: 'sync' }, () => setOnline(Object.keys(ch.presenceState())))
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setConnected(true)
            void ch.track({ at: Date.now() })
            // El que hagi passat entre la càrrega de la pàgina i ara.
            void handlers.current.reload()
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            setConnected(false)
          }
        })
    })()

    // El mòbil es bloqueja a mig sopar: en tornar, es llegeix tot de nou.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void handlers.current.reload()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      disposed = true
      document.removeEventListener('visibilitychange', onVisible)
      channelRef.current = null
      if (channel) {
        const closing = supabase.removeChannel(channel).finally(() => {
          if (closingChannels.get(topic) === closing) closingChannels.delete(topic)
        })
        closingChannels.set(topic, closing)
      }
    }
  }, [visitId, meId])

  // ---------------------------------------------------------------------------
  // Accions
  // ---------------------------------------------------------------------------

  async function castVote(category: Category, value: number) {
    const previous = votes
    setVotes((prev) => [
      ...prev.filter((v) => !(v.userId === meId && v.category === category)),
      { userId: meId, category, value },
    ])
    setError(null)
    const { error: voteError } = await getBrowserClient().rpc('cast_vote', {
      p_visit_id: visitId,
      p_category: category,
      p_value: value,
    })
    if (voteError) {
      setVotes(previous)
      setError(errorMessage(voteError))
      void reload()
    }
  }

  async function saveComment(body: string): Promise<boolean> {
    const { error: commentError } = await getBrowserClient().rpc('set_comment', { p_visit_id: visitId, p_body: body })
    if (commentError) {
      setError(errorMessage(commentError))
      return false
    }
    return true
  }

  async function advance() {
    if (state.status === 'voting') {
      const missing = participants
        .filter((p) => votesCastOf(p) < CATEGORIES.length)
        .map((p) => people.find((person) => person.id === p.userId)?.name ?? '?')
      if (missing.length && !window.confirm(ca.room.revealMissing(missing.join(', ')))) return
    }
    setAdvancing(true)
    setError(null)
    const { data, error: advanceError } = await getBrowserClient().rpc('advance_visit', { p_visit_id: visitId })
    setAdvancing(false)
    if (advanceError || !data) {
      setError(errorMessage(advanceError))
      void reload()
      return
    }
    const next = { status: data.status, revealStep: data.reveal_step }
    applyState(next)
    void channelRef.current?.send({ type: 'broadcast', event: 'advance', payload: next })
  }

  async function cancel() {
    if (!window.confirm(ca.room.cancelConfirm)) return
    const { data, error: deleteError } = await getBrowserClient().from('visits').delete().eq('id', visitId).select('id')
    if (deleteError || !data?.length) {
      setError(deleteError ? errorMessage(deleteError) : ca.errors.voting_closed)
      void reload()
      return
    }
    void channelRef.current?.send({ type: 'broadcast', event: 'cancel', payload: {} })
    router.replace(`/g/${initial.group.id}`)
  }

  // El meu ✓ es veu a l'instant, sense esperar el viatge d'anada i tornada.
  function votesCastOf(p: RoomParticipant): number {
    if (p.userId !== meId) return p.votesCast
    return votes.filter((v) => v.userId === meId).length
  }

  // ---------------------------------------------------------------------------

  const canAdvance = state.hostId === meId || initial.me.isAdmin
  const host = people.find((p) => p.id === state.hostId)
  const isParticipant = participants.some((p) => p.userId === meId)
  const backHref = `/g/${initial.group.id}`

  if (cancelled) return <CancelledView href={backHref} />

  return (
    <div className="flex min-h-dvh flex-col">
      <RoomHeader
        restaurant={initial.visit.restaurant}
        roomCode={initial.visit.roomCode}
        backHref={backHref}
        connected={connected}
        showShare={state.status === 'voting'}
      />

      {state.status === 'voting' && (
        <VotingView
          meId={meId}
          isParticipant={isParticipant}
          people={people}
          participants={participants.map((p) => ({ ...p, votesCast: votesCastOf(p) }))}
          online={online}
          hostId={state.hostId}
          hostName={host?.name ?? ''}
          myVotes={Object.fromEntries(
            votes.filter((v) => v.userId === meId).map((v) => [v.category, v.value]),
          ) as Partial<Record<Category, number>>}
          initialComment={initial.myComment}
          canAdvance={canAdvance}
          advancing={advancing}
          error={error}
          onVote={castVote}
          onSaveComment={saveComment}
          onReveal={advance}
          onCancel={cancel}
        />
      )}

      {state.status === 'revealing' && (
        <RevealView
          key={state.revealStep}
          step={state.revealStep}
          votes={votes}
          votesReady={votesFor === stateKey}
          people={people}
          participants={participants}
          canAdvance={canAdvance}
          advancing={advancing}
          hostName={host?.name ?? ''}
          error={error}
          onNext={advance}
        />
      )}

      {state.status === 'closed' && (
        <FinalView
          visitId={visitId}
          groupId={initial.group.id}
          visitDate={initial.visit.visitDate}
          votes={votes}
          votesReady={votesFor === stateKey}
          people={people}
          live={initial.visit.status !== 'closed'}
        />
      )}
    </div>
  )
}
