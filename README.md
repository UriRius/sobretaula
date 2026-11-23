# Sobretaula

Valoreu en secret els restaurants on aneu amb els vostres grups i reveleu-ho
tot de cop. Planning poker + 4 categories (menjar, preu, servei, espai).

- **Stack:** Next.js 16 · Supabase (Postgres, Auth, Realtime, RLS) · Vercel.
- **Tot dins dels plans gratuïts** de Vercel i Supabase.
- **Documentació per treballar-hi:** [CLAUDE.md](CLAUDE.md) (model de dades,
  seguretat, decisions i per què).

---

## 1. Desenvolupament local

Requisits: Node 22+, **Docker Desktop obert**.

```bash
npm install
cp .env.example .env.local      # i omple-hi les claus locals (pas 3)
npm run db:start                # Supabase local a Docker (ports 553xx)
npx supabase status -o env      # copia PUBLISHABLE_KEY i SECRET_KEY a .env.local
npm run dev                     # http://localhost:3000
```

En local, la pantalla d'entrada té un bloc **«Només en local: entra com a…»**
amb els usuaris de prova (`supabase/seed.sql`):

| Usuari | Grups |
|---|---|
| Oriol | Amics (admin) + Parella (admin) — la persona compartida |
| Piti, Mario, Joel | Amics |
| Laia | Parella |

Ordres útils:

```bash
npm run db:reset      # torna a aplicar totes les migracions + dades de prova
npm run db:types      # regenera src/types/database.ts després d'un canvi d'esquema
npm run test:unit     # lògica pura i contrast de colors
npm run test:rls      # aïllament entre grups i secret del vot (Supabase local)
npm run typecheck && npm run lint
npm run icons         # regenera les icones PNG a partir de public/icons/logo.svg
```

Els ports de la Supabase local són **553xx** (no els 543xx per defecte), perquè
pugui funcionar alhora que altres projectes Supabase locals.

---

## 2. Posar-la en marxa (producció, sense domini propi)

L'app viurà a `https://<nom>.vercel.app`. Ordre: **Supabase → Google →
Vercel → tornar a Supabase i Google amb l'adreça final → primer administrador.**

### 2.1 Supabase

1. A [supabase.com](https://supabase.com) → **New project**.
   - Nom: `sobretaula`.
   - **Regió: una de la UE** (Sobretaula és a West EU / Irlanda, `eu-west-1`).
     No es pot canviar després. La regió de Vercel (`vercel.json`) ha de ser la
     més propera (`dub1` per a Irlanda, `cdg1` per a París).
   - Genera una contrasenya de la base de dades i guarda-la al gestor de
     contrasenyes.
2. Enllaça el projecte i aplica les migracions des d'aquest ordinador. El
   `project-ref` és el codi de l'adreça del panell:
   `supabase.com/dashboard/project/<ref>`.

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>          # demana la contrasenya de la BD
   npx supabase db push --remote --dry-run        # què s'aplicaria (sense tocar res)
   npx supabase db push --remote                  # aplica supabase/migrations (NO el seed)
   npx supabase migration list --remote           # Local i Remote han de coincidir
   ```

3. **Project Settings → API Keys**. Apunta't aquests tres valors:
   - la *Project URL* (`https://<ref>.supabase.co`);
   - la clau **publishable** (`sb_publishable_…`);
   - la clau **secret** (`sb_secret_…`). Aquesta, només a Vercel; mai al codi.
4. **Authentication → Sign In / Providers → Email**: **desactiva-ho**.
   - L'única manera d'entrar a producció ha de ser Google.
   - Si deixes l'Email actiu, algú es podria registrar amb el correu d'un
     altre.
   - «Allow new users to sign up» s'ha de quedar **actiu**: els convidats
     entren per primer cop amb Google.

### 2.2 Google (login)

1. A [console.cloud.google.com](https://console.cloud.google.com) → crea un
   projecte nou: `Sobretaula`.
2. **Google Auth Platform → Get started**:
   - App name: `Sobretaula`.
   - Support email: el teu.
   - Audience: **External**.
   - Contact email: el teu.
3. **Audience → Publish app** (passa a *In production*).
   - Només fem servir els permisos bàsics (nom, email i foto), així que Google
     no demana cap verificació.
   - Si la deixes en *Testing*, només hi podran entrar els correus que
     afegeixis a mà com a *test users*.
4. **Clients → Create client → Web application**:
   - *Authorized JavaScript origins*: `https://<nom>.vercel.app`. Si encara no
     el saps, torna-hi després del pas 2.3.
   - *Authorized redirect URIs*: `https://<ref>.supabase.co/auth/v1/callback`.
   - Copia el **Client ID** i el **Client secret**.
5. Supabase → **Authentication → Sign In / Providers → Google**: activa'l,
   enganxa-hi el Client ID i el secret i desa.

> La pantalla de Google dirà «continua a `<ref>.supabase.co`». Canviar-ho
> requereix un domini propi i el pla de pagament de Supabase. És només
> cosmètic.

### 2.3 Vercel

1. Puja el repositori a GitHub. Pot ser privat.
2. A [vercel.com](https://vercel.com) → **Add New → Project** → importa el
   repositori.
   - **Project Name: `sobretaula`**. El nom del projecte decideix l'adreça:
     `sobretaula.vercel.app`.
   - Si ja està agafat, Vercel en proposarà una altra. Després la pots canviar
     a **Settings → Domains → Edit** (qualsevol `*.vercel.app` lliure).
3. **Environment Variables** (abans del primer deploy):

   | Variable | Valor |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_…` |
   | `SUPABASE_SECRET_KEY` | `sb_secret_…` (marca-la com a *Sensitive*) |
   | `CRON_SECRET` | una cadena aleatòria llarga (vegeu sota) |

   Per generar el `CRON_SECRET`:

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. **Deploy**. `vercel.json` ja configura dues coses:
   - la regió de les funcions a Dublín (`dub1`), al costat de Supabase (Irlanda);
   - una tasca diària (`/api/keep-alive`). El pla gratuït de Supabase **pausa
     el projecte després de 7 dies sense activitat**, i aquesta tasca ho evita.
     La pots veure a **Settings → Cron Jobs**.

### 2.4 Tancar el cercle amb l'adreça final

1. Supabase → **Authentication → URL Configuration**:
   - *Site URL*: `https://<nom>.vercel.app`
   - *Redirect URLs*: afegeix `https://<nom>.vercel.app/auth/callback`
2. Google → el teu client → *Authorized JavaScript origins*:
   `https://<nom>.vercel.app` (si no ho havies posat).

### 2.5 El primer administrador

L'app és privada: només pot crear grups qui ja és en un grup o qui és a la
llista d'emails permesos. A Supabase → **SQL Editor**, executa:

```sql
insert into private.allowed_emails (email) values ('el-teu-correu@gmail.com');
```

L'email ha d'anar en minúscules. És una dada, no un canvi d'esquema: es pot
fer des del panell.

### 2.6 Prova-ho

1. Obre `https://<nom>.vercel.app` al mòbil → **Entra amb Google**.
2. Posa el nom i l'avatar → **Crea un grup**.
3. **Grup → Nova invitació → Comparteix** (WhatsApp).
4. Instal·la-la a la pantalla d'inici:
   - **iPhone (Safari):** botó Compartir → *Afegeix a la pantalla d'inici*.
   - **Android (Chrome):** menú ⋮ → *Instal·la l'aplicació*.

---

## 3. Desplegar canvis

**Sempre la base de dades primer, després el codi:**

```bash
npx supabase db push --remote   # 1. migracions noves (additives) a producció
git push                    # 2. Vercel desplega sol
```

Amb el CLI de Supabase 3, `db push` sense `--remote` apunta a la base de dades
**local**: sense aquest paràmetre no puja res a producció.

Si el codi arriba abans que la migració que necessita, l'app es trenca per a
tothom fins que es fa el `db push`.

- No canviïs mai l'esquema des del panell de Supabase. Tot canvi és una
  migració a `supabase/migrations/`.
- Per diagnosticar producció: només `SELECT`.

---

## 4. Tests

- `tests/rls/isolation.test.ts`: un membre d'«Amics» no pot llegir ni escriure
  res de «Parella», per cap camí: taules, vista, RPC, catàleg ni perfils.
- `tests/rls/vote-secrecy.test.ts`: mentre es vota, ningú no pot llegir el vot
  ni el comentari d'un altre a l'API. Durant la revelació, cada «Següent» obre
  exactament una categoria més.
- `tests/rls/schema-guard.test.ts`: totes les taules tenen RLS i `anon` no té
  cap permís. A més, vots i comentaris no es publiquen mai per Realtime.
- `tests/unit/`: contrast WCAG dels colors (clar i fosc), banderes, formats.

La CI (`.github/workflows/checks.yml`) ho passa tot a cada PR.
