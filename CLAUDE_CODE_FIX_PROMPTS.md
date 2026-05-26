# Claude Code Fix Prompts — Use One Batch at a Time

**How to use this file:**
Each numbered section is a complete, copy-pasteable prompt for Claude Code. Open Claude Code in the `nexxau/` repo, paste **one** batch, let it work, review the diff, commit. Then come back here, grab the next batch.

**Order matters.** Batch 1 deals with leaked secrets — that's life-and-death. Don't skip ahead.

**Before you start any batch:**
```bash
git checkout -b fix/batch-N-short-description
git status   # make sure your tree is clean
```

After Claude Code finishes:
```bash
git diff           # eyeball the changes
git diff --stat    # what files moved
npm run build      # does it still build (once you re-enable strict mode)
```

---

## Batch 1 — Secret rotation + history scrub (🔴 CRITICAL — do this first)

**Why these 4 together:** They're the existing-leak cleanup. Even if you fix every code bug, leaked credentials stay leaked until rotated. This batch is mostly *you* doing things outside the repo (rotating creds in dashboards) plus Claude removing them from the tree.

> Paste below this line ⬇

---

You are working in the `nexxau` Next.js + Python monorepo. We have a serious secrets-leak problem documented in `AUDIT_REPORT.md` sections 1.1, 1.3, 1.4, 1.5. I need you to do the in-repo cleanup. I will rotate the actual external credentials myself.
 
**Task 1 — Stop tracking environment files going forward.**

1. Read the current `.gitignore`. Confirm `.env`, `.env.*`, `**/.env`, `**/.env.*` are listed (they are). Good.
2. The files `app/.env.local.backup` and `app/.env.local.broken` are tracked by git (`git ls-files | grep env` confirms it). Run:
   ```bash
   git rm --cached app/.env.local.backup app/.env.local.broken
   ```
   Then delete them from disk:
   ```bash
   rm app/.env.local.backup app/.env.local.broken
   ```
3. Also `git rm --cached` (do NOT delete from disk yet) any other tracked `.env*` files you find with `git ls-files | grep -iE '\.env|cookies\.txt|supabase-ca|\.pem'`. Show me the list before doing it.

**Task 2 — Untrack the database dumps.**

1. `db_backup.sql` and `db_public_data.sql` at the repo root are 627 KB and 603 KB of real PII (users, emails, addresses, bcrypt password hashes). Both are tracked.
2. Add the following lines to `.gitignore`:
   ```
   # Database dumps - never commit these
   *.sql.bak
   db_backup.sql
   db_public_data.sql
   dump.rdb
   ```
3. Untrack them: `git rm --cached db_backup.sql db_public_data.sql`. Do NOT delete from disk; I may still need them locally.
4. **Important:** Tell me explicitly that `git rm --cached` only removes them from the next commit forward. The full file content is still in git history. To purge history I need to run `git filter-repo --path db_backup.sql --path db_public_data.sql --invert-paths` separately (it's not pip-installed yet). Print the exact one-liner I should run after this commit lands and warn me it requires force-pushing the branch.

**Task 3 — Move MediaMTX credentials out of the YAML.**

1. Open `mediamtx.yml`. The `authInternalUsers` block currently has `user: "admin"` / `pass: "nexxau"` hardcoded.
2. Replace the literal password with environment variable substitution. MediaMTX supports `${ENV_VAR}` interpolation. Change to:
   ```yaml
   authInternalUsers:
     - user: "${MEDIAMTX_USER}"
       pass: "${MEDIAMTX_PASS}"
       ips: []
       permissions:
         - action: read
         - action: publish
         - action: playback
         - action: api
   ```
3. Update `docker-compose.yml` and `docker-compose.production.yml` to pass `MEDIAMTX_USER` and `MEDIAMTX_PASS` into the `mediamtx` service via the `environment:` block (read from a `.env` file alongside the compose file, which is gitignored).
4. Add `MEDIAMTX_USER=` and `MEDIAMTX_PASS=` to `app/env.example` and any other `*.env.example` so future devs know to set them.
5. Remind me to set strong values in my local `.env` and in whatever production secret store I use, and to update any code that connects to the MediaMTX API with the old `admin:nexxau` credentials.

**Task 4 — Fix `k8s/secrets.yaml`.**

1. The file `k8s/secrets.yaml` has placeholder secrets where the base64 decodes to literally `jwt_secret`, `postgres_password`, etc., with helpful comments revealing the cleartext.
2. Replace the entire file with a template that uses `stringData:` (so future readers can see clearly that values must be filled in) and contains only placeholder comments — never actual values. Example shape:
   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: nexxau-secrets
     namespace: nexxau
   type: Opaque
   stringData:
     # Fill these in via `kubectl create secret generic nexxau-secrets --from-literal=...`
     # or via Sealed Secrets / External Secrets Operator.
     # DO NOT commit real values here.
     POSTGRES_PASSWORD: "REPLACE_ME"
     REDIS_PASSWORD: "REPLACE_ME"
     JWT_SECRET: "REPLACE_ME"
     JWT_REFRESH_SECRET: "REPLACE_ME"
     NEXTAUTH_SECRET: "REPLACE_ME"
     SENTRY_DSN: "REPLACE_ME"
     GRAFANA_PASSWORD: "REPLACE_ME"
     SMTP_PASSWORD: "REPLACE_ME"
   ---
   # tls-secret should be created out-of-band:
   # kubectl create secret tls tls-secret --cert=./tls.crt --key=./tls.key -n nexxau
   ```
3. Also create a sibling file `k8s/README.md` (small, ~20 lines) explaining: never commit real secrets, use SealedSecrets/ExternalSecrets in CI, and how to populate the placeholders manually for a one-off deploy.

**Stop conditions / things you must NOT do:**
- Do not run `git filter-repo` yourself. Just print the command for me.
- Do not delete `db_backup.sql` or `.env` from my disk — only untrack from git.
- Do not modify any actual application code. This batch is config and repo hygiene only.

**When done, summarize:**
- Files removed from git tracking.
- Files modified.
- The exact `git filter-repo` one-liner I need to run next.
- A list of the credentials I personally need to rotate in external dashboards (Twilio, Supabase, Gmail App Password, MediaMTX, NextAuth/JWT secrets), and where each lives.

> End of Batch 1 ⬆

---

## Batch 2 — Kill the dangerous unauthenticated endpoints (🔴 CRITICAL)

**Why these 4 together:** Every one is a "POST this URL with an empty body and ruin someone's day" endpoint. Each is independent and should be a small change.

> Paste below this line ⬇

---

You are working in the `nexxau` Next.js + Python monorepo. I need you to neutralize four dangerous, unauthenticated endpoints documented in `AUDIT_REPORT.md` sections 2.1, 2.2, 2.5, 2.7.

**Task 1 — Delete `/api/seed`.**

1. Delete the file `app/app/api/seed/route.ts`. It's a public POST that calls `prisma.user.deleteMany()`, `prisma.worker.deleteMany()`, `prisma.worksite.deleteMany()`, `prisma.company.deleteMany()` and creates `admin@nexxau.com` with hardcoded password `admin123`. The only "guard" is `process.env.NODE_ENV === 'production'`, which fails open if `NODE_ENV` is unset.
2. Search the whole repo for any `fetch('/api/seed')` or links to `/api/seed` — there shouldn't be any in production code, but check `app/scripts/`, any test file, any markdown or shell script. Remove every reference. Tell me what you found.
3. If the seeding behavior is actually needed for local dev, create `app/scripts/seed-dev.ts` that does the equivalent work. It must:
   - Refuse to run if `process.env.NODE_ENV === 'production'`.
   - Refuse to run if `process.env.DATABASE_URL` points to anything other than localhost or a `*.supabase.co` URL marked clearly as the dev project (just use a `--force` CLI flag the user must pass).
   - Take a `--password <pw>` argument; refuse if shorter than 12 chars. No hardcoded passwords.
4. Update `app/package.json` `scripts` to add `"seed:dev": "npx tsx scripts/seed-dev.ts"`.

**Task 2 — Delete `/api/test/create-test-users`.**

1. Delete `app/app/api/test/create-test-users/route.ts`. Same pattern: hardcoded `worker123` password, `NODE_ENV` guard only, instantiates a fresh `PrismaClient()` (connection leak).
2. Look at the rest of `app/app/api/test/` (subdirs `get-company-admin`, `safety-violation`). For each one, check if it does writes or reveals data. If yes, either (a) delete it, or (b) wrap it with an auth guard that requires `SUPER_ADMIN`. Tell me which you chose for each and why.
3. Same treatment for `app/app/api/debug/`, `app/app/api/test-prisma/route.ts`, `app/app/api/test-email/route.ts`, `app/app/api/test-cloudinary/route.ts`. These are smelly diagnostic endpoints that almost certainly leak DB shape, env state, or service tokens. List each one, what it does, and propose: delete or guard. Wait for my confirmation before deleting any of these — I want to see your list first.

**Task 3 — Add auth to `/api/cameras/snapshot`.**

1. Open `app/app/api/cameras/snapshot/route.ts`. Right now the POST handler reads `camera_id` and `snapshot` from the JSON body, finds the most recent alert without a `detectionSnapshot`, attaches the image, and triggers email notifications. Zero auth.
2. This endpoint is meant to be called from the YOLO/detection service, not browsers. Lock it down by requiring an internal service token:
   - At the top of the POST handler, before reading the body, read the `Authorization` header. Expect `Bearer <token>` where `<token>` matches `process.env.INTERNAL_SERVICE_TOKEN`.
   - If `INTERNAL_SERVICE_TOKEN` is unset (empty or missing from env), the handler must return `503 { error: 'Service token not configured' }` and log a clear error. Fail closed, never fail open.
   - Use a constant-time comparison (`crypto.timingSafeEqual` after converting both strings to `Buffer`), not `===`.
3. Add `INTERNAL_SERVICE_TOKEN=` to `app/env.example` with a comment explaining it must be a long random string shared with the YOLO/detection services.
4. Update `services/yolo-detection-service/src/nexxau_client.py` (and any other service that POSTs snapshots — search for `/api/cameras/snapshot` across `services/` and `ai-detection/`) to read `INTERNAL_SERVICE_TOKEN` from env and send it in the `Authorization: Bearer ...` header.
5. Show me a tiny test (under `app/__tests__/api/cameras/`) that asserts unauthenticated POST returns 401 and POST with a wrong token returns 401.

**Task 4 — Lock down FastAPI `backend/main.py`.**

1. Open `backend/main.py`. The CORS block has `allow_origins=["*"]` AND `allow_credentials=True`, which is broken-by-spec. Replace `allow_origins=["*"]` with a list read from env: `os.getenv("BACKEND_CORS_ORIGINS", "").split(",")`, falling back to `["http://localhost:3000"]` for dev only.
2. The `/api/detect` POST endpoint accepts arbitrary `UploadFile` with no auth and no size limit. Add:
   - A FastAPI dependency `verify_internal_token` that checks an `Authorization: Bearer <INTERNAL_SERVICE_TOKEN>` header (constant-time compare).
   - A maximum upload size of 10 MB. Read the file in chunks; abort if it exceeds the limit.
3. The `/ws/video/{stream_id}` WebSocket is the worst one — it accepts `stream_url` from the client and `cv2.VideoCapture(stream_url)` runs against it. Plus it falls back to `cv2.VideoCapture(0)` (local webcam) if the URL is bad. Refactor:
   - Require an `Authorization` header with the internal service token before `await websocket.accept()`. If missing/wrong, `await websocket.close(code=1008)` and return.
   - Remove the client-supplied `stream_url`. Instead, look up `stream_id` against the database (or, if this service can't reach the DB directly, against an allow-list dict loaded from env or a config file). Use the URL from your own records.
   - Delete the `cv2.VideoCapture(0)` fallback entirely. If the stream can't be opened, send an error and close the socket.
4. Pre-load the YOLO model in a startup hook with proper error handling instead of at module import time, so missing model files give a clear error rather than crashing imports.

**When done, summarize:**
- Files deleted, files modified.
- Any test/debug routes you flagged but did NOT touch (waiting for my decision).
- The new env vars added (`INTERNAL_SERVICE_TOKEN`, `BACKEND_CORS_ORIGINS`).
- A reminder that I need to set `INTERNAL_SERVICE_TOKEN` to the same value in: `app/.env`, `backend/.env`, `services/yolo-detection-service/.env`, and any production secret store.

> End of Batch 2 ⬆

---

## Batch 3 — Tenant isolation (🔴 CRITICAL)

**Why these 4 together:** Every one is the same root bug — a Prisma query that doesn't filter by `companyId`. Pattern is identical, fix pattern is identical, easier to do in one pass.

> Paste below this line ⬇

---

You are working in the `nexxau` Next.js monorepo. The audit found four routes that don't enforce multi-tenant isolation, documented in `AUDIT_REPORT.md` sections 2.3, 2.4, 2.6.

**Background.** The data model has `Company` → many `Worksite` → many `Camera`. Users belong to a `Company` (`User.companyId`) and may also have explicit `worksiteAccess` rows for individual worksites. Roles in increasing privilege are: `VIEWER`, `WORKER`, `SUPERVISOR`, `SITE_ADMIN`, `COMPANY_ADMIN`, `SUPER_ADMIN`. SUPER_ADMIN is the only role that may legitimately see across companies.

**Task 1 — Build a reusable `enforceCompanyScope` helper.**

1. Create `app/app/lib/auth-scope.ts`. Export a single function:
   ```ts
   export async function enforceCompanyScope(opts: {
     session: Session;
     resourceCompanyId: string | null;
   }): Promise<{ ok: true } | { ok: false; status: number; error: string }>
   ```
2. Behavior:
   - SUPER_ADMIN passes through.
   - For everyone else: load the actor's `companyId` from `prisma.user.findUnique({ where: { email: session.user.email }, select: { companyId: true } })`.
   - If actor has no `companyId`, deny (`status: 403`).
   - If actor's `companyId !== resourceCompanyId`, deny (`status: 403`).
   - Otherwise allow.
3. Add a sister helper `getActorCompanyId(session)` that returns `string | null` for the cases where you need to filter at query time, not after the fetch.
4. Add unit tests under `app/__tests__/lib/auth-scope.test.ts` covering: SUPER_ADMIN bypass, matching company, mismatched company, null company.

**Task 2 — Fix `GET /api/cameras` (the worst leak).**

1. File: `app/app/api/cameras/route.ts`, the `GET` handler.
2. Right now: if `worksiteId` is not provided, the handler runs `prisma.camera.findMany({ where: {} })` — **every camera in every tenant**.
3. Fix:
   - Make `worksiteId` optional but always scope to actor's company unless SUPER_ADMIN.
   - For non-SUPER_ADMINs: build `whereClause.worksite = { companyId: actorCompanyId }`. If `worksiteId` is also passed, AND it onto the existing constraint and verify access (which the existing code already does — keep that block).
   - For SUPER_ADMIN: keep the current behavior (no scope), but add a clear log line `[API /cameras] SUPER_ADMIN cross-tenant query`.
4. Strip the per-request `console.log` spam that includes `session.user.email`. Replace with structured logs at INFO level, message-only (no PII).

**Task 3 — Fix `GET /api/cameras/[id]` and `PATCH /api/cameras/[id]`.**

1. File: `app/app/api/cameras/[id]/route.ts`.
2. The DELETE handler in this same file already does the right thing (worksite + company check). Use it as a template.
3. **GET handler:** after `prisma.camera.findUnique` returns the camera, also fetch its worksite's `companyId`. Then call `enforceCompanyScope({ session, resourceCompanyId: worksite.companyId })`. If denied, return 403.
4. **PATCH handler:** same deal — verify camera's worksite's `companyId` matches the actor's company before applying any updates. Also: don't trust `body.metadata` to be safe — strictly whitelist the keys you accept (`name`, `streamUrl`, `location`, `zone`, plus a small allowed set inside `metadata` like `aiEnabled`, `recording`).
5. The GET response currently includes `password: '••••••••'` for cameras that have a stored credential. That's fine, but also make sure `streamUrl` doesn't contain embedded credentials. Strip `username:password@` from any returned RTSP URL using a small helper:
   ```ts
   function maskRtspCreds(url: string | null) {
     if (!url) return url;
     return url.replace(/^(rtsp:\/\/)([^@/]+)@/i, '$1***@');
   }
   ```

**Task 4 — Fix `PATCH` and `DELETE` `/api/users/[id]`.**

1. File: `app/app/api/users/[id]/route.ts`.
2. Two distinct bugs:
   - **Tenant escape:** A `COMPANY_ADMIN` can target a user in a different company.
   - **Role escalation:** The handler accepts `role` from the body and writes it to the DB without any allowlist. A `COMPANY_ADMIN` can promote anyone (including themselves) to `SUPER_ADMIN`.
3. Fix in PATCH:
   - Load the *target* user's `companyId` early. Call `enforceCompanyScope({ session, resourceCompanyId: target.companyId })`.
   - Build a per-actor role allowlist:
     ```ts
     const allowedRoles: Record<string, string[]> = {
       SUPER_ADMIN: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'],
       COMPANY_ADMIN: ['SITE_ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'],
     };
     ```
     If the requested `role` is not in `allowedRoles[actorRole]`, return 403 with a clear message.
   - Reject self-promotion: if the actor is editing their own user (`target.id === actor.id`) AND `role` is being changed, return 403 — admins should not change their own role.
   - Don't echo `error.message` to the client on the 500 path. Log it server-side, return a generic message.
4. Fix in DELETE: same `enforceCompanyScope` check on the target. Also block deleting self (`if (target.id === actor.id) return 400`).
5. Same treatment for the legacy `app/app/api/admin/users/[id]/[action]/route.ts` `update` action — it accepts `role` in the body and just writes it. SUPER_ADMIN-only is enforced for the whole route (good) but the `update` action should still validate the role against the allowlist for whoever is calling it (mainly to prevent a SUPER_ADMIN from accidentally creating a typo role like `"admin"` lowercase that won't match enum checks elsewhere). Reject if `role` isn't in the Prisma enum.

**Task 5 — Add tests for the fixes.**

Create `app/__tests__/api/tenant-isolation.test.ts` (Jest). Mock prisma and session. Cover:
- A `WORKER` from company A calling `GET /api/cameras` only sees cameras from company A.
- A `WORKER` from company A calling `GET /api/cameras/[id]` for a camera in company B gets 403.
- A `COMPANY_ADMIN` from company A trying to PATCH a user in company B gets 403.
- A `COMPANY_ADMIN` trying to set `role: 'SUPER_ADMIN'` gets 403.
- A `SUPER_ADMIN` can do all of the above.

If mocking session is awkward in this codebase, write the tests as integration-style against a test database — but tell me before you go that route so I know it'll need DB setup.

**When done, summarize:**
- The new helper file and its tests.
- The four route files modified with a one-line description of each change.
- Any place where you noticed the same pattern but didn't fix it because it wasn't in scope (e.g., other routes that probably need the same `enforceCompanyScope` call). Just list them — don't fix them in this batch.

> End of Batch 3 ⬆

---

## Batch 4 — Build safety + CORS + dev script (🔴 CRITICAL but tiny diffs)

**Why these 4 together:** Each is a one-line config change with potentially huge fallout (turning on TypeScript strict mode will break the build until the underlying type errors are fixed). Doing them together forces you to confront the consequences in one PR, not bury them.

> Paste below this line ⬇

---

You are working in the `nexxau` Next.js monorepo. Documented in `AUDIT_REPORT.md` sections 3.1, 3.2, 3.3, 5.8.

**Task 1 — Re-enable TypeScript and ESLint at build time.**

1. Open `app/next.config.js`. Find the lines:
   ```js
   eslint: { ignoreDuringBuilds: true },
   typescript: { ignoreBuildErrors: true },
   ```
   Change both `true` values to `false`.
2. Same change in the root `next.config.js`.
3. Run `npm run build` (in the `app/` directory). It will likely fail with a wall of errors. **Do not auto-fix them.** Instead, capture the first 30 lines of the error output, count the number of distinct error files, and group errors by category (e.g., "12 'any' implicit", "5 'cannot find module'", "3 'property does not exist'").
4. Report back to me with the categorized list. Do NOT proceed to fix individual type errors in this batch — that's a separate effort that could span many PRs. Just leave both flags as `false` so we can see the damage.
5. If `npm run build` succeeds (unlikely but possible), say so and we're done with this task.

**Task 2 — Remove the dev TLS-bypass.**

1. Open `app/package.json`. Line 6:
   ```json
   "dev": "NODE_TLS_REJECT_UNAUTHORIZED=0 NODE_OPTIONS='--max-old-space-size=4096' next dev"
   ```
2. Strip the `NODE_TLS_REJECT_UNAUTHORIZED=0` prefix:
   ```json
   "dev": "NODE_OPTIONS='--max-old-space-size=4096' next dev"
   ```
3. Now find out *why* it was there. Search the codebase for any HTTPS call that might fail TLS validation against Supabase or another upstream (`grep -rn "https://" app/app/lib | head -50` gives you a starting point). Look at `app/app/lib/prisma.ts`, any axios config, any direct `fetch` to the Supabase domain.
4. Remember: the `supabase-ca.pem` file at the repo root is actually an HTML 301 page (audit §1.8), so any code referencing it as a CA cert is broken. Find references with `grep -rn "supabase-ca" .`. If something is using it, refactor to either (a) trust the system CA store (default — works for Supabase), or (b) re-fetch the actual Supabase CA bundle from `https://supabase.com/docs/guides/platform/ssl-enforcement` with `curl -L -o supabase-ca.pem ...`.
5. Run `npm run dev` (briefly, then Ctrl-C). If it produces TLS errors against any upstream, capture the error and tell me — don't put the env var back.

**Task 3 — Tighten CORS on `/api/*`.**

1. Open `app/next.config.js`. The `headers()` function returns:
   ```js
   { key: 'Access-Control-Allow-Origin', value: '*' }
   ```
2. Replace with an allowlist driven by env. Define at the top of the config:
   ```js
   const allowedOrigins = (process.env.ALLOWED_API_ORIGINS || 'http://localhost:3000')
     .split(',').map(s => s.trim()).filter(Boolean);
   ```
3. Next.js static `headers()` doesn't support per-request matching. Move CORS handling to a small middleware in `app/app/api-cors.ts` (a helper imported by route handlers) or add a top-level middleware that runs only on `/api/*`. Either way, the runtime check should be:
   - Read `Origin` from the request.
   - If `Origin` is in `allowedOrigins`, set `Access-Control-Allow-Origin: <origin>` (echo it back, never `*`).
   - Otherwise, omit the header (browser will block).
   - Set `Vary: Origin` always.
4. Remove the static header block from `next.config.js` once the middleware handles it.
5. Add `ALLOWED_API_ORIGINS=https://nexxau.com,https://www.nexxau.com,http://localhost:3000` to `app/env.example`.

**Task 4 — Fix the Vercel install command.**

1. Open `vercel.json`. Line 4:
   ```json
   "installCommand": "pnpm install --no-frozen-lockfile"
   ```
2. Change to:
   ```json
   "installCommand": "pnpm install --frozen-lockfile"
   ```
3. Run `pnpm install` locally to confirm the lockfile is up to date with `package.json`. If pnpm complains the lockfile is out of sync, regenerate with `pnpm install` (no flags), commit `pnpm-lock.yaml`, then re-run with `--frozen-lockfile` to confirm it passes.
4. Same audit: `package.json` `postinstall` calls `npx prisma@6.19.3 generate`. The `prisma` CLI is also a devDep at `^6.19.1` in `app/package.json` but not at the root. Add `"prisma": "6.19.3"` (exact, no caret) to `package.json` `devDependencies`, then change `postinstall` to `prisma generate` (no `npx` version pin).
5. Same fix in `vercel.json`'s `buildCommand`: `prisma generate && next build`.

**When done, summarize:**
- The full output of `npm run build` (categorized error counts, no fix attempts) so I can plan the next batch.
- Whether `npm run dev` works without the TLS bypass.
- The new env var (`ALLOWED_API_ORIGINS`) and where to set it in dev/prod.

> End of Batch 4 ⬆

---

## Batch 5 — Auth hardening (🟠 HIGH)

**Why these 4 together:** All touch `app/app/lib/auth.ts` and the password-reset flow. Easier to review one auth-focused PR than spread changes across multiple.

> Paste below this line ⬇

---

Working in the `nexxau` Next.js app. From `AUDIT_REPORT.md` sections 2.8, 2.9, 2.10, 2.12.

**Task 1 — Fix the timing leak in NextAuth `authorize`.**

1. File: `app/app/lib/auth.ts`, the `authorize` function in the `CredentialsProvider`. Around line 140:
   ```ts
   const user = await prisma.user.findFirst({ ... });
   if (!user || !user.password) return null;
   const isPasswordValid = await bcrypt.compare(...);
   ```
2. When the user doesn't exist, the function returns immediately. When they do exist, it runs `bcrypt.compare`, which takes ~100 ms. That delta lets an attacker enumerate valid emails.
3. Fix: always run a `bcrypt.compare` against a fixed dummy hash when the user is missing. Generate the hash once at module load:
   ```ts
   import bcrypt from 'bcryptjs';
   const DUMMY_HASH = bcrypt.hashSync('this-will-never-match-anything', 12);

   // ...inside authorize, replace the early return:
   if (!user || !user.password) {
     await bcrypt.compare(credentials.password ?? '', DUMMY_HASH);
     return null;
   }
   ```
4. Same handling for the impersonation branch — never return faster on "user not found" than on "user found but token mismatch".
5. Strip the `console.info('[auth] Login success for', emailNormalized)` and similar logs that contain raw emails. Replace with `console.info('[auth] Login success', { userId: user.id })`.

**Task 2 — Add Redis-backed login rate limiting.**

1. The repo already deploys Redis (`docker-compose.production.yml`). We need a small wrapper.
2. Create `app/app/lib/rate-limit-redis.ts`:
   ```ts
   import { createClient, RedisClientType } from 'redis';
   let client: RedisClientType | null = null;
   async function getClient() { ... lazy-init from process.env.REDIS_URL ... }
   export async function checkLoginRateLimit(key: string, opts: {
     limit: number;          // e.g., 10 per window
     windowSeconds: number;  // e.g., 900 = 15 min
   }): Promise<{ allowed: boolean; remaining: number; resetAt: number }>
   ```
   Implementation: `INCR` a key like `login:rl:${ip}:${email}`, set `EXPIRE` on first hit, return allowed if count <= limit.
3. In `auth.ts` `authorize`, before the bcrypt step:
   - Compute key as `${ipFromHeaders}:${emailNormalized}`. Pull the IP from `req.headers['x-forwarded-for']` (take the first comma-separated value, fall back to a constant `'unknown'`).
   - Call `checkLoginRateLimit(key, { limit: 10, windowSeconds: 900 })`. If not allowed, sleep ~150ms (to keep timing roughly equivalent to bcrypt) and return `null` with a server-side log noting the rate-limit hit.
4. If `REDIS_URL` is not set, fall back gracefully: log a warning at startup ("Login rate limiting disabled — set REDIS_URL"), and treat every request as allowed. We do not want auth to break in local dev where Redis isn't running.
5. Replace the in-memory `lib/rate-limit.ts` callers with this Redis-backed version. (Search for `import.*rate-limit` and `withRateLimit\(` to find them.) Delete the old file once nothing imports it. **Tell me what you found and which routes you migrated.**

**Task 3 — Fix the impersonation token (no replay).**

1. File: `app/app/lib/impersonation-token.ts`.
2. Currently the token is a 10-min HS256 JWT, no `jti`, no revocation. Anyone who captures it (logs, network) can replay it for the full window.
3. Add a Prisma model `ImpersonationToken`:
   ```prisma
   model ImpersonationToken {
     jti        String   @id
     adminId    String
     targetUserId String
     companyId  String
     issuedAt   DateTime @default(now())
     consumedAt DateTime?
     expiresAt  DateTime
     @@index([targetUserId])
     @@index([adminId])
   }
   ```
   Add the corresponding migration. Run `prisma migrate dev --name add_impersonation_tokens`.
4. Modify `signImpersonationToken`:
   - Generate a `jti` with `crypto.randomUUID()`.
   - Insert a row into `ImpersonationToken` with `consumedAt: null`, `expiresAt: now + 10 minutes`.
   - Sign the JWT with `jti` in the claims.
5. Modify `verifyImpersonationToken` to be `async`:
   - Decode JWT.
   - Look up the `jti` in the DB.
   - Reject if not found, expired, or already consumed.
   - On success, set `consumedAt = now()` (one-shot).
   - Also write an `AuditLog` row capturing `{ adminId, targetUserId, companyId, action: 'IMPERSONATION_USED' }`.
6. Update the `authorize` callsite in `auth.ts` to handle the now-async `verifyImpersonationToken`.

**Task 4 — Add a real password reset token field.**

1. The current code reuses `User.verificationToken` and `User.inviteExpires` for both invite-claim and password-reset. That's fragile — issuing a reset invalidates a pending invite.
2. Add Prisma fields:
   ```prisma
   model User {
     ...
     resetToken         String?   @unique
     resetTokenExpires  DateTime?
   }
   ```
   Migration name: `add_password_reset_fields`.
3. Update `app/app/api/auth/forgot-password/route.ts` to write `resetToken` and `resetTokenExpires` instead of `verificationToken` / `inviteExpires`.
4. Update `app/app/api/auth/reset-password/route.ts` to look up by `resetToken` (not `verificationToken`) and check `resetTokenExpires`.
5. Update `app/app/api/admin/users/[id]/[action]/route.ts` `reset-password` action to use the new fields.
6. Don't touch the invite-claim flow — leave `verificationToken` / `inviteExpires` alone for invites. Search for `verificationToken` across the codebase and document any callsite you didn't change so I can verify I'm not breaking the invite flow.

**Task 5 — Strip PII from onboarding logs.**

1. File: `app/app/api/users/onboard/route.ts`.
2. Lines around 65–80: when token-not-found, the handler queries every user with a non-null `inviteToken` and logs their email + token prefix. Delete that whole debug block.
3. Replace with a single log: `console.warn('[ONBOARD] Token not found')`. No emails, no token fragments.
4. Similar cleanup for any other `console.log` in this file that includes raw email or token (search for `console.log` references to `email`, `token`, `password`).

**When done, summarize:**
- The new Prisma migrations created and the exact `prisma migrate dev` command to run.
- Files modified.
- Whether the existing `__tests__/lib/jwt.test.ts` still passes.
- A reminder that I need to set `REDIS_URL` in env (or accept the rate-limit-disabled fallback in dev).

> End of Batch 5 ⬆

---

## Batch 6 — Infra hardening (🟠 HIGH)

**Why these 4 together:** All in `docker-compose.production.yml` and adjacent infra files. Diff stays in one place.

> Paste below this line ⬇

---

Working in the `nexxau` repo, infra files. From `AUDIT_REPORT.md` sections 5.1, 5.2, 5.3, 5.4.

**Task 1 — Stop publishing Postgres and Redis to the public network.**

1. File: `docker-compose.production.yml`.
2. The `postgres` service has `ports: ["5432:5432"]` and `redis` has `["6379:6379"]`. These bind to `0.0.0.0` by default — if this compose file is deployed on a host with a public IP, the DB and cache are reachable from the internet.
3. Remove the `ports:` block from both services entirely. Inter-service communication uses the docker network (other services already reference them by hostname `postgres` and `redis`, so this is safe).
4. If you actually need DB access from the host (rare in production, but useful for `psql`-from-the-bastion patterns), bind to localhost only by changing the value to `"127.0.0.1:5432:5432"` — but default is "remove the line."
5. Same audit on `mediamtx` — RTSP and HLS need to be public, but the API port `9000` and metrics port `9001` (if exposed) should be internal-only. Confirm what's mapped and either drop or localhost-bind the API/metrics ports.

**Task 2 — Lock down Prometheus / Grafana / Alertmanager.**

1. `docker-compose.production.yml`, the `prometheus` service has `--web.enable-lifecycle` in its command. Remove that flag — it lets anyone POST `/-/reload` or `/-/quit`.
2. Drop the public `ports: ["9090:9090"]` from `prometheus`. Alertmanager (`9093:9093`) and Grafana (`3001:3000`) too.
3. Either:
   - **Option A:** put all three behind nginx with basic auth (the `nginx` service already exists and proxies the app). Add upstream blocks for grafana/prometheus/alertmanager and set up `htpasswd` auth.
   - **Option B (recommended):** make them only reachable via internal docker network, and access them via `kubectl port-forward` / SSH tunnel from a bastion. This requires no extra config — just remove the `ports:` blocks.
4. Pick Option B for now. Drop the port mappings from all three services. I'll set up a SSH tunnel locally when I need to view dashboards.
5. Grafana already has `GF_USERS_ALLOW_SIGN_UP=false` — good. Verify it stays that way and add `GF_AUTH_ANONYMOUS_ENABLED=false` explicitly.

**Task 3 — Pin Docker images.**

1. `docker-compose.production.yml` and `docker-compose.yml` use `:latest` for `bluenviron/mediamtx`, `prom/prometheus`, `grafana/grafana`, `prom/alertmanager`, `nginx:alpine`. Some are minor-pinned (`postgres:15-alpine`, `redis:7-alpine`).
2. For each, replace `:latest` with the current stable major.minor tag at minimum (e.g., `bluenviron/mediamtx:1.13`, `prom/prometheus:v3.5`, `grafana/grafana:11.4`, `prom/alertmanager:v0.28`, `nginx:1.27-alpine`). Use the actual current tags — check Docker Hub for each before committing.
3. Better: pin to a digest (`@sha256:...`) for true reproducibility. Get the digest with `docker pull <image>:<tag>` then `docker images --digests`. For now, tag-pin is acceptable — call out in a comment that digest-pin is the eventual target.
4. Same audit on `k8s/postgres.yaml` and any other K8s manifest using `:latest` or floating tags.

**Task 4 — Add resource limits.**

1. In `docker-compose.production.yml`, add `deploy.resources` blocks to every service:
   ```yaml
     deploy:
       resources:
         limits:
           cpus: '...'
           memory: ...
         reservations:
           cpus: '...'
           memory: ...
   ```
2. Reasonable starting points:
   - `postgres`: limit 2 CPU / 2Gi mem, reserve 0.5 / 1Gi.
   - `redis`: limit 1 CPU / 512Mi, reserve 0.25 / 128Mi.
   - `app`: limit 2 CPU / 2Gi, reserve 0.5 / 512Mi.
   - `ai-detection`: limit 4 CPU / 4Gi, reserve 1 / 2Gi (or per your GPU setup).
   - `mediamtx`: limit 2 CPU / 1Gi, reserve 0.5 / 256Mi.
   - `prometheus`: limit 1 CPU / 1Gi.
   - `grafana`, `alertmanager`, `nginx`: 0.5 CPU / 256Mi each.
3. Note for me in the summary: `deploy.resources` is only enforced by `docker stack deploy`/Swarm, not by plain `docker compose up`. If we deploy with plain compose, we additionally need `mem_limit:` and `cpus:` at the top level of each service. Add those too (they're enforced by the docker engine directly).
4. Also drop the legacy `version: '3.8'` line at the top of `docker-compose.production.yml` — Compose v2 ignores it with a warning.

**When done, summarize:**
- Ports removed from public exposure.
- Image tags chosen.
- Note on resource limits and which deployment mode they apply to.
- Anything you noticed but didn't fix (e.g., missing `restart: unless-stopped` on a service, or healthcheck gaps).

> End of Batch 6 ⬆

---

## Batch 7 — Code-quality cleanup (🟡 MEDIUM)

**Why these 4 together:** Each is small and stylistic; bundling avoids 4 tiny PRs.

> Paste below this line ⬇

---

Working in the `nexxau` repo. From `AUDIT_REPORT.md` sections 3.5, 3.9, 4.1, 4.2.

**Task 1 — Pin Python dependencies.**

1. Files to fix: `requirements.txt` at the repo root, plus every `services/*/requirements.txt`.
2. For each one, replace `>=` with exact `==` pins. Use the latest stable as of today, but match what's reasonable for the rest of the stack. Example for the root `requirements.txt`:
   ```
   ultralytics==8.3.40
   torch==2.5.1
   torchvision==0.20.1
   numpy==1.26.4
   Pillow==11.0.0
   opencv-python==4.10.0.84
   tqdm==4.67.1
   matplotlib==3.9.3
   seaborn==0.13.2
   ```
   (Verify each pin exists on PyPI before committing — Claude Code can fetch PyPI metadata.)
3. For each service, do the same. Be careful with services that need `opencv-python-headless` vs `opencv-python` — don't switch types, just pin the existing one.
4. Generate a lockfile with `pip-compile` if available, or document in a comment block above each file: "Versions pinned manually — to upgrade, edit and run `pip install -r requirements.txt`."

**Task 2 — Delete one-off "fix" scripts.**

1. At the repo root: `start_all.sh`, `start_optimized.sh`, `start-ai-cameras.sh`, `start-mediamtx.sh`, `start-nexxau.sh` — keep one canonical start script (probably `docker compose up`, or a thin wrapper) and delete the rest.
2. Inside `app/`: `COMPLETE_FIX.sh`, `RESTART_NOW.sh`, `add-email-vars.sh`, `fix-all-prisma-imports.sh`, `fix-contact-form.sh`, `fix-database.sh`, `fix-email-config.sh`, `fix-file-limit.sh`, `fix-route-handlers.sh`, `fix-nextjs15-routes.py`, `restart-server.sh`, `update-messaging-service.sh`, plus the `test-*.js` files at the same level (test-cust-rules-simple.js, test-custom-rules.js, test-email.js, test-messaging-service.js, test-multi-sms.js, test-sms.js, show-env.js).
3. For each one, before deleting:
   - Read the first 20 lines to figure out what it does.
   - If it does something useful that isn't replicated elsewhere (e.g., a real test script), tell me and don't delete.
   - Otherwise, delete.
4. Also delete the empty/abandoned files at the repo root: `main` (0 bytes), `FINAL_VERIFICATION_REPORT.json` (0 bytes), `README.md` (1 byte). Replace `README.md` with a real one — see Task 5 below.
5. Inside `app/scripts/`: keep the seed scripts and the `deploy-production.sh`. Delete everything starting with `fix-` after confirming each one's purpose. List them in your summary.

**Task 3 — Fix `camera_connector.py`.**

1. File: `camera_connector.py` at the repo root.
2. Add `import numpy as np` at the top.
3. URL-encode credentials when building the auth URL. Replace:
   ```py
   auth_url = f"rtsp://{self.username}:{self.password}@{self.rtsp_url.split('://')[1]}"
   ```
   with:
   ```py
   from urllib.parse import quote
   user = quote(self.username, safe='')
   pwd = quote(self.password, safe='')
   host = self.rtsp_url.split('://', 1)[1]
   auth_url = f"rtsp://{user}:{pwd}@{host}"
   ```
4. Add timeouts: pass `cv2.CAP_PROP_OPEN_TIMEOUT_MSEC` to `VideoCapture` after creation, and add `timeout=10` to `requests.Session().get()` in `CloudCamera`.
5. The factory at line 115 unpacks `**config` for all three classes, but `CloudCamera` takes `api_url`/`api_key`, not `rtsp_url`/`username`/`password`. Either accept dicts and pick the right keys per type, or document expected keys per type and add `KeyError` handling. Add a small test at the bottom of the file (or a dedicated `test_camera_connector.py`) showing the expected config shape.
6. Or — if this file is truly legacy and unused (which I suspect, since the Next.js app uses Prisma + MediaMTX, not OpenCV directly) — propose deleting it instead. Run `grep -rn "camera_connector" .` to see if anything imports it. Tell me what you found.

**Task 4 — Fix or delete the Django leftovers.**

1. Files: `views.py`, `forms.py`, `models.py` at the repo root.
2. `views.py` calls `test_milestone_connection`, `test_cloud_connection`, `test_rtsp_connection` which aren't defined anywhere in the module. The handlers also have an `UnboundLocalError` if `camera_type` falls through.
3. Run `grep -rn "from .views import\|from .forms import\|from .models import\|from forms import\|from views import\|from models import" .` and `grep -rn "import views\|import forms\|import models" .`. If nothing imports them, this is dead Django code and we should delete the three files plus `requirements.txt` ultralytics-only block can stay (it's unrelated).
4. If something does import them, surface that to me and we'll talk about it.
5. After deletion, also remove any orphaned `templates/` directories that the views were rendering, if they exist at the root level.

**Task 5 — Write a real `README.md`.**

1. Replace the 1-byte `README.md` at the repo root with a proper one (~80–120 lines). Include:
   - One-paragraph description of what Nexxau is (multi-tenant PPE / safety violation detection platform with cameras → YOLO → alerts).
   - Stack: Next.js 15 + Prisma + Postgres (Supabase) + Python YOLO services + MediaMTX + Docker.
   - Local dev setup: prerequisite versions (Node 20, Python 3.11, pnpm, docker), `cp app/env.example app/.env.local`, what to fill in, `pnpm install`, `pnpm dev` from `app/`.
   - Production deploy: the Vercel + Docker Compose hybrid (Next.js on Vercel, Python services on a host running compose).
   - Repo layout (what's in `app/`, `services/`, `infrastructure/`, etc.). Note explicitly which `services/*` directories are **empty / not yet implemented** (`api-gateway`, `auth-service`, `camera-service`, `notification-service`).
   - Where to find the security audit (`AUDIT_REPORT.md`), the fix prompts (`CLAUDE_CODE_FIX_PROMPTS.md`), and the migration status (`IMPLEMENTATION_STATUS.json`).
   - A "secrets handling" section reminding contributors never to commit `.env*`, db dumps, certs, or cookie files.
2. If `IMPLEMENTATION_STATUS.json` is wrong (e.g., now more is implemented), update it too.

**When done, summarize:**
- Files deleted (full list).
- Pinned Python versions (a table).
- Whether `camera_connector.py` and the Django files are dead → deleted, or live → fixed.

> End of Batch 7 ⬆

---

## Batch 8 — Architectural cleanup (🟡 MEDIUM)

**Why these 4 together:** Each is a "make a decision and follow through" task about what's actually in this repo. None of them are urgent, but they're confusing for any new contributor.

> Paste below this line ⬇

---

Working in the `nexxau` repo. From `AUDIT_REPORT.md` section 6 and adjacent.

**Task 1 — Resolve the empty service directories.**

1. The directories `services/api-gateway/`, `services/auth-service/`, `services/camera-service/`, `services/notification-service/` are completely empty.
2. For each, decide:
   - Is it functionality already covered by the Next.js monolith? (Likely yes for `auth-service` — NextAuth handles auth in `app/`. Probably yes for `api-gateway` — Vercel/Next.js does API routing.)
   - If yes → `git rm -rf` the directory.
   - If genuinely planned for the future → put a `README.md` inside explaining what it'll do, why it's empty, and a tracking issue link.
3. Don't make this decision unilaterally — propose deletion vs. placeholder for each of the four, and wait for me to confirm before removing.
4. Do delete the `_template-nodejs/` and `_template-python/` directories outright if no service uses them as a starter — they're confusing template clutter. Confirm by checking if any other service has files that look templated from those.

**Task 2 — Resolve duplicate `package.json`.**

1. The root `package.json` (`nexxau-monorepo`) and `app/package.json` (`sitesafe-new`) duplicate ~80% of dependencies, but with version drift (audit §3.4):
   - `@prisma/client`: root `^6.19.1` vs app `^6.7.0`
   - `next`: root `15.2.6` vs app `^15.5.15`
2. The root claims `"workspaces": ["services/*", "packages/*"]` — so `app/` is NOT actually a workspace member, it's a parallel project that happens to live inside.
3. Decide one of two paths:
   - **A. Make `app/` a real workspace.** Add `"app"` to the root `workspaces` array. Hoist common deps to root, leave only app-specific ones in `app/package.json`. Delete the root-level dependencies that are clearly only used by Next.js.
   - **B. Make root a thin wrapper.** If `app/` is the real Next.js project, the root `package.json` should only contain the orchestration scripts and dev tooling, not all the React/Next/Prisma deps. Delete the root's frontend dependencies.
4. Recommended: **Option B** is faster. The Vercel build command runs `next build` from the root context already, so as long as `app/` has the deps it's fine.
5. Also fix `app/package.json` having two `description` fields (lines 5 and 135). Delete the empty one.
6. Pick one license stance: root is `private: true` with no license; `app/` claims `ISC`. Either both `private: true` (recommended), or both with the same explicit license.

**Task 3 — Resolve duplicate config files.**

1. `next.config.js` AND `next.config.ts` both exist at the root. Same in `app/`. Same for `postcss.config.js` AND `postcss.config.mjs`. Next.js picks one and ignores the others; whichever it picks is non-obvious.
2. For each pair, look at both files. Pick the one that's actually doing something (the bigger one, usually). Delete the other. Tell me which you kept.
3. Specifically: `app/next.config.js` is the substantive one (has Sentry wiring, CORS headers, etc.). Delete `app/next.config.ts` if the `.js` is in use.
4. Similarly, the root `next.config.js` is small. The root probably doesn't need a Next config at all (Next runs from inside `app/`). Delete the root one if Next isn't building from the root.

**Task 4 — MFA: wire it up or rip it out.**

1. The files `app/app/api/auth/mfa/setup/route.ts` and `app/app/api/auth/mfa/verify/route.ts` exist. The login flow in `app/app/lib/auth.ts` does not call MFA verification.
2. Decide:
   - **Wire it up:** modify `authorize` in `auth.ts` so that after password verification, if the user has `mfaEnabled: true` (add the field if missing), the function returns `null` unless an `mfaCode` was also provided in `credentials` and verifies via `speakeasy` (already in deps). Add the corresponding UI handling for the MFA prompt.
   - **Rip it out:** delete the two route files, drop `speakeasy` and `qrcode` from deps if not used elsewhere.
3. **Don't decide unilaterally** — read both routes' code, summarize what they do, and ask me which path. This is a product decision.

**Task 5 — Clean up the worktree mirror.**

1. The directory `.claude/worktrees/stupefied-poincare/` is a full mirror of the repo with the same secrets and DB dumps. It's not in git but it's still on disk.
2. Confirm with me first, then `rm -rf` it. Also add `.claude/worktrees/` to `.gitignore` if it isn't already (it's already inside `.claude/` which Claude Code typically gitignores by default, but verify).

**When done, summarize:**
- Decisions you made vs. decisions waiting on me.
- Repo layout after cleanup (a tree-style listing of the top two levels).
- Net file count change (+/-).

> End of Batch 8 ⬆

---

## After all batches: optional follow-ups

If you make it through all 8 batches, the remaining work is:

- Write actual tests (currently 4 Jest + 2 Playwright = ~6 test files for ~150 routes).
- Full TypeScript strict-mode error cleanup (whatever Batch 4's `npm run build` revealed).
- Replace the legacy in-memory rate limiter for non-login routes with the Redis version.
- Add a CI pipeline (`.github/workflows/`) that actually runs `pnpm test:ci` and `pnpm lint` and `npm run build` on every PR. Right now `.github/` exists but I haven't audited what's in it.
- Decide whether the empty `docs/` and `figma-design/` directories belong in this repo.

---

## Quick takeaways (fast read)

- **Batch 1** — secret rotation + history scrub. Do FIRST.
- **Batch 2** — kill 4 unauthenticated endpoints (`/api/seed`, `/api/test/create-test-users`, `/api/cameras/snapshot`, FastAPI WebSocket SSRF).
- **Batch 3** — fix multi-tenant isolation in `/api/cameras` GET, `/api/cameras/[id]` GET/PATCH, `/api/users/[id]` PATCH/DELETE. One shared helper.
- **Batch 4** — turn on TypeScript/ESLint at build time, remove `NODE_TLS_REJECT_UNAUTHORIZED=0`, lock down CORS, fix Vercel install.
- **Batch 5** — auth hardening: timing leak, Redis rate limiting, impersonation `jti` revocation, real password reset field, strip PII from logs.
- **Batch 6** — infra: stop exposing Postgres/Redis ports, kill Prometheus lifecycle API, pin Docker images, add resource limits.
- **Batch 7** — code quality: pin Python deps, delete fix-*.sh scripts, fix `camera_connector.py`, delete Django leftovers, write a real README.
- **Batch 8** — architecture: delete empty service dirs, resolve duplicate `package.json`, delete duplicate Next/PostCSS configs, wire MFA or rip it out, clean up the `.claude/worktrees/` mirror.
- Each batch is **self-contained** and gives Claude Code line-level instructions, file paths, and stop conditions.
- Run on a feature branch, eyeball the diff, then ship.
