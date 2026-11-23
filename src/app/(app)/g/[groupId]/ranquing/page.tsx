import { Trophy } from 'lucide-react'
import type { Metadata } from 'next'
import { Card, PageTitle } from '@/components/ui/Card'
import { ca } from '@/i18n/ca'

export const metadata: Metadata = { title: 'Rànquing' }

// Fase 3.
export default function RankingPage() {
  return (
    <>
      <PageTitle>{ca.ranking.title}</PageTitle>
      <Card className="flex flex-col items-center gap-3 py-10 text-center">
        <Trophy size={40} className="text-muted" aria-hidden />
        <p className="text-subtle">{ca.ranking.soon}</p>
      </Card>
    </>
  )
}
