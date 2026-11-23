import 'flag-icons/css/flag-icons.min.css'
import { Globe } from 'lucide-react'
import { cuisineName, flagFor } from '@/config/cuisines'

const SIZES = {
  // 27×18: 3:2 exacte, i cada franja de la senyera fa 2 px (nítida).
  md: { width: 27, height: 18, globe: 13 },
  lg: { width: 36, height: 24, globe: 16 },
} as const

/**
 * Bandera de l'origen d'una cuina. Mateix marc per a tothom: 3:2, cantonades
 * lleugerament arrodonides i una vora subtil que es veu sobre fons clars i
 * foscos. Mai emojis de bandera (Windows no els mostra i no n'hi ha de
 * Catalunya).
 */
export function Flag({ code, size = 'md' }: { code: string; size?: keyof typeof SIZES }) {
  const { width, height, globe } = SIZES[size]
  const flag = flagFor(code)
  return (
    <span
      role="img"
      aria-label={`Cuina ${cuisineName(code).toLowerCase()}`}
      title={cuisineName(code)}
      className="relative inline-block shrink-0 overflow-hidden rounded-[3px] align-middle"
      style={{ width, height }}
    >
      {flag.kind === 'senyera' && <Senyera />}
      {flag.kind === 'country' && (
        // Només la classe `fi-xx` (posa la imatge). La base `.fi` de flag-icons
        // força position:relative i es desplaçava cap avall. flag-icons és 4:3;
        // `cover` el retalla a 3:2 pel centre.
        <span
          className={`fi-${flag.country}`}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'block',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}
      {flag.kind === 'globe' && (
        <span className="absolute inset-0 flex items-center justify-center bg-surface-2 text-label">
          <Globe size={globe} strokeWidth={2} aria-hidden />
        </span>
      )}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[3px] shadow-[inset_0_0_0_1px_var(--flag-edge)]" />
    </span>
  )
}

/** 9 franges horitzontals iguals, groc i vermell alternats, començant i acabant per groc. */
function Senyera() {
  return (
    <svg viewBox="0 0 27 18" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" shapeRendering="crispEdges" aria-hidden>
      <rect width="27" height="18" fill="#FCDD09" />
      {[1, 3, 5, 7].map((i) => (
        <rect key={i} y={i * 2} width="27" height="2" fill="#DA121A" />
      ))}
    </svg>
  )
}
