# Market Research App Production Readiness Plan

Last updated: 2026-03-17

## 1. Current implemented scope

The app is currently a working prototype for AI-assisted market research.

What exists today:

- Google sign-in with a JWT cookie session.
- Idea submission and region selection in the frontend.
- Async market-research task orchestration with live socket progress updates.
- Report history for authenticated users.
- Competitor profile and final report retrieval.
- Basic plan metadata in code (`free`, `starter`, `pro`, `agency`).
- Local file-based persistence for users, sessions, reports, and competitor outputs.

What this means:

- The core research flow exists.
- The app is not yet production ready for paid customers or sustained usage.

## 2. Gaps between product messaging and real implementation

These are the biggest credibility risks right now.

- Pricing is presented in the UI, but there is no real billing provider integration.
- Plan upgrades, downgrades, renewals, failed payments, cancellations, and invoices are not implemented.
- Credits are described in the UI, but there is no real credit ledger, monthly reset job, or top-up purchase flow.
- Plan features such as PDF export, API access, team seats, white-label reports, and priority processing are advertised but not implemented end-to-end.
- The frontend lets users select plans visually, but backend enforcement is still based on a static plan value stored on the user record.
- Data is stored in local JSON files, not in a production database.
- Session cleanup currently deletes report sessions after 2 days, which conflicts with paid-plan history promises like 90-day or unlimited history.
- There is no product analytics pipeline to measure conversion, activation, retention, report completion, or billing funnel performance.

## 3. Must-implement product features before production launch

These are required to turn the prototype into a real product.

### 3.1 Billing and monetization

- Integrate a payment provider such as Stripe.
- Define the actual pricing model:
  - subscription only, or subscription + usage credits
  - how top-ups work
  - what happens when credits run out
  - whether unused credits roll over
  - whether annual plans have separate limits or only pricing discounts
- Add a billing domain model:
  - subscription status
  - billing period start/end
  - credit balance
  - credit transactions
  - payment events
  - invoices/receipts
- Build plan-management UX:
  - checkout
  - upgrade/downgrade
  - cancel/reactivate
  - billing portal
- Enforce plan entitlements in backend code, not just in UI text.

### 3.2 Data and persistence

- Replace file-based persistence with a production database.
- Add durable schemas for:
  - users
  - reports
  - competitors
  - subscriptions
  - credits
  - audit/event records
- Add migrations and environment-specific configuration.
- Define retention rules for reports and activity logs.
- Add backup and restore strategy.

### 3.3 Analytics and reporting

- Add product analytics:
  - landing page conversion
  - sign-up completion
  - first report started
  - first report completed
  - report export
  - upgrade intent
  - purchase conversion
  - churn/cancel events
- Add operational analytics:
  - task duration
  - failed runs
  - model/provider error rates
  - competitor extraction quality
  - queue backlog
- Add business dashboards for MRR, active users, credits consumed, and cohort retention.

### 3.4 Report and product capabilities

- Implement PDF export if it is sold as a paid feature.
- Decide whether reports are editable, shareable, downloadable, or immutable.
- Add report naming, report deletion, and archive behavior.
- Add better failure states and retry flows for partial competitor failures.
- Add a clear history model that matches plan promises.
- Decide whether agency/team features are real near-term scope or should be removed from pricing.

## 4. Production-readiness requirements

These are not optional if the app will handle real customer data and payments.

### 4.1 Security

- Move secrets and config management to a proper production setup.
- Add rate limiting on auth and report-generation endpoints.
- Add request validation hardening across all API inputs.
- Review cookie policy, CORS policy, CSRF posture, and auth/session expiry behavior.
- Add audit logging for sensitive account and billing actions.
- Add abuse controls to prevent scripted report generation and credit draining.

### 4.2 Reliability and operations

- Add structured error monitoring and alerting.
- Add health checks for queue/orchestrator dependencies.
- Add retry, timeout, and dead-letter handling for failed tasks.
- Ensure websocket failure does not break report completion or retrieval.
- Add deployment runbooks and incident-response basics.
- Define SLOs for report completion time and API availability.

### 4.3 Observability

- Add centralized logs.
- Add tracing or at least request/task correlation IDs.
- Add metrics for request volume, queue depth, task latency, and failure rate.
- Add alerts for rising failure rates, stuck jobs, and payment webhook failures.

### 4.4 Testing and release quality

- Add automated tests; there are currently no test scripts in the app packages.
- Add coverage for:
  - auth flows
  - billing and entitlement enforcement
  - report generation API flows
  - persistence layer
  - cleanup/retention behavior
  - frontend critical flows
- Add staging environment and production-like smoke tests.
- Add CI checks for linting, tests, and build validation.

### 4.5 Compliance and legal basics

- Add Terms of Service and Privacy Policy.
- Decide what third-party data is stored from research runs and whether that has legal implications.
- Define data retention and deletion behavior for user accounts.
- Add consent-aware analytics/cookie handling if required by target markets.
- Add support/contact and incident communication channels.

## 5. Explicitly missing or underdefined decisions

These are not implementation details; they are unresolved product decisions.

- What exactly does one credit buy?
- Is pricing per report, per seat, per workspace, or hybrid?
- Are regions a premium feature or a default capability?
- What is the SLA for paid plans?
- What is the difference between `starter`, `pro`, and `agency` beyond competitor count?
- What does "deep intelligence" mean in product terms and how is it enforced?
- What does "API access" include: raw reports, async job creation, usage export, webhooks?
- What does "team seats" mean if the app currently has only single-user accounts?
- Is history retention plan-based, account-based, or unlimited for all paid users?
- What is the refund policy for failed or low-quality reports?

## 6. What is currently not considered or not yet in scope

These can be deferred, but they should be explicitly labeled as deferred rather than silently implied.

- Team workspaces and multi-user collaboration.
- Admin dashboard for support, refunds, manual plan changes, and report inspection.
- Customer-facing API.
- White-label exports and agency branding.
- Enterprise features such as SSO, RBAC, audit export, and custom retention.
- A/B testing framework for pricing and onboarding.
- CRM/email lifecycle integration.
- Affiliate/referral system.
- Human QA review workflow for generated reports.

## 7. Recommended launch sequence

Do not try to launch everything at once.

### Phase 1: Honest paid beta

- Database-backed persistence.
- Real billing integration.
- Credit accounting.
- Accurate plan enforcement.
- Basic analytics.
- Error monitoring.
- Longer-lived report history.
- Clear product/legal pages.

### Phase 2: Production baseline

- PDF export.
- Better retries and reliability controls.
- CI/test coverage.
- Admin/support tooling.
- Metrics, alerts, and dashboards.

### Phase 3: Expansion

- Team accounts.
- API access.
- White-label/agency features.
- Advanced enterprise controls.

## 8. Bottom line

The app already demonstrates the core market-research workflow, but it is still a prototype. The main blockers for production are:

- no real billing/payments
- no database-backed persistence
- no analytics or business instrumentation
- no tested entitlement/credit system
- no production-grade observability, reliability, or security baseline
- multiple marketed paid features are not implemented yet
