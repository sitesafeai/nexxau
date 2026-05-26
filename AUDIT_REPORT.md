# Nexxau Codebase Audit Report

**Date:** 2026-05-05
**Scope:** Full audit of `/Users/luizcarneiro/nexxau` — Next.js frontend, Python services, Docker/K8s infra, Prisma data layer, AI/ML scripts.
**Severity legend:** 🔴 Critical · 🟠 High · 🟡 Medium · 🔵 Low / Hygiene

This is the brutal version you asked for. Some of these are bad enough that if this repo is public on GitHub right now, you should treat it as already breached and rotate everything.

---

## TL;DR — What you should panic about (in this order)

1. **Real production secrets are committed or sitting in the working tree:** Twilio creds, Supabase Postgres password, Gmail app password, NextAuth/JWT secrets, MediaMTX admin password.
2. **A full Postgres dump (`db_backup.sql`, 627 KB) with real users, emails, addresses and bcrypt password hashes is committed to git.**
3. **`/api/seed` and `/api/test/create-test-users` are publicly POST-able and wipe/seed your DB based on `NODE_ENV`.** A single misconfigured deploy nukes user data.
4. **`/api/cameras` GET returns every camera in every tenant when no `worksiteId` is passed.** Multi-tenant isolation broken.
5. **`/api/users/[id]` lets any COMPANY_ADMIN edit/delete any user in any company, including SUPER_ADMINs, and self-promote.**
6. **`/api/cameras/snapshot` is unauthenticated** — anyone can attach fake violation snapshots and trigger alert emails.
7. **FastAPI `backend/main.py` `/ws/video/{stream_id}` accepts an arbitrary URL from the client → SSRF + free GPU for the internet.**
8. **Builds ship with TypeScript and ESLint errors silenced** (`ignoreBuildErrors: true`, `ignoreDuringBuilds: true`). You don't actually know if this code type-checks.
9. **`NODE_TLS_REJECT_UNAUTHORIZED=0`** in the dev script disables TLS validation globally for the Node process.
10. **Half the microservices in `services/` are empty directories** (`api-gateway`, `auth-service`, `camera-service`, `notification-service`).

---

## 1. Secrets and credentials in the repo

### 🔴 1.1 `.env` contains live production secrets in cleartext
**File:** `/Users/luizcarneiro/nexxau/.env` (gitignored, but still on disk and in backups, and inevitably leaked via screen-share / tarball).

Found in the file:

| Line | Secret |
|---|---|
| 26 | `JWT_SECRET=5wfiXDwxHFz98qKNXMBsGXAgZEfcCqnR` |
| 94 | `TWILIO_ACCOUNT_SID=AC5d08741fe0dccb88dd7d402a489ef667` |
| 95 | `TWILIO_AUTH_TOKEN=46b3c1df49c4a7106534259699ab938f` |
| 98–99, 127–128 | Supabase Postgres URL with password `DHPXbPig7aMfFP7C` |
| 102 | `NEXTAUTH_SECRET=4mpV3C7zTBu1iR6VEiF6xO9NvYBQuLD9MkXiLYcVukw=` |
| 114 | Gmail SMTP app password `hxsb nodv jmpr cztc` |

The file even has a banner at the top reading *"NEVER commit .env files to version control!"*. Cute.

**Action:** Rotate every one of these now. Twilio token, Supabase DB password (this requires a new DB password and updating every connection string), NextAuth/JWT secrets (will log everyone out — fine), Gmail app password.

### 🔴 1.2 `.env.local` contains a Vercel OIDC token + duplicate DB password
**File:** `/Users/luizcarneiro/nexxau/.env.local`

Contains a Vercel OIDC JWT (line 2, ~700 chars long, `prj_YoOAs7TcWXtnQSfbijcYuICICDip`) and the Supabase password again. The OIDC token is short-lived but if anyone gets this file they can act as your Vercel project until it expires.

### 🔴 1.3 Database dump committed to git
**Files:** `db_backup.sql` (627 KB), `db_public_data.sql` (603 KB) — both `git ls-files` confirmed tracked.

Contains 1,604 INSERT statements including:
- `User` table rows with email, name, address, bcrypt hashes (`$2b$10$...`, `$2b$12$...`), timezone, role.
- `Company` table with phone numbers and physical addresses (e.g. `737 Crandon Blvd Apt 402`).
- Real personal email addresses (`negativevirgo@gmail.com`, `lmcarneiro21@gmail.com`, `yourfinancet@gmail.com`).

Bcrypt is one-way, but emails + addresses + phone numbers + role (`SUPER_ADMIN`, etc.) are PII. If this repo is public, this is a GDPR/CCPA-grade leak.

**Action:** `git filter-repo --path db_backup.sql --path db_public_data.sql --invert-paths`, force-push, then notify the affected users. Same for the worktree copy under `.claude/worktrees/stupefied-poincare/`.

### 🔴 1.4 MediaMTX admin password in the repo
**File:** `mediamtx.yml` lines 30–38

```yaml
authInternalUsers:
  - user: "admin"
    pass: "nexxau"
    ips: []
    permissions: [read, publish, playback, api]
```

Anyone who knows your MediaMTX endpoint can publish, hijack streams, and call the management API. The password is literally the project name.

### 🔴 1.5 Kubernetes secrets file ships with placeholder secrets that are also self-documenting
**File:** `k8s/secrets.yaml`

```yaml
JWT_SECRET: and0X3NlY3JldA==        # jwt_secret
NEXTAUTH_SECRET: bmV4dGF1dGhfc2VjcmV0  # nextauth_secret
GRAFANA_PASSWORD: Z3JhZmFuYV9wYXNzd29yZA==  # grafana_password
```

The base64 decodes to literally `jwt_secret`, `nextauth_secret`, etc. The comments next to each line tell you the cleartext. If anyone applies this file to a cluster without replacing values, you have prod with passwords like `postgres_password`. Use Sealed Secrets, External Secrets Operator, or `kubectl create secret` from a CI variable — never commit decryptable secrets, even fake ones.

### 🟠 1.6 Old `.env.local.backup` and `.env.local.broken` are committed
**Files:** `app/.env.local.backup`, `app/.env.local.broken` (confirmed tracked by `git ls-files`).

Even though they contain placeholder values now (`your-secret-key-here-change-in-production`), historical commits may have had real secrets in them. Audit the history.

### 🟠 1.7 `cookies.txt` in working tree contains a NextAuth CSRF token
**File:** `cookies.txt` (gitignored, but present locally)

Line 6 is your `next-auth.csrf-token` cookie. This is short-lived but should not be hanging around in plaintext.

### 🟡 1.8 `supabase-ca.pem` is not actually a certificate
**File:** `supabase-ca.pem`

Starts with `<!DOCTYPE HTML PUBLIC ...><title>301 Moved Permanently</title>`. Whoever ran `curl > supabase-ca.pem` followed a redirect they didn't follow. If any code uses this file as a CA cert it will silently fail or pin to nothing. Re-fetch with `curl -L`.

### 🟡 1.9 Top-level loose Python files
`camera_connector.py`, `forms.py`, `models.py`, `views.py`, `train_yolo.py`, `add-sample-cameras.js` and `cookies.txt` are scattered at the repo root next to the Next.js app. Looks like leftovers from an earlier Django incarnation. Either delete or move to a clearly-marked `legacy/` directory.

---

## 2. Authentication & Authorization

### 🔴 2.1 `/api/seed` is a "wipe my DB" footgun
**File:** `app/app/api/seed/route.ts`

```ts
if (process.env.NODE_ENV === 'production') return 403;
await prisma.user.deleteMany();
await prisma.worker.deleteMany();
await prisma.worksite.deleteMany();
await prisma.company.deleteMany();
```

No auth, no rate limit. If `NODE_ENV` is ever unset, `=== 'production'` is `false` and the route runs. The `start_optimized.sh` and `Dockerfile.production` files are not the only places `NODE_ENV` gets set, and Next.js doesn't always force it. Also creates `admin@nexxau.com` with hardcoded password `admin123`.

**Fix:** Delete this route. If you need seeding, do it with a CLI script that requires a CLI flag, not over HTTP.

### 🔴 2.2 `/api/test/create-test-users` — same shape, same problem
**File:** `app/app/api/test/create-test-users/route.ts`

Hardcoded password `worker123`, no auth, gated only by `NODE_ENV !== 'production'`. Also instantiates `new PrismaClient()` per route file → connection pool pollution under concurrency.

### 🔴 2.3 GET `/api/cameras` returns ALL cameras when no `worksiteId` is passed
**File:** `app/app/api/cameras/route.ts` line 331–366

```ts
const whereClause: any = {};
if (worksiteId) whereClause.worksiteId = worksiteId.trim();
cameras = await prisma.camera.findMany({ where: whereClause, ... });
```

If a logged-in user (any role, including a brand-new `WORKER`) calls `GET /api/cameras` with no query string, they get every camera in the database — across every tenant — including `streamUrl`, `ipAddress`, `port`, and `metadata`. The handler validates the `worksiteId` *if it exists*, but does not require it.

**Fix:** Require `worksiteId`, OR scope the `where` clause by `companyId` (for non-SUPER_ADMINs) before issuing the query.

### 🔴 2.4 `PATCH /api/users/[id]` — privilege escalation and tenant escape
**File:** `app/app/api/users/[id]/route.ts` lines 27–57

```ts
if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'COMPANY_ADMIN')
  return 403;
const { name, email, role } = body;
await prisma.user.update({ where: { id }, data: { ...(role && { role }) } });
```

A `COMPANY_ADMIN`:
- can edit users in **any** company (no `companyId` check on the target),
- can change anyone's role to `SUPER_ADMIN`, including their own,
- can delete `SUPER_ADMIN`s from other companies via `DELETE`.

The same file's `DELETE` returns `error.message` to the client (info disclosure on prisma errors).

**Fix:** Look up the target's `companyId` and reject if it doesn't match the actor's. Whitelist allowed roles per actor (`COMPANY_ADMIN` may only assign WORKER/SUPERVISOR/SITE_ADMIN inside their own company).

### 🔴 2.5 `POST /api/cameras/snapshot` has no authentication at all
**File:** `app/app/api/cameras/snapshot/route.ts`

```ts
export async function POST(req: NextRequest) {
  const { camera_id, snapshot } = await req.json();
  ...
  const recentAlert = await prisma.alert.findFirst({ where: { cameraId: camera_id, ... } });
  ...
  await uploadViolationSnapshot(snapshot, camera_id, recentAlert.id);
  await prisma.alert.update(...);
  // sends emails to alertContacts
}
```

Anyone on the internet can:
- POST a base64 image with `camera_id`, find the most recent alert that has no snapshot, attach their image, and trigger emails to everyone in `alertContact` for that worksite.
- Spam your storage backend (Cloudinary?) by repeatedly posting large `snapshot` payloads with random `camera_id`s.

**Fix:** Require an internal service token / mTLS / signed request — or move this to a private network and assert `request.headers['x-internal-token']` matches `INTERNAL_SERVICE_TOKEN`.

### 🔴 2.6 `GET /api/cameras/[id]` and `PATCH /api/cameras/[id]` — no tenant check
**File:** `app/app/api/cameras/[id]/route.ts`

GET: only checks `session?.user`. Any logged-in user can fetch any camera by ID and see `streamUrl`, `rtspPath`, `ipAddress`, `port`, `username`, `password` (the password is masked in response, but RTSP `streamUrl` may itself include credentials).

PATCH: gated by role (`SUPER_ADMIN`, `COMPANY_ADMIN`, `SITE_ADMIN`) but **never checks that the camera belongs to the actor's company/worksite**. A SITE_ADMIN at company A can patch a camera at company B, including `streamUrl` and `metadata`.

The DELETE handler in the same file does the right thing — copy that pattern to GET and PATCH.

### 🔴 2.7 FastAPI `/ws/video/{stream_id}` is open SSRF + open compute
**File:** `backend/main.py` lines 77–123

```py
stream_url = await websocket.receive_text()
if stream_url.startswith('rtsp://') or stream_url.startswith('http://'):
    cap = cv2.VideoCapture(stream_url)
else:
    cap = cv2.VideoCapture(0)  # local webcam
```

No auth on the WebSocket. The client picks the URL. Fun things you can do as an attacker:
- `http://169.254.169.254/latest/meta-data/` (AWS instance metadata) — though `cv2.VideoCapture` won't render it, FFmpeg's HTTP probing still hits the URL.
- `http://internal-prom:9090/...` — port scan / fingerprint.
- `rtsp://your-camera.local/stream` — pivot into your customer's network if this server is on it.
- `cv2.VideoCapture(0)` falls back to the **local webcam of the server** if the URL is wrong. Free voyeur cam.

`/api/detect` similarly has no auth and no file-size limit on `UploadFile`.

CORS is wide open: `allow_origins=["*"]` AND `allow_credentials=True` (this combination is illegal per CORS spec, browsers reject it — but reverse proxies that strip Origin can let it through).

### 🟠 2.8 NextAuth `authorize` leaks user existence via timing
**File:** `app/app/lib/auth.ts` lines 140–160

When the user is missing, it returns `null` immediately. When it exists, it runs `bcrypt.compare` (~100 ms). Trivially distinguishable. Fix: always run a dummy bcrypt compare against a fixed hash for missing users.

There's also no rate limit, no lockout, no MFA on the credentials provider. The `mfa/setup` and `mfa/verify` routes exist but are not wired into the login flow.

### 🟠 2.9 Impersonation token expiry is server-wide
**File:** `app/app/lib/impersonation-token.ts`

Token expires in 10 min, signed with `NEXTAUTH_SECRET` (HS256). No revocation list, no `jti`, no audit trail tying the *actor* (`adminId`) to the impersonated session beyond the warn log. Forge once, reuse for 10 minutes.

**Fix:** Persist a single-use `jti` in `ImpersonationToken` table; mark consumed after first use.

### 🟠 2.10 Forgot/reset password reuses `verificationToken` and `inviteExpires`
**File:** `app/app/api/auth/forgot-password/route.ts` line 64, `auth/reset-password/route.ts` line 76

Comment in the source: *"Or we could add a resetTokenExpires field, but for now use inviteExpires"*. Reusing the invite token field means: (a) issuing a password reset invalidates a pending invite, (b) the invite-claim flow could accept a reset token because both look identical.

### 🟠 2.11 Middleware does not cover `/api/*`
**File:** `app/app/middleware.ts` lines 100–115

Matcher is `/admin/:path*`, `/company/:path*`, `/dashboard/:path*`, `/workflow/:path*`. Every API route is on its own to enforce auth. Most do, but the holes above (`/api/seed`, `/api/cameras/snapshot`, `/api/test/...`) prove this is a fragile pattern. A single API route added without `getServerSession` is exposed.

**Fix:** Keep middleware narrow but add a centralized `requireAuth(role[])` helper and lint for any `route.ts` that doesn't import it.

### 🟡 2.12 Onboard route logs PII and dumps active tokens to console on error
**File:** `app/app/api/users/onboard/route.ts` lines 65–80

When the token isn't found, it logs every user that has a non-null `inviteToken` along with email and a 15-char prefix of the token. Anyone with log access can pull this. Same file, line 20: logs the requested token prefix.

### 🟡 2.13 Auth provider has Google commented out at the top
**File:** `app/app/lib/auth.ts` line 79

> `// Temporarily disabled Google provider to fix crashes`

"Temporary" since whenever this was written. Either fix it and uncomment, or delete the dead code so it doesn't lure someone into uncommenting and deploying broken auth.

---

## 3. Code quality, type-safety, hygiene

### 🔴 3.1 Type errors and lint errors silenced at build time
**Files:** `next.config.js` lines 8–9, `app/next.config.js` lines 8–9.

```js
eslint: { ignoreDuringBuilds: true },
typescript: { ignoreBuildErrors: true },
```

You will ship code that doesn't compile. There are 21 `TODO/FIXME/@ts-ignore` matches across 14 of the audited files; some of those are presumably what's being silenced. Until you fix this, I cannot tell you whether the code you're running matches the code you wrote.

### 🔴 3.2 `NODE_TLS_REJECT_UNAUTHORIZED=0` baked into dev script
**File:** `app/package.json` line 6

```json
"dev": "NODE_TLS_REJECT_UNAUTHORIZED=0 NODE_OPTIONS='--max-old-space-size=4096' next dev"
```

This disables TLS verification for the entire Node process — every outbound HTTPS call (Supabase, Twilio, Stripe, Sentry, anything) will accept any cert. If a developer copies this pattern to a "fix" script and it ends up in a Dockerfile, prod accepts MITM certs. Remove it; if Supabase certs are the actual problem, fix the CA chain (see `supabase-ca.pem` issue above).

### 🟠 3.3 CORS on `/api/*` is wide open
**File:** `app/next.config.js` lines 28–39

```js
{ key: 'Access-Control-Allow-Origin', value: '*' }
```

Cookies aren't sent with `*`, so this is not directly a session-stealing hole — but it lets any site read your API responses, which leaks data (camera lists, public-ish profile info) and confuses analytics. Allowlist your own origins.

### 🟠 3.4 Two `package.json` files with version drift
**Files:** `package.json` (root), `app/package.json`.

| Package | Root | App |
|---|---|---|
| `@prisma/client` | `^6.19.1` | `^6.7.0` |
| `next` | `15.2.6` | `^15.5.15` |
| `prisma` (devDep) | (root has none) | `^6.19.1` |

`app/package.json` also has **two `description` fields** (lines 5 and 135) — JSON allows duplicate keys but the result is implementation-defined. The second has `"description": ""` and overrides the real one.

`app/package.json` claims `"license": "ISC"` for a project the root marks `"private": true`. Pick one.

### 🟠 3.5 Python deps are `>=` everywhere
**Files:** `requirements.txt`, every `services/*/requirements.txt`.

```
ultralytics>=8.0.0
torch>=2.0.0
flask>=2.3.0
twilio>=8.0.0
```

Reproducible builds: nope. A `pip install` six months from now could pull a breaking torch release into production.

**Fix:** Either pin (`==`) and use Renovate/Dependabot to bump deliberately, or use `pip-compile` / Poetry / uv and check the lock file in.

### 🟡 3.6 In-memory rate limiter with bugs
**File:** `lib/rate-limit.ts`

- `ipCache` Map grows without bound → memory leak.
- `lastRequest` is updated on every call, so the window never resets — a user pinging once every 59s gets throttled forever.
- Doesn't work in serverless (each lambda has its own Map).
- Trusts `x-forwarded-for` raw, takes the whole header (multiple IPs).

### 🟡 3.7 Excess logging in `/api/cameras` GET (and elsewhere)
**File:** `app/app/api/cameras/route.ts`

This single GET handler logs ~15 lines per request including `session.user.email`. At any non-trivial QPS your log bill will hurt and you're storing PII. Use a logger with levels and structured fields, not raw `console.log`.

### 🟡 3.8 `next.config.js` has `reactStrictMode: false`
**File:** `app/next.config.js` line 6

You're opting out of double-render dev warnings that catch effect bugs. Either turn it on or document why not.

### 🟡 3.9 Many "fix-*" shell scripts at the repo and `app/` root
`fix-all-prisma-imports.sh`, `fix-contact-form.sh`, `fix-database.sh`, `fix-email-config.sh`, `fix-file-limit.sh`, `fix-route-handlers.sh`, `fix-nextjs15-routes.py`, `restart-server.sh`, `RESTART_NOW.sh`, `COMPLETE_FIX.sh`, etc. These are scar tissue from one-off incidents. Either turn them into idempotent migrations / proper scripts, or delete.

---

## 4. Concrete bugs (will crash or produce wrong results)

### 🔴 4.1 `camera_connector.py` won't import
**File:** `camera_connector.py` line 13, 105

```py
def get_frame(self) -> Optional[np.ndarray]:
```

`numpy as np` is never imported, so the type hint and the `np.frombuffer` call in `CloudCamera.get_frame` raise `NameError` at first use.

Same file, line 117–123: the factory passes `**config` to all three classes, but the example config (`rtsp_url`, `username`, `password`) only matches `RTSPCamera`. `CloudCamera('cloud', cfg)` would `TypeError`.

### 🔴 4.2 `views.py` `test_camera_connection` calls undefined functions
**File:** `views.py` lines 145–155

`test_milestone_connection`, `test_cloud_connection`, `test_rtsp_connection` are referenced but not imported or defined anywhere in the module. First request to this view raises `NameError`. Also, if `camera_type` is anything other than the 4 known values, `success` is never assigned and `JsonResponse({'success': success})` raises `UnboundLocalError`.

### 🟠 4.3 `RTSPCamera.connect` will mangle URLs with `@` in passwords
**File:** `camera_connector.py` line 31

```py
auth_url = f"rtsp://{self.username}:{self.password}@{self.rtsp_url.split('://')[1]}"
```

If the password contains `@` or `:` or any URL-reserved char, the resulting URL is wrong. URL-encode with `urllib.parse.quote(..., safe='')`.

### 🟠 4.4 YOLO Flask service runs Flask dev server, blocks signal handling
**File:** `services/yolo-detection-service/src/main.py` line 370

`app.run(host='0.0.0.0', port=5000)` is the dev server — single-threaded, unsuitable for production. Also blocks the `try: service.start() except KeyboardInterrupt:` path because `app.run` swallows signals on its own. Use `gunicorn` / `uvicorn`.

`/notifications/<camera_id>` PATCH endpoint on this service has **no authentication** — anyone on the network (or the public internet if exposed) can toggle person-detection alerts on or off for any camera ID.

`INTERNAL_SERVICE_TOKEN` in the same file defaults to `""`. If unset, sync requests go without an auth header. Either fail-fast at startup if missing, or fail closed.

### 🟠 4.5 `add-sample-cameras.js` likely uses outdated schema
**File:** `add-sample-cameras.js` (3 KB at repo root, dated Mar 29).

I didn't open it line by line, but its colocation with the Django code and `forms.py`/`views.py` suggests it predates the current Prisma schema. Worth confirming and either updating or removing.

### 🟡 4.6 Rate limiter window-reset bug (also listed under hygiene)
See 3.6.

### 🟡 4.7 `/api/cameras` POST permission documentation lies
**File:** `app/app/api/cameras/route.ts` line 513

JSDoc says `Permissions: ADMIN, COMPANY_ADMIN, SITE_ADMIN, or SAFETY_MANAGER`. Code at line 529 enforces `SUPER_ADMIN` only. Either the comment is wrong (then fix it) or the code is wrong (then loosen it). Right now nobody but a SUPER_ADMIN can add cameras, which probably isn't what you want.

---

## 5. Infrastructure and deploy

### 🔴 5.1 Postgres and Redis ports exposed in `docker-compose.production.yml`
**File:** `docker-compose.production.yml` lines 17–18, 36–37

```yaml
postgres:
  ports: ["5432:5432"]
redis:
  ports: ["6379:6379"]
```

If this compose file is used on a host with a public IP, your DB and cache are on the public internet. Use the internal docker network only — drop the `ports:` block entirely, or bind to `127.0.0.1:5432:5432`.

### 🔴 5.2 Prometheus has lifecycle API enabled, no auth
**File:** `docker-compose.production.yml` line 142

`--web.enable-lifecycle` allows POST `/-/reload` and POST `/-/quit`. Combined with the public port `9090:9090`, anyone can reload your config or shut down monitoring. Drop the flag, or put nginx + basic auth in front.

### 🟠 5.3 Grafana / Alertmanager exposed publicly with default-ish creds
**File:** `docker-compose.production.yml` lines 148–164, 167–181

Grafana on `:3001`, Alertmanager on `:9093`, Prometheus on `:9090`. None of these belong on the public internet. Put them behind nginx + auth or wireguard / Tailscale.

### 🟠 5.4 `image: bluenviron/mediamtx:latest`, `prom/prometheus:latest`, `grafana/grafana:latest`, `nginx:alpine`, `redis:7-alpine`
Pin to a digest (`@sha256:...`) or at least a specific tag. `:latest` makes builds non-reproducible and means a malicious or broken upstream gets pulled silently.

### 🟠 5.5 No `resources:` limits on most compose services
A runaway YOLO service can OOM the host and take down Postgres with it.

### 🟡 5.6 `docker-compose.yml` uses `version: '3.8'` only in the production file (deprecated key)
The dev `docker-compose.yml` doesn't have `version:`, which is correct for modern Compose. The production one still has `version: '3.8'` which Compose v2 ignores with a warning. Drop it.

### 🟡 5.7 K8s `postgres.yaml` has no PodSecurityContext
**File:** `k8s/postgres.yaml`

No `runAsNonRoot`, no `readOnlyRootFilesystem`, no `seccompProfile`, no `NetworkPolicy` to limit who can talk to it, no `PodDisruptionBudget`, single replica. Also `storageClassName: gp2` on AWS — gp3 is the recommendation now (cheaper, faster).

### 🟡 5.8 `vercel.json` uses `--no-frozen-lockfile`
**File:** `vercel.json` line 4

```json
"installCommand": "pnpm install --no-frozen-lockfile"
```

Lock files exist for a reason. `--no-frozen-lockfile` lets pnpm resolve to whatever it wants, defeating reproducibility. Use `--frozen-lockfile` (the default) and update the lockfile in dev.

### 🟡 5.9 Build command uses pinned `prisma@6.19.3` outside the dependency graph
**File:** `vercel.json` line 2, `package.json` line 11

```json
"buildCommand": "npx prisma@6.19.3 generate && next build"
"postinstall": "npx prisma@6.19.3 generate"
```

`@prisma/client` is `^6.19.1` in deps, but the CLI version is hard-pinned via `npx`. If the runtime client and the codegen drift, you get cryptic schema errors. Add `prisma` as a devDependency at the version you want (you have it in `app/package.json` as `^6.19.1` but not at the root) and call it via `npm exec prisma generate`.

---

## 6. Microservice architecture is half-built

`services/` claims a microservices architecture, but the reality:

| Service | Has files? |
|---|---|
| `_template-nodejs` | yes (template) |
| `_template-python` | yes (template) |
| `acknowledgement-service` | yes |
| `alert-orchestrator-service` | yes |
| `alerts-service` | yes |
| **`api-gateway`** | **empty directory** |
| **`auth-service`** | **empty directory** |
| **`camera-service`** | **empty directory** |
| `detection-service` | yes |
| **`notification-service`** | **empty directory** |
| `snapshot-service` | yes |
| `streaming-service` | yes |
| `violation-engine-service` | yes |
| `yolo-detection-service` | yes |

`IMPLEMENTATION_STATUS.json` itself confirms only 50% complete (4/8 listed implementations). `FINAL_VERIFICATION_REPORT.json` is **0 bytes**. `README.md` is **1 byte** (a single newline). `main` (no extension) at the repo root is **0 bytes**.

Either commit to monolith and delete the empty service directories, or implement them. Right now anyone reading the repo gets a wrong mental model of what's actually there.

---

## 7. Testing

| What | Count |
|---|---|
| Jest test files (`*.test.ts`) | 4 (`jwt`, `rbac`, `auth/refresh`, `performance/load`) |
| Playwright e2e specs | 2 (`auth.spec.ts`, `camera-detection.spec.ts`) |
| API routes | ~150+ |
| Pages | dozens |

Coverage is functionally zero for a project of this size. None of the security-critical handlers identified in §2 have unit tests. There is a `test:ci` and `test:coverage` script but no CI config that I can see actually runs them on every PR.

---

## 8. Other observations and hygiene items

- 🟡 `app/Dockerfile` and `app/Dockerfile.production` exist; if they don't share a base layer you're duplicating work and you'll diverge.
- 🟡 `next.config.ts` and `next.config.js` both exist at the repo root and inside `app/`. Next.js picks one and ignores the other. Decide.
- 🟡 `postcss.config.js` and `postcss.config.mjs` both exist — same problem.
- 🟡 `dump.rdb` is in the working tree (gitignored). It's a Redis dump; if it ever leaks, your cache state is in the wild.
- 🟡 `app/scripts/` has 30+ `fix-*` and `seed-*` scripts. Most are point-in-time fixes that should be deleted once applied; left in the repo they confuse new contributors and tempt people to run them on prod.
- 🟡 `.gitignore` is duplicated in places (`venv/`, `__pycache__/`, `node_modules/`, `dist/`, `build/`, `*.pyc` all listed twice). Cosmetic.
- 🟡 `/docs` directory is empty. Either delete or write docs.
- 🟡 `cookies.txt` — see 1.7.
- 🟡 The `.claude/worktrees/stupefied-poincare/` directory is a full mirror of the repo (with the same secrets, db dumps, etc.). It's gitignored at the worktree level but it's still on disk. Clean it up.

---

## 9. Prioritized fix order (the "do these first" list)

**This week (security):**
1. Rotate every secret in §1.1, §1.2, §1.4, §1.5. Do this before anything else.
2. `git filter-repo` to remove `db_backup.sql`, `db_public_data.sql`, `app/.env.local.backup`, `app/.env.local.broken` from history. Force-push. Tell affected users.
3. Delete `/api/seed` and `/api/test/create-test-users`. Replace with CLI-only scripts.
4. Add tenant scoping to `GET /api/cameras` and `GET|PATCH /api/cameras/[id]`.
5. Add `companyId`-match check + role-allowlist to `PATCH|DELETE /api/users/[id]`.
6. Add an internal-token check to `/api/cameras/snapshot`.
7. Add auth to FastAPI `/api/detect` and `/ws/video/{stream_id}`. Validate the URL is in an allowlist of registered cameras. Drop `cv2.VideoCapture(0)` fallback.
8. Change MediaMTX password and pull it from env, not the YAML in repo.

**Next sprint (code health):**
9. Remove `NODE_TLS_REJECT_UNAUTHORIZED=0` from dev script.
10. Turn off `ignoreBuildErrors` and `ignoreDuringBuilds`. Fix what falls out.
11. Pin Python deps; pin docker images to digests.
12. Rip `Access-Control-Allow-Origin: *` out of `next.config.js` and replace with an allowlist.
13. Replace the in-memory rate limiter with one backed by Redis (you already deploy Redis).
14. Add a `requireAuth(role[])` helper and a lint rule that fails CI if any `route.ts` doesn't import it.

**Soon-ish (architecture):**
15. Decide: monolith or microservices. Delete or implement the empty service directories.
16. Decide on Prisma client version: drop the duplicated `package.json` or commit fully to a workspace.
17. Wire up `mfa/setup` and `mfa/verify` into the actual login flow, or delete them.
18. Add tests for the routes in §2 — even smoke tests that assert "unauthenticated returns 401" would have caught most of these issues.

---

## Appendix A — files I read while writing this

```
.env, .env.local, .gitignore
package.json, app/package.json
next.config.js, app/next.config.js
docker-compose.yml, docker-compose.production.yml
mediamtx.yml
k8s/secrets.yaml, k8s/postgres.yaml
vercel.json
README.md, EMAIL_VARS_TO_ADD.txt, IMPLEMENTATION_STATUS.json
camera_connector.py, views.py, forms.py, train_yolo.py
backend/main.py
services/yolo-detection-service/src/main.py
services/streaming-service/src/stream_manager.py (excerpt)
lib/rate-limit.ts
app/app/middleware.ts
app/app/lib/auth.ts
app/app/lib/impersonation-token.ts
app/app/api/seed/route.ts
app/app/api/test/create-test-users/route.ts
app/app/api/cameras/route.ts
app/app/api/cameras/[id]/route.ts
app/app/api/cameras/[id]/stream/route.ts
app/app/api/cameras/[id]/diagnose/route.ts
app/app/api/cameras/snapshot/route.ts
app/app/api/users/[id]/route.ts
app/app/api/users/onboard/route.ts
app/app/api/admin/companies/[id]/impersonate/route.ts
app/app/api/admin/users/[id]/[action]/route.ts
app/app/api/auth/[...nextauth]/route.ts
app/app/api/auth/forgot-password/route.ts
app/app/api/auth/reset-password/route.ts
app/app/api/contact/route.ts (partial)
db_backup.sql (sampled), db_public_data.sql (sampled)
cookies.txt, supabase-ca.pem
```

---

## Quick takeaways (TL;DR for the impatient version)

- Real Twilio, Supabase, Gmail, MediaMTX, NextAuth/JWT secrets are in `.env` / `mediamtx.yml` / `k8s/secrets.yaml`. Rotate them.
- `db_backup.sql` (627 KB of real users + bcrypt hashes + addresses) is committed to git history. Purge it with `git filter-repo`.
- `/api/seed` will wipe your DB if `NODE_ENV` isn't set to `production` and there's no auth.
- `/api/cameras` GET leaks every camera in every tenant when called without `worksiteId`.
- `/api/users/[id]` lets a `COMPANY_ADMIN` edit/delete any user in any company and self-promote to `SUPER_ADMIN`.
- `/api/cameras/snapshot` and FastAPI `/ws/video/{stream_id}` are unauthenticated; the WebSocket is also an open SSRF.
- TypeScript and ESLint errors are silenced at build time and `NODE_TLS_REJECT_UNAUTHORIZED=0` is in the dev script.
- `app/next.config.js` returns `Access-Control-Allow-Origin: *` for every API route.
- 4 of the 14 service directories are completely empty; `IMPLEMENTATION_STATUS.json` admits 50%; `README.md` is 1 byte.
- Only 6 test files (4 Jest, 2 Playwright) for ~150 API routes.
- Python deps are unpinned; Docker images use `:latest`; Postgres + Redis ports are exposed publicly in the production compose file.
- K8s `secrets.yaml` ships with placeholder values that decode to `jwt_secret`, `nextauth_secret`, etc.
