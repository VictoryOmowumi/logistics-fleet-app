# Deployment Checklist

## Required environment variables
- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Optional but recommended
- `EMAIL_PROVIDER` (set to your provider key/name)
- `EMAIL_FROM` (verified sender address)

## MongoDB
- Ensure backups/retention are configured.
- Monitor disk usage and connections.
- Consider TTL indexes for token fields if you want auto-cleanup.

## Security
- Use strong `NEXTAUTH_SECRET` (rotate regularly).
- Store secrets in a managed secret store (not in repo).
- Enforce HTTPS in production.

## App health & monitoring
- Verify `/api/health` returns 200 in production.
- Set up log aggregation and alerting.
- Monitor auth errors and 429 rate-limit responses.

## Build & CI
- Ensure CI runs `npm run lint` and `npm run build`.
- Protect main branch with CI checks.

## CORS and networking
- If exposing APIs cross-origin, configure allowed origins.
- Ensure only trusted frontends can reach the API.

## Post-deploy smoke checks
- Login works for verified users.
- Create order, driver, and vehicle flows.
- Dispatch assignment updates order status.
- Activity log + manifest updates persist.
