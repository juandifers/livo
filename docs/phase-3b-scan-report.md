# Phase 3B Broader Scan Report

## 1. Admin search for dateUtils / bookingValidation

| Pattern | Result |
|---------|--------|
| `dateUtils.*` / `date-utils.*` / `date_util.*` | **No files found** in `apps/admin/src` |
| `bookingValidation.*` / `booking-validation.*` | **No files found** in `apps/admin/src` |
| Import/require references to either | **None** — no matches in any `.js`/`.ts`/`.tsx` under `apps/admin/src` |

Admin has **zero** dateUtils or bookingValidation code. Its booking logic is inline in `AssetCalendarClient.tsx` using hardcoded magic numbers.

---

## 2. Business-rule numeric constants across apps

### Constants block (backend authoritative source)

From `apps/backend/src/controllers/bookingController.js:91–104`:

| Constant | Value | Purpose |
|----------|-------|---------|
| `DAYS_PER_EIGHTH_SHARE` | 44 | Annual allowance per 1/8 share |
| `MAX_BOOKING_LENGTH` | 14 | Max continuous stay (days) |
| `STANDARD_BOOKING_LENGTH` | 7 | Standard booking length |
| `MAX_ADVANCE_BOOKING_YEARS` | 2 | Max years ahead |
| `MAX_ACTIVE_BOOKINGS_PER_EIGHTH` | 6 | Active bookings cap (>60 days) |
| `MIN_ADVANCE_DAYS` | 0 | No minimum lead time |
| `SHORT_TERM_MIN_DAYS` | 7 | Very-short-term threshold |
| `SHORT_TERM_MAX_DAYS` | 60 | Short-term window (homes) |
| `EXTRA_DAYS_PER_EIGHTH` | 10 | Extra paid days per 1/8 |
| `EXTRA_DAY_COST` | 100 | Cost per extra day |
| `MIN_STAY_BOAT` | 1 | Min stay boats |
| `MIN_STAY_HOME` | 2 | Min stay homes |

### Where each constant is duplicated

| Constant | Backend | Mobile | Admin | Notes |
|----------|---------|--------|-------|-------|
| **minStay (boat=1, home=2)** | `bookingController.js:102-103`, `Booking.js:205-208` | `bookingValidation.js:78,116` | `AssetCalendarClient.tsx:227,712,785` | **3 apps, identical values, inline everywhere** |
| **maxStay = 14** | `bookingController.js:93`, `Booking.js:218` | `bookingValidation.js:15` (`MAX_CONTINUOUS_STAY`) | `AssetCalendarClient.tsx:228,714,789` | **3 apps, identical value** |
| **44 days per 1/8 share** | `bookingController.js:92,108-109`, `userController.js:293-294` | `bookingValidation.js:244-245` | — (not present) | 2 apps, same formula |
| **12.5% share unit** | `bookingController.js:92,108+`, `assetController.js:45,318,537`, `Asset.js:48`, `User.js:58`, maintenance scripts | `bookingValidation.js:245`, `AssetDetailScreen.js:201` | `AssetOwnersPieClient.tsx:44` | **3 apps, identical array `[12.5,25,...,100]`** |
| **Short-term threshold (home=60, boat=30)** | `bookingController.js:99,275` | `bookingValidation.js:12-13` | — (not in code, only in i18n strings) | 2 apps, same values |
| **Very-short-term = 7 days** | `bookingController.js:98` | `bookingValidation.js:14` | — | 2 apps, same value |
| **Max advance = 730 days / 2 years** | `bookingController.js:95` | `bookingValidation.js:17` | — | 2 apps, same value |
| **Standard booking = 7 days** | `bookingController.js:94` | `bookingValidation.js:16` | — | 2 apps, same value |

### Key observation

The **most dangerous duplication** is the handful of magic numbers that appear as inline literals in all three apps:
- `minStay` = `boat ? 1 : 2` — in **all 3 apps**
- `maxStay` = `14` — in **all 3 apps**
- `validPercentages = [12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100]` — in **all 3 apps** (backend 6 locations, admin 1, mobile 1)

---

## 3. Other files existing in 2+ apps

### Files with identical relative path (exact duplicate path)

| Relative path | Backend | Admin | Mobile |
|---------------|---------|-------|--------|
| `src/utils/dateUtils.js` | yes (323L) | no | yes (350L) |

Only one exact path overlap (already known).

### Files with same basename in 2+ apps

| Basename | Locations | Same purpose? |
|----------|-----------|---------------|
| `dateUtils.js` (2) | BE: `src/utils/` (323L), Mobile: `src/utils/` (350L) | Same name, **diverged implementations** (UTC vs local, CJS vs ESM) |
| `bookingValidation.js` (2) | BE: `src/middleware/validation/` (381L), Mobile: `src/utils/` (514L) | **Completely different** (express-validator middleware vs client-side rule engine) |
| `config.js` (2) | BE: `src/config/config.js` (150L), Mobile: `src/config.js` (117L) | **Different** — BE is env vars/secrets, Mobile is API URLs/feature flags |
| `errorMap.js`/`.ts` (2) | Admin: `src/lib/i18n/errorMap.ts` (30L), Mobile: `src/i18n/errorMap.js` (41L) | Same concept, **diverged** — different error keys, different function signatures |
| `es.js`/`.ts` (2) | Admin: `src/lib/i18n/translations/es.ts` (329L), Mobile: `src/i18n/translations/es.js` (338L) | Same concept, **different keys** — admin has admin UI strings, mobile has mobile UI strings, some overlap in booking-related keys |
| `en.js`/`.ts` (2) | Admin: (3L), Mobile: (3L) | Both stubs (English is default) |
| `index.js` (2) | Various unrelated files | Not the same |
| `layout.tsx` (2) | Admin only (Next.js layouts) | Not duplicated across apps |
| `page.tsx` (13) | Admin only (Next.js pages) | Not duplicated across apps |
| `constants.ts` (1) | Admin: `src/lib/i18n/constants.ts` (14L) | Only in admin |

### Test fixture files in 2+ apps

| File | Locations | Identical? |
|------|-----------|------------|
| `date-contract-fixtures.json` | All 3 apps (37L each) | **Yes — byte-identical** |

---

## 4. Summary: Real extraction candidates

| Candidate | Type | Confidence | Rationale |
|-----------|------|------------|-----------|
| **`date-contract-fixtures.json`** | Fixture | **High** — byte-identical, 3 copies | Simple JSON, no imports to rewrite in source (only tests) |
| **Booking rule constants** (magic numbers) | Constants file | **High** — same values in 3 apps | `minStay`, `maxStay=14`, `validPercentages`, `44 days/eighth`, `SHORT_TERM=60/30`, `VERY_SHORT=7`, `MAX_ADVANCE=730` |
| **`validPercentages` array** | Constant | **High** — `[12.5,...,100]` in 8+ locations across 3 apps | Belongs in constants file |
| `dateUtils.js` | Utility | **Low** — diverged implementations | Backend=UTC/CJS, Mobile=local/date-fns/ESM. Not extractable as-is |
| `bookingValidation.js` | Logic | **None** — different files entirely | BE=express middleware, Mobile=client rule engine. Not extractable |
| `errorMap` | i18n | **Low** — different keys and signatures | Would need reconciliation |
| `es.js`/`es.ts` translations | i18n | **Low** — admin/mobile have app-specific strings | Shared booking strings exist but are minority |

**The clean extraction target is a `@livo/contracts` constants module** containing the magic numbers that all three apps currently hardcode. The fixtures are also clean. `dateUtils` and `bookingValidation` should stay in their respective apps.
