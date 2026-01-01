# Production Readiness Roadmap

This backlog is ordered by risk reduction and impact. Each phase assumes
automated tests + monitoring are added in parallel as features harden.

## Phase 0: Security + Data Integrity (blockers)
- Enforce role-based access control on all write endpoints (admin-only for user
  creation, role updates, and deletions; dispatch/admin for order changes).
- Add request validation + field whitelisting for all POST/PUT routes.
- Prevent mass assignment (explicit allowed fields per endpoint).
- Add authentication guard for driver location updates (scope by role or driver).
- Normalize error handling (consistent error shape, status codes).
- Add API rate limiting for auth/register/login and write endpoints.
- Make order number generation concurrency-safe (sequence or retry).

## Phase 1: Core Dispatch Operations (MVP completeness)
- Order assignment workflow API (assign/unassign driver + vehicle).
- Status transitions API (pending -> assigned -> picked_up -> in_transit -> delivered).
- Activity log events API (append-only, system + user events).
- Line-item/manifest API (add/update items, compute totals server-side).
- Vehicle maintenance API (create/update service records, next service due).
- Driver status/location feed (update status, location polling stream).

## Phase 2: Operations, UX, and Auditability
- Audit log for all critical actions (who/what/when, before/after).
- Notifications (email/SMS/webhook) for status changes and exceptions.
- Search + server-side filtering/sorting across orders/vehicles/drivers.
- Bulk operations endpoints (delete/update in one request).
- File upload for documents (driver docs, BOL/manifest PDFs).

## Phase 3: Reporting + Integrations
- KPI dashboards (on-time rate, dwell time, load factor, driver utilization).
- External integration hooks (Fleetbase, telematics, ELD, maps/geocoding).
- Data export APIs (CSV/JSON) and scheduled reports.
- SSO support and organization multi-tenancy.

## Phase 4: Scale + Reliability
- Background jobs for long-running tasks (ETA calc, route optimization).
- Caching and pagination optimizations for large datasets.
- Observability: structured logs, traces, metrics, SLOs.
- Disaster recovery and backup policy for MongoDB.

