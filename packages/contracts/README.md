# @livo/contracts

Canonical business rules and fixtures for LIVO. Consumed by
@livo/backend, @livo/admin, and @livo/mobile.

## What lives here

- `src/booking-constants.js` — numeric thresholds (min/max stay,
  ownership percentages, short-term windows, advance booking limits)
  that ALL three apps must agree on.
- `src/fixtures/date-contract-fixtures.json` — the canonical
  date-serialization test fixtures used by the booking quality gate
  across all three apps.

## What doesn't live here (and why)

- `dateUtils.js`: backend and mobile both have a file with this name,
  but they solve different problems (UTC string contract vs.
  locale-aware display). Each stays in its own app.
- `bookingValidation.js`: backend's is Express middleware for request
  validation; mobile's is a client-side rule engine. Different
  concerns despite the shared name. Each stays in its own app.

Changes here affect all three apps. The booking quality gate in CI
exercises this package across all consumers.

See `docs/rules/` at the monorepo root for the human-readable rules
specification.
