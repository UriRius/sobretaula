# CLAUDE.md — Sobretaula

> Document viu. Cada regla porta el seu perquè; cada concepte diu quin fitxer el
> posseeix i quins tests el cobreixen. S'actualitza en el mateix canvi que el
> codi. Estructura: skill app-playbook (lliçons de My Shop Diary).

@AGENTS.md

## Descripció

App web (PWA, mobile-first) per valorar els restaurants on anem amb diferents
grups de gent. Barreja el *planning poker* (tothom vota alhora i en secret, i es
revela tot de cop) amb el concepte del «Joc de cartes» (es valoren 4 aspectes
per separat). Inspirada en el concepte del programa, **sense** fer servir-ne el
nom, el logotip ni l'estètica.

**Moment d'ús:** a taula, des del mòbil, just en acabar de dinar o sopar.
Botons grans, poc text, una mà, pantalles de 375 px.

**Usuari 0:** l'Oriol, amb el seu grup d'amics (4) i la seva parella (2).

**Privada:** només hi entra qui té una invitació a un grup o és a
`private.allowed_emails` (el primer administrador).

## Stack

| Capa | Tecnologia |
|---|---|
| App | Next.js 16 (App Router, `cacheComponents` + `partialPrefetching`) + TypeScript estricte + Tailwind 4 |
| BD / Auth / temps real | Supabase (Postgres, Auth amb Google, Realtime, RLS), regió UE |
| Allotjament | Vercel (pla gratuït, `*.vercel.app`) |
| Icones | lucide-react; banderes amb flag-icons (+ senyera pròpia) |
| Tests | Vitest (unitaris i RLS contra la Supabase local); Playwright per a l'E2E de la sala (Fase 2) |
| Idioma | Català. Tots els textos a `src/i18n/ca.ts`, mai dins dels components |

Next 16 no és el Next que coneixes: abans de fer servir una API, llegeix la
guia a `node_modules/next/dist/docs/`. Trampes ja trobades:

- Amb `cacheComponents`, qualsevol lectura de cookies, `params`,
  `searchParams` o dades sense `use cache` ha d'anar dins d'un `<Suspense>`.
  Patró de pàgina: la pàgina és síncrona i passa `params` a un component
  async dins de `<Suspense>`.
- Un Client Component que fa servir `useParams`/`usePathname` no pot ser el
  *fallback* d'un `<Suspense>` (el fallback va al shell estàtic): per això hi ha
  `BottomNavSkeleton`.
- `createClient()` (servidor) fa `await connection()`: les dades de sessió són
  sempre de temps de petició. Sense això, el Partial Prefetching intenta
  prerenderitzar-les i supabase-js crida `Date.now()` («unstable value»).
- El middleware ara es diu `proxy` (`src/proxy.ts`).
- `useEffect(() => setState(...))` falla el lint (`react-hooks/set-state-in-effect`).
  Per tancar un menú en navegar, guarda la ruta on s'ha obert (`GroupSwitcher`).

## Estructura de carpetes

```
src/app/                    rutes (vegeu «Pantalles i rutes»)
src/components/             UI; ui/ = peces bàsiques
src/config/                 scoring.ts · cuisines.ts · groupColors.ts (configuració, sense lògica)
src/lib/scoring/            lògica pura de puntuació, amb tests
src/lib/supabase/           clients servidor/navegador
src/lib/                    format.ts, auth.ts, errors.ts…
src/i18n/ca.ts              tots els textos
src/types/database.ts       GENERAT (npm run db:types). No s'edita a mà
supabase/migrations/        font de veritat de l'esquema
supabase/seed.sql           dades de prova (només local)
tests/unit/ tests/rls/ tests/helpers/
```

## Model de dades

**L'esquema viu a `supabase/migrations/`. Mai es canvia des del panell.**
Canvi nou: `npx supabase migration new <nom>` → `npm run db:reset` →
`npm run db:types` → `npm run test:rls`.

**Tenant = el grup** (`groups`), no l'usuari. Pertinença a `group_members`
(admin | member). Tot el que penja d'un grup porta `group_id not null`; el que
penja d'una visita porta a més una FK composta `(visit_id, group_id) →
visits(id, group_id)`. `created_by` / `host_id` són autoria, i les polítiques
només hi miren on el document ho demana (l'amfitrió fa avançar la sala).

| Taula | Què guarda | Llegir | Escriure |
|---|---|---|---|
| `profiles` | nom visible, avatar (Google o emoji). Sense email | jo; qui comparteix grup amb mi; qui ha votat en visites dels meus grups | jo |
| `groups` | nom, emoji, color (enum `group_color`) | membres | crear: RPC `create_group`; editar: admins |
| `group_members` | pertinença i rol | membres | admins (mai la pròpia fila); entrar: `accept_invite`; sortir: `leave_group` |
| `group_invites` | codi de 10, caducitat, usos | admins | crear: `create_invite`; revocar: DELETE (admins) |
| `private.allowed_emails` | emails que poden crear grups sense invitació | ningú (no exposada) | SQL manual (README) |
| `restaurants` | catàleg únic per (nom, població) normalitzats | **només els restaurants on han anat els meus grups** | crear: dins `create_visit`; corregir: qui hi ha anat |
| `group_restaurant_notes` | notes lliures d'un grup sobre un restaurant | membres | membres |
| `visits` | sala/visita: data, preu, amfitrió, codi de 5, estat, pas | membres | `create_visit`, `advance_visit`; data i preu: amfitrió o admin; cancel·lar (DELETE) mentre vota |
| `visit_participants` | qui hi és i quantes categories ha votat (`votes_cast`, per trigger) | membres | `join_visit` |
| `votes` | 1–10 per categoria | **els meus; els dels altres només si la categoria ja s'ha revelat** | `cast_vote` (només en `voting`) |
| `comments` | un per participant | **el meu; els dels altres quan la sala és tancada** | `set_comment` (només en `voting`) |
| vista `visit_category_stats` | mitjana, desviació, mín, màx per visita tancada i categoria | (RLS de qui consulta) | — |

Estats de la sala: `voting → revealing (reveal_step 0–3) → closed`. No hi ha
`waiting`: a taula, un «Començar» és un toc que no aporta res. L'últim
«Següent» tanca la sala (`closed` = pantalla de la nota final), perquè cap sala
no quedi penjada a mitja revelació.

Errors de les RPC: `raise exception '<codi>'` (p. ex. `not_allowed`,
`invite_expired`, `voting_closed`). La UI els tradueix a `src/i18n/ca.ts`
(`errors`) amb `src/lib/errors.ts`. Mai text per a l'usuari dins de l'SQL.

## Seguretat

- RLS a totes les taules, una política per operació, totes `to authenticated`.
  Pertinença via `private.user_group_ids()` / `private.is_group_admin()`
  (SECURITY DEFINER, `search_path = ''`), sempre `(select auth.uid())`.
- **El secret del vot es garanteix a la BD**: la RLS de `votes` (per categoria)
  i de `comments`; vots i comentaris només per RPC, que bloquegen la visita en
  mode compartit contra `advance_visit` (exclusiu): cap vot entra després de
  «Revelar». `votes` i `comments` no es publiquen mai per Realtime.
- `anon` no té res a `public` (taules, vistes, seqüències, funcions). Les
  columnes que el client pot actualitzar estan llistades als GRANT.
- **Al núvol, cada taula nova neix amb TOTS els permisos per a `anon` i
  `authenticated`** (fins i tot TRUNCATE). Per això cada migració fa `revoke
  all … from anon, authenticated` i després dona només el que cal; un GRANT
  per columna no serveix de res amb un UPDATE de taula al damunt. En local,
  `auto_expose_new_tables = true` (com al núvol) perquè els tests ho vegin, i
  `schema-guard.test.ts` compara els permisos d'`authenticated` amb una llista
  exacta: una taula o un permís nou s'hi han d'afegir a consciència. (Es va
  detectar el 2026-11-23, abans del primer `db push`.)
- Presència de la sala: canal privat `visit:<id>`, autoritzat per RLS a
  `realtime.messages`.
- Tests: `tests/rls/isolation.test.ts` (Amics ↔ Parella), `vote-secrecy.test.ts`,
  `schema-guard.test.ts`. Sempre en verd; CI a cada PR.
- Producció: només Google (proveïdor Email desactivat al panell; si estigués
  actiu, algú podria registrar-se amb l'email d'un altre sense confirmar-lo).
  `is_active_user()` exigeix `email_confirmed_at`.
- Secrets: `SUPABASE_SECRET_KEY` i `CRON_SECRET` només al servidor (Vercel).
  Res de dades reals al repo.
- Esborrar el compte (Fase 5): anonimitza el perfil i conserva els vots (si
  no, l'historial dels grups canviaria). Fins aleshores, per correu (ho diu la
  política de privacitat).
- **La política de privacitat diu el que fa el codi.** Un proveïdor nou
  (correu, analítica…), una dada nova o un canvi de qui veu què → canviar
  `src/i18n/privacitat.ca.ts` i `LEGAL.privacyUpdatedOn` en el mateix canvi.
  Google la demana per publicar el login.

## Puntuació — un sol lloc

| Concepte | Fitxer | Tests |
|---|---|---|
| Pesos, categories, llindar de debat (2), mínim de visites per a l'exigència (3) | `src/config/scoring.ts` | `tests/unit/scoring.test.ts` |
| Mitjanes, ponderació, dispersió, rànquing, exigència | `src/lib/scoring/` | `tests/unit/scoring.test.ts` |
| Format de xifres (7,8) i dates | `src/lib/format.ts` | `tests/unit/format.test.ts` |
| Cuines i bandera de cada codi | `src/config/cuisines.ts`, `src/components/Flag.tsx` | `tests/unit/cuisines.test.ts` |
| Colors de grup | `src/config/groupColors.ts` (tipat amb l'enum `group_color`) | — |

- **La nota final no es guarda mai.** Es calcula amb els pesos a partir dels
  vots. Canviar un pes recalcula tot el rànquing sense tocar la BD. Per això
  l'SQL només calcula agregats que no depenen dels pesos.
- Nota de categoria = mitjana dels vots (no la moda). Total = Σ pes × mitjana,
  amb un decimal.
- Dispersió: desviació estàndard **poblacional** per a la 🔥 (> 2); a pantalla,
  el rang en paraules («de 5 a 9»).
- Vots incomplets: compten a les categories votades; sense nota personal. No es
  pot revelar si alguna categoria no té cap vot.
- Empats: el rànquing ordena per la nota visible (un decimal) i els empatats
  comparteixen posició.
- Exigència: la teva nota ponderada menys la mitjana **de la resta** del grup a
  les mateixes visites (en una parella, incloure't dividiria la diferència per
  dos). Mínim 3 visites.

## Disseny

- Personalitat: **càlida i juganera** — una taula després de sopar, no un
  dashboard.
- Tokens semàntics clar/fosc a `src/app/globals.css` (variables CSS mapejades a
  Tailwind amb `@theme`). **Cap color cru als components.** Mode fosc: marró
  vi molt fosc, no negre.
- Paleta: crema de paper (fons), vermell d'estovalla (marca), mostassa (accent:
  només top 3 i nota final), marró fusta (text). Una nota baixa no és mai
  vermella d'error.
- Tipografia: Fraunces (títols, notes grans), Inter (interfície), xifres
  `tabular-nums`.
- Icones Lucide. Emojis només on els tria l'usuari (grup, avatar) i la 🔥.
- Banderes 27×18 (3:2 exacte; cada franja de la senyera fa 2 px). La senyera es
  dibuixa (SVG de 9 franges): flag-icons és 4:3 i retallar-la a 3:2 menja mitja
  franja groga a dalt i a baix. Dels països, només la classe `fi-xx` (la
  imatge): la base `.fi` força `position: relative` per damunt de Tailwind i la
  bandera quedava desplaçada (en fosc es veia una franja buida).
- `<Card flush>` per a llistes de vora a vora: `className="p-0"` no guanya a
  `p-4` (ordre del CSS de Tailwind, no de les classes).
- Navegació inferior de 4: Inici · Rànquing · Grup · Perfil. La sala va a
  pantalla completa, sense navegació. Objectius tàctils ≥ 44 px.
- Tema: sistema per defecte; preferència al dispositiu (`localStorage`, script
  en línia al `<head>` perquè no parpellegi).
- Grup actiu: galeta `sobretaula_group` (la llegeix el servidor a `/`).

## Pantalles i rutes

| Ruta | Pantalla |
|---|---|
| `/entrar` | Entrar amb Google (en local, també «entrar com a…» usuaris de prova). És la «pàgina principal» que declarem a Google |
| `/privacitat` | Política de privacitat (pública). Text a `src/i18n/privacitat.ca.ts`, correu a `src/config/legal.ts` |
| `/auth/callback` | Intercanvi del codi OAuth |
| `/benvinguda` | Primer cop: nom i avatar. Sense grups: codi d'invitació, o crear grup si es pot |
| `/unir/[codi]` | Invitació: veure el grup i acceptar |
| `/` | Redirigeix al grup actiu |
| `/grups/nou` | Crear un grup |
| `/g/[groupId]` | Inici del grup |
| `/g/[groupId]/grup` | Membres, invitacions, ajustos del grup |
| `/g/[groupId]/ranquing` | Rànquing (Fase 3) |
| `/jo` | El meu perfil i ajustos (tema, sortir) |

## Desenvolupament local

```
npm run db:start      # supabase start (Docker Desktop obert)
npm run db:reset      # reprodueix TOTES les migracions + seed
npm run db:types      # regenera src/types/database.ts
npm run test:unit
npm run test:rls      # contra la Supabase local (es nega a córrer contra una altra)
npm run dev
```

- Usuaris de prova (seed): oriol, piti, mario, joel, laia `@sobretaula.test`,
  contrasenya `sobretaula-dev`. Amics = Oriol, Piti, Mario, Joel. Parella =
  Oriol, Laia. Oriol és a `allowed_emails`. «Mar i Cel» només el coneix Parella
  (prova de privadesa del catàleg). Invitació local vàlida: `/unir/AMICS23456`.
- Ports locals **553xx** (API 55321, BD 55322, Studio 55323, Mailpit 55324):
  els 543xx per defecte els fa servir un altre projecte (My Shop Diary) i així
  poden córrer alhora.
- Vitest sempre per `npm run test:*` (`scripts/vitest.mjs`): a Windows, si la
  terminal obre el projecte com a `c:\` en minúscula (VS Code), Vitest es
  carrega dues vegades i peta amb «failed to find the current suite».
- Verificació visual: Playwright a la carpeta temporal de la sessió (no al
  repo), Chrome instal·lat, 390 px, clar i fosc, escoltant errors de consola.
- Si després d'un `db reset` l'autenticació respon 502 i tots els tests fallen a
  crear usuaris: és el contenidor, no el codi → `npx supabase stop && npx
  supabase start`.

## Desplegament

- Producció: projecte `zxuzbtoikksyreqgqkzo` (Supabase, **eu-west-1 Irlanda**),
  funcions de Vercel a `dub1`. Migracions 1–3 aplicades el 2026-11-23.
- CLI de Supabase 3: les ordres apunten a LOCAL per defecte. Producció =
  `--remote` (`db push --remote [--dry-run]`, `migration list --remote`).
  Per diagnosticar, `db query --remote --read-only`; ATENCIÓ: amb el rol de
  només lectura, `information_schema` amaga els permisos d'altres rols (surt
  buit): mira els ACL de `pg_class`/`pg_attribute` amb `aclexplode`.
- Ordre fix: **BD primer** (`npx supabase db push --remote`), després el codi (push a
  `main` → Vercel). Migracions additives; les destructives en una segona fase.
- Supabase gratuït pausa el projecte després de 7 dies sense activitat: el cron
  de Vercel (`/api/keep-alive`, diari) fa una consulta lleugera.
- Passos complets: README.

## Manera de treballar

- **Mai `git commit`, `push` ni `merge` sense que l'Oriol ho demani en aquell
  missatge.** Ell revisa i fa els commits.
- Planificar junts abans de canvis grans; les decisions obertes es presenten
  com a preguntes amb una recomanació.
- Verificar visualment (captura a 375 px, clar i fosc) abans de donar una
  pantalla per acabada.
- Producció: només `SELECT` per diagnosticar.

## Registre de decisions

| Data | Decisió | Per què | Descartat |
|---|---|---|---|
| 2026-11-23 | Pesos només a `scoring.ts`; l'SQL no pondera | Canviar un pes ha de recalcular-ho tot sense tocar la BD | Vistes SQL amb la nota ponderada (dues fonts de pesos) |
| 2026-11-23 | Secret per categoria també durant la revelació; comentaris secrets fins al final | Les DevTools no s'han de poder avançar; un comentari delata el vot | Obrir tots els vots en prémer «Revelar» |
| 2026-11-23 | Sense estat `waiting`; l'últim «Següent» tanca | Un toc menys a taula; cap sala penjada | `waiting → voting → revealing → closed` |
| 2026-11-23 | L'amfitrió o un admin del grup fan avançar la sala | Si el mòbil de l'amfitrió es queda sense bateria | Només l'amfitrió |
| 2026-11-23 | Només login amb Google (sense domini propi) | Sense domini no hi ha SMTP propi; l'enviador de Supabase només envia a l'equip. Quan hi hagi domini: codi de 6 xifres (no enllaç màgic: a l'iPhone la PWA no comparteix sessió amb Safari) | Enllaç màgic |
| 2026-11-23 | Llista d'emails permesos a la BD (`private.allowed_emails`) | La comprovació l'ha de fer Postgres; no veu les variables de Vercel | Variable d'entorn |
| 2026-11-23 | Catàleg únic però visible només pels restaurants dels teus grups | En una app petita, veure tot el catàleg deixa deduir on ha anat algú amb un altre grup | Catàleg visible per a tothom |
| 2026-11-23 | Exigència contra la resta del grup, mínim 3 visites | Amb dues persones, incloure't divideix la diferència per dos | Mitjana del grup sencer |
| 2026-11-23 | Banderes 27×18 i senyera dibuixada | 20×14 no és 3:2; a 14 px les franges es veuen borroses | flag-icons per a la senyera |
| 2026-11-23 | Cartes en 2 files de 5 | 10 en una fila fan ~30 px, sota el mínim tàctil | Una fila de 10 |
| 2026-11-23 | Els vots sobreviuen a sortir del grup / esborrar el compte | La història del grup no ha de canviar | Esborrar en cascada |
| 2026-11-23 | `cacheComponents` activat (defecte de Next 16) | Serà obligatori al proper major; conserva l'estat en tornar enrere | Desactivar-lo |
| 2026-11-23 | Producció a `sobretaula-app.vercel.app`, només Google | No hi ha domini propi; `sobretaula.vercel.app` ja és d'una altra persona | Domini propi + codi per correu (quan n'hi hagi) |
| 2026-11-24 | Pàgina `/privacitat` pública i enllaçada des de `/entrar` | Google no deixa publicar el login sense pàgina principal i política de privacitat | Quedar-se en mode «Prueba» (cada convidat s'hauria d'afegir a mà a Google) |
| 2026-11-23 | `<Flag>` i `cuisines.ts` avançats a la Fase 1 | L'inici del grup ja ensenya visites amb bandera | Esperar a la Fase 2 |
| 2026-11-23 | Icona provisional (`public/icons/logo.svg`) | L'Oriol farà la definitiva; `npm run icons` regenera els PNG | — |

## Incidents

| Data | Què va passar | Causa | Regla que en surt |
|---|---|---|---|
| 2026-11-24 | Primer login a producció: Google OK però l'usuari acabava a `/?code=…` d'un domini sense app (404) | Redirect URL exacta (`…/auth/callback`) no encaixa amb `…/auth/callback?next=…` → Supabase torna a la Site URL; i la Site URL no era el domini real de Vercel | Redirect URLs sempre amb comodí (`https://<domini>/**`); el proxy reenvia `/?code=` a `/auth/callback` |
