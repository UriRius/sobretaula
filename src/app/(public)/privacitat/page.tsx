import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { LEGAL } from '@/config/legal'
import { ca } from '@/i18n/ca'
import { privacyPolicy } from '@/i18n/privacitat.ca'
import { formatDayLong } from '@/lib/format'

export const metadata: Metadata = { title: privacyPolicy.title }

// Pàgina pública (sense sessió): Google la demana per publicar el login.
export default function PrivacyPage() {
  return (
    <main className="tablecloth min-h-dvh px-4 py-8">
      <article className="mx-auto max-w-lg rounded-card border border-line-subtle bg-surface p-6 shadow-card">
        <Link href="/entrar" className="mb-6 flex items-center gap-2">
          <Logo size={32} />
          <span className="font-display text-xl font-semibold text-heading">{ca.app.name}</span>
        </Link>
        <h1 className="font-display text-3xl font-semibold text-heading">{privacyPolicy.title}</h1>
        <p className="mt-1 text-sm text-subtle">
          {ca.legal.updatedOn(formatDayLong(LEGAL.privacyUpdatedOn))}
        </p>
        <p className="mt-5 text-body">{privacyPolicy.intro}</p>

        {privacyPolicy.sections.map((section) => (
          <section key={section.title} className="mt-6">
            <h2 className="font-display text-xl font-semibold text-heading">{section.title}</h2>
            {section.paragraphs.map((p) => (
              <p key={p} className="mt-2 text-body">
                {p}
              </p>
            ))}
            {section.items && (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-body marker:text-muted">
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="mt-8 border-t border-line-subtle pt-4">
          <Link href="/entrar" className="font-medium text-link underline-offset-4 hover:underline">
            {ca.legal.backToApp}
          </Link>
        </p>
      </article>
    </main>
  )
}
