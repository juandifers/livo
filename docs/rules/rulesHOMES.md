# Booking Rules Reference — HOMES (Canonical)

## 0) Purpose
This document defines the **complete business rules** for creating, modifying, and cancelling **HOME** bookings. It is intended to be the **single source of truth** for agents, backend enforcement, frontend UX constraints, and QA acceptance tests.

---

## 1) Glossary

- **Asset Types**: `home`, `boat` (this document covers `home`).
- **Participation (1/8)**: Unit of ownership share. Many limits scale “per each 1/8”.
- **sharePercentage**: Ownership share as a percentage. Standard increments: `12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100`.
- **eighthShares / ShareUnits (derived)**: `eighthShares = sharePercentage / 12.5` (an integer because only standard percentages are allowed).
- **Usage Year Window**: Rolling 12-month window anchored to the first share acquisition date for that asset (`firstShareAcquiredAt`).
- **Stay / Booking (Estadía / Reserva)**: A reservation with a start date and end date.
- **Calendar Days Duration (Duración en días calendario)**: Number of calendar days in the stay (not nights).
- **Lead Time (Anticipación)**: Calendar days between `now` and `booking.startDate`.
- **Active Reservation**: A reservation that is currently held and not cancelled/expired/completed (status lifecycle defined by the system).
- **Special Date Type 1 / Type 2**: Admin-defined date ranges. A booking is “special” if **at least one day** overlaps the configured special date range.

---

## 2) Core Entities & Attributes (minimal)

### Co-owner (Copropietario)
- `sharePercentage`: ownership share percentage for this asset
- `firstShareAcquiredAt`: timestamp/date of **first acquired share** for this asset (anchor for usage window)
- `eighthShares`: derived from `sharePercentage`

### Asset (HOME)
- `id`
- `type = 'home'`
- `owners[]`: list of co-owners and their `sharePercentage`

### Booking
- `assetId`
- `startDate`, `endDate`
- `durationDays` (calendar days; derived). **Definition**: inclusive of both `startDate` and `endDate`.
- `createdAt`
- `status`
- `specialDateType`: `'type1' | 'type2' | null` (derived from overlap)

### SpecialDate (admin-configured)
- `type`: `'type1' | 'type2'`
- `asset`: optional (null means “universal” special date)
- `startDate`, `endDate`
- `repeatYearly`

---

## 3) Global Invariants (must ALWAYS hold)

### INV-01: Minimum stay length
A booking must be at least **2 calendar days**.

### INV-02: Max booking horizon
Bookings can be created up to **2 years** in the future.

### INV-03: Lead-time bucket rules
Rules differ based on **lead time** bucket:
- **> 60 days**
- **8 to 60 days**
- **<= 7 days** (additional allowance rule)

> Note: `<= 7 days` is a subset of `<= 60 days`; apply the most specific rule set.

### INV-04: Scope of gap rule
The “gap between stays” rule applies **only between the same user’s bookings on the same asset**.

### INV-05: Special dates are admin-configured
Special date ranges (Type 1 and Type 2) are **configured manually** by admin.

---

## 4) Rule Precedence
When evaluating a booking request, apply rules in this order:
1. **Hard validity** (duration, horizon)
2. **Lead-time bucket selection**
3. **Active reservation constraints** (only for `> 60 days`)
4. **Special date constraints** (only for `> 60 days`)
5. **Gap between stays** (only for `> 60 days`, user+asset scoped)
6. **Cancellation/modification penalty** (`<= 60 days`)
7. **Extra days allowance** (`<= 7 days`)

If any **BLOCK** rule triggers, the booking is rejected with the highest-precedence reason.

---

## 5) Rule Catalog

### RULE-HOME-001: Annual usage allowance per 1/8 (44 days)
**Intent:** Limit usage days per share per rolling year window.  
**Applies when:** Booking days are counted for a co-owner for a given asset.  
**Decision:** Restrict total usable days.  

**Definition**
- Allowed days per 1/8 share = **44 days** per **Usage Year Window**
- Total allowed for user on asset = `44 * eighthShares`
- Window anchor = `firstShareAcquiredAt` for that asset
- Window range = `[firstShareAcquiredAt, firstShareAcquiredAt + 1 year)`

**Acceptance criteria**
- `sharePercentage=12.5` (`eighthShares=1`) -> 44 days available in the window.
- `sharePercentage=25` (`eighthShares=2`) -> 88 days available in the window.
- If user buys additional shares later, the usage window **does not reset**; it remains anchored to the **first** acquired share.

---

### RULE-HOME-002: Minimum stay length (>= 2 days)
**Intent:** Avoid 1-day bookings.  
**Applies when:** Creating/modifying any HOME booking.  
**Decision:** **BLOCK** if violated.  
**Condition:** `durationDays < 2`  
**User message:** “La estadía mínima es de 2 días.”

**Acceptance criteria**
- 1-day booking is blocked.
- 2-day booking is allowed (subject to other rules).

---

### RULE-HOME-003: Booking horizon limit (<= 2 years)
**Intent:** Prevent very long-term holds.  
**Applies when:** Creating any booking.  
**Decision:** **BLOCK** if violated.  
**Condition:** `startDate > now + 2 years`  
**User message:** “Se pueden hacer reservas hasta 2 años a futuro.”

**Acceptance criteria**
- Booking at `now + 2 years - 1 day` is allowed.
- Booking at `now + 2 years + 1 day` is blocked.

---

## Lead-time bucket: Bookings made with **more than 60 days** in advance

### RULE-HOME-010: Max active reservations per 1/8 (>60 days)
**Intent:** Limit how many far-future bookings can be held.  
**Applies when:** `leadTimeDays > 60`  
**Decision:** **BLOCK** if exceeded.  

**Limit**
- `maxActiveReservationCount = 6 * eighthShares`

**Counting**
- Use RULE-HOME-011 for weights
- Exclude bookings within 60 days from counts (RULE-HOME-019)

**User message:** “Por cada 1/8, máximo 6 reservas activas al mismo tiempo.”

**Acceptance criteria**
- `sharePercentage=12.5` (`eighthShares=1`) -> counted active reservations total must be <= 6.
- `sharePercentage=25` (`eighthShares=2`) -> counted active reservations total must be <= 12.

---

### RULE-HOME-011: Active reservation weight by stay length (>60 days)
**Intent:** Longer stays consume more reservation capacity.  
**Applies when:** `leadTimeDays > 60`, counting active reservations.  
**Decision:** Determine the “counted active reservations” total.

**Weights**
- Duration **2–7 days** -> weight **1**
- Duration **8–14 days** -> weight **2**
- Duration **>14 days** -> blocked by RULE-HOME-012

**Acceptance criteria**
- 6-day booking contributes 1.
- 10-day booking contributes 2.

---

### RULE-HOME-012: Max consecutive stay length per booking (<= 14 days, >60)
**Intent:** Prevent very long bookings far in advance.  
**Applies when:** `leadTimeDays > 60`  
**Decision:** **BLOCK** if violated.  
**Condition:** `durationDays > 14`  
**User message:** “Cada estadía tiene un máximo de 14 días seguidos.”

**Acceptance criteria**
- 14-day booking is allowed.
- 15-day booking is blocked.

---

### RULE-HOME-013: Minimum gap between stays (gap >= last stay duration, >60)
**Intent:** Avoid back-to-back holds by the same user on the same asset.  
**Applies when:** `leadTimeDays > 60` and user has another booking on the **same asset**.  
**Decision:** **BLOCK** if violated.

**Condition**
For any two bookings `A` then `B` (chronological by end/start) for the **same user + same asset**:
- `gapDays = daysBetween(A.endDate, B.startDate)`
- Must satisfy: `gapDays >= A.durationDays`

**User message:** “El tiempo entre reservas debe ser mayor o igual al número de días de la última estadía.”

**Acceptance criteria**
- If booking A is 5 days, booking B must start at least 5 days after A ends.
- If `gapDays < duration(A)`, booking B is blocked (or modification is blocked).

---

### RULE-HOME-014: Cancellation/modification without penalties (>60)
**Intent:** Provide flexibility for long-term planning.  
**Applies when:** Cancelling/modifying a booking whose `startDate` is **more than 60 days away** at the moment of change.  
**Decision:** **ALLOW** without penalty.

**Acceptance criteria**
- Cancelling a booking with start date >60 days away does **not** reduce annual allowance.
- Modifying such a booking does **not** impose usage penalties.

---

### RULE-HOME-015: Special date Type 1 — max 1 concurrently per 1/8 (>60)
**Intent:** Prevent hoarding peak dates.  
**Applies when:** `leadTimeDays > 60` and booking overlaps Type 1.  
**Decision:** **BLOCK** if exceeded.

**Condition**
- `isSpecialType1 == true`
- User already has `>= 1 * eighthShares` counted Type 1 special bookings (see RULE-HOME-019 for exclusions)

**User message:** “Por cada 1/8 se puede reservar sólo una fecha especial tipo 1 al tiempo.”

**Acceptance criteria**
- `sharePercentage=12.5` (`eighthShares=1`): at most 1 counted Type 1 special booking.
- A booking is Type 1 special if **any day** overlaps a configured Type 1 range (RULE-HOME-017).

---

### RULE-HOME-016: Special date Type 2 — max 1 concurrently per 1/8 (>60)
Same as RULE-HOME-015 but for **Type 2**.

**User message:** “Por cada 1/8 se puede reservar sólo una fecha especial tipo 2 al tiempo.”

---

### RULE-HOME-017: Special date classification by overlap
**Intent:** Define exactly what counts as “special”.  
**Applies when:** Any booking is evaluated.  
**Decision:** Derive flags `isSpecialType1`, `isSpecialType2`.

**Condition**
- A booking is special type X if **at least one day** falls inside any configured special date range of type X.

**Acceptance criteria**
- If a 10-day booking overlaps a special range for only 1 day, it is still considered special.

---

### RULE-HOME-018: Special date restriction lift when within 60 days of next special booking (Type 1/2)
**Intent:** As a special booking approaches, allow another special booking to be made beyond 60 days.  
**Applies when:** `leadTimeDays > 60` and user already has a counted special booking of that type.  
**Decision:** Lift the “only one at a time” restriction under the stated condition.

**Condition**
- Type 1 restriction is lifted when user is **< 60 days** from their **next Type 1** special booking.
- Type 2 restriction is lifted when user is **< 60 days** from their **next Type 2** special booking.

**Acceptance criteria**
- If the user’s next Type 1 special booking starts in 59 days, they may book another Type 1 special date >60 days out (subject to other limits).

---

### RULE-HOME-019: Reservations stop counting toward >60-day restrictions once within 60 days
**Intent:** Strict caps apply only to far-future bookings.  
**Applies when:** Evaluating `>60-day` rule constraints.  
**Decision:** Exclude near-term active reservations from counts.

**Condition**
Any active reservation with `startDate <= now + 60 days` **does not count** toward:
- the active reservation limit (RULE-HOME-010/011)
- the special date concurrent limits (RULE-HOME-015/016)

**Acceptance criteria**
- A booking starting in 45 days does not count toward the “max active reservations” constraint.
- A booking starting in 45 days does not count as the “held” Type 1/Type 2 special booking for the >60-day restriction.

---

## Lead-time bucket: Bookings made with **8 to 60 days** in advance

### RULE-HOME-020: No limit on active reservations or special dates within 60 days
**Intent:** Max flexibility in the near term.  
**Applies when:** `8 <= leadTimeDays <= 60`  
**Decision:** Do not apply RULE-HOME-010/011/015/016 constraints.

**Acceptance criteria**
- A user can create multiple bookings within next 60 days even if they exceed the >60-day active reservation cap.
- A user can hold multiple special dates within next 60 days.

---

### RULE-HOME-021: Cancellation/modification penalty for <=60 days (unused days counted as used)
**Intent:** Discourage last-minute cancellations that reduce availability.  
**Applies when:** Cancel or modify a booking when `leadTimeDays <= 60`.  
**Decision:** Unused days are counted as used **unless** another co-owner books those dates.

**Condition**
If cancelled/modified with `startDate <= now + 60 days`, then:
- Days not used are still deducted from annual allowance
- **Exception:** If another co-owner books the property for those dates, those days should not be counted as used (or should be credited back)

**Acceptance criteria**
- Cancel at 30 days -> days are counted as used.
- Cancel at 30 days, dates are rebooked by another co-owner -> those days are not counted as used (or are refunded/credited).

---

## Lead-time bucket: Bookings made with **7 days or less** in advance

### RULE-HOME-030: Extra days allowance beyond annual max (<=7 days lead time)
**Intent:** Allow additional near-term usage beyond the annual cap.  
**Applies when:** `leadTimeDays <= 7`  
**Decision:** Allow booking even if annual usage max is reached, up to an extra cap.

**Definition**
- A co-owner who has used their max days may still book.
- Additional days allowed = `10 * eighthShares` beyond the normal `44 * eighthShares`.

**Acceptance criteria**
- `sharePercentage=12.5` (`eighthShares=1`): user can exceed 44-day max by up to 10 extra days, but only for bookings <=7 days out.
- `sharePercentage=25` (`eighthShares=2`): extra allowance is up to 20 days.

---

## 6) Admin Configuration Requirements (Special Dates)
- Admin can create/edit/delete **Special Dates** (`SpecialDate`) with:
  - `type`: `'type1' | 'type2'`
  - Optional `asset` scope (null means “universal”)
  - `startDate`, `endDate`
  - Optional `repeatYearly`
- A booking is considered special if it overlaps any configured range (RULE-HOME-017).
- Define policy for whether special date definition changes can affect existing bookings (recommended: do not retroactively invalidate confirmed bookings).

---

## 7) Computation Standards (must be consistent everywhere)

### Duration in calendar days
- `durationDays` is measured in **calendar days**, not nights.
- `durationDays` counts both `startDate` and `endDate` (inclusive).

---

## 8) Notes for Agents
- All rules in this doc apply to **HOMES** only.
- Enforcement must be **backend source of truth**; frontend mirrors constraints for UX but must not be relied upon for correctness.
- When implementing features/bugs, reference impacted Rule IDs (e.g., “Fix affects RULE-HOME-013 and RULE-HOME-019”).
