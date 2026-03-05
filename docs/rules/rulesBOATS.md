# Booking Rules Reference — BOATS (Canonical)

## 0) Purpose
This document defines the **complete business rules** for creating, modifying, and cancelling **BOAT** bookings. It is intended to be the **single source of truth** for agents, backend enforcement, frontend UX constraints, and QA acceptance tests.

---

## 1) Glossary

- **Asset Types**: `home`, `boat` (this document covers `boat`).
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

### Asset (BOAT)
- `id`
- `type = 'boat'`
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

### INV-BOAT-01: Minimum stay length
A booking must be at least **1 calendar day**.

### INV-BOAT-02: Max booking horizon
Bookings can be created up to **2 years** in the future.

### INV-BOAT-03: Lead-time bucket rules
Rules differ based on **lead time** bucket:
- **> 30 days**
- **8 to 30 days**
- **<= 7 days** (additional allowance rule)

> Note: `<= 7 days` is a subset of `<= 30 days`; apply the most specific rule set.

### INV-BOAT-04: Scope of gap rule
The “gap between stays” rule applies **only between the same user’s bookings on the same asset**.

### INV-BOAT-05: Special dates are admin-configured
Special date ranges (Type 1 and Type 2) are **configured manually** by admin.

---

## 4) Rule Precedence
When evaluating a booking request, apply rules in this order:
1. **Hard validity** (duration, horizon)
2. **Lead-time bucket selection**
3. **Active reservation constraints** (only for `> 30 days`)
4. **Special date constraints** (only for `> 30 days`)
5. **Gap between stays** (only for `> 30 days`, user+asset scoped)
6. **Cancellation/modification penalty** (`<= 30 days`)
7. **Extra days allowance** (`<= 7 days`)

If any **BLOCK** rule triggers, the booking is rejected with the highest-precedence reason.

---

## 5) Rule Catalog

### RULE-BOAT-001: Annual usage allowance per 1/8 (44 days)
**Intent:** Limit usage days per share per rolling year window.  
**Applies when:** Booking days are counted for a co-owner for a given asset.  
**Decision:** Restrict total usable days.

**Definition**
- Allowed days per 1/8 share = **44 days** per **Usage Year Window**
- Total allowed for user on asset = `44 * eighthShares`

**Acceptance criteria**
- `sharePercentage=12.5` (`eighthShares=1`) -> 44 days available in the window.
- `sharePercentage=25` (`eighthShares=2`) -> 88 days available in the window.

---

### RULE-BOAT-002: Minimum stay length (>= 1 day)
**Intent:** Allow 1-day boat bookings, block 0-day/invalid.  
**Applies when:** Creating/modifying any BOAT booking.  
**Decision:** **BLOCK** if violated.  
**Condition:** `durationDays < 1`  
**User message:** “La estadía mínima es de 1 día.”

---

### RULE-BOAT-003: Booking horizon limit (<= 2 years)
**Intent:** Prevent very long-term holds.  
**Applies when:** Creating any booking.  
**Decision:** **BLOCK** if violated.  
**Condition:** `startDate > now + 2 years`  
**User message:** “Se pueden hacer reservas hasta 2 años a futuro.”

---

## Lead-time bucket: Bookings made with **more than 30 days** in advance

### RULE-BOAT-010: Max active reservations per 1/8 (>30 days)
**Intent:** Limit how many far-future bookings can be held.  
**Applies when:** `leadTimeDays > 30`  
**Decision:** **BLOCK** if exceeded.

**Limit**
- `maxActiveReservationCount = 6 * eighthShares`

---

### RULE-BOAT-011: Active reservation weight by stay length (>30 days)
**Intent:** Longer stays consume more reservation capacity.  
**Applies when:** `leadTimeDays > 30`, counting active reservations.  
**Decision:** Determine the “counted active reservations” total.

**Weights**
- Duration **1–7 days** -> weight **1**
- Duration **8–14 days** -> weight **2**
- Duration **>14 days** -> blocked by RULE-BOAT-012

---

### RULE-BOAT-012: Max consecutive stay length per booking (<= 14 days, >30)
**Intent:** Prevent very long bookings far in advance.  
**Applies when:** `leadTimeDays > 30`  
**Decision:** **BLOCK** if violated.  
**Condition:** `durationDays > 14`  
**User message:** “Cada estadía tiene un máximo de 14 días seguidos.”

---

### RULE-BOAT-013: Minimum gap between stays (gap >= last stay duration, >30)
**Intent:** Avoid back-to-back holds by the same user on the same asset.  
**Applies when:** `leadTimeDays > 30` and user has another booking on the **same asset**.  
**Decision:** **BLOCK** if violated.

---

### RULE-BOAT-014: Cancellation/modification without penalties (>30)
**Intent:** Provide flexibility for long-term planning.  
**Applies when:** Cancelling/modifying a booking whose `startDate` is **more than 30 days away** at the moment of change.  
**Decision:** **ALLOW** without penalty.

---

### RULE-BOAT-015: Special date Type 1 — max 1 concurrently per 1/8 (>30)
**Intent:** Prevent hoarding peak dates.  
**Applies when:** `leadTimeDays > 30` and booking overlaps Type 1.  
**Decision:** **BLOCK** if exceeded.

**Condition**
- `specialDateType == 'type1'` (or overlap implies type1)
- User already holds `>= 1 * eighthShares` counted Type 1 special bookings (excluding those within 30 days)

---

### RULE-BOAT-016: Special date Type 2 — max 1 concurrently per 1/8 (>30)
Same as RULE-BOAT-015 but for **Type 2**.

---

### RULE-BOAT-017: Special date classification by overlap
**Intent:** Define exactly what counts as “special”.  
**Applies when:** Any booking is evaluated.  
**Decision:** Derive `specialDateType` / overlap flags.

**Condition**
- A booking is special type X if **at least one day** falls inside any configured special date range of type X.

---

### RULE-BOAT-018: Special date restriction lift when within 30 days of next special booking (Type 1/2)
**Intent:** As a special booking approaches, allow another special booking to be made beyond 30 days.  
**Applies when:** `leadTimeDays > 30` and user already has a counted special booking of that type.  
**Decision:** Lift the “only one at a time” restriction under the stated condition.

---

### RULE-BOAT-019: Reservations stop counting toward >30-day restrictions once within 30 days
**Intent:** Strict caps apply only to far-future bookings.  
**Applies when:** Evaluating `>30-day` rule constraints.  
**Decision:** Exclude near-term active reservations from counts.

---

## Lead-time bucket: Bookings made with **8 to 30 days** in advance

### RULE-BOAT-020: No limit on active reservations or special dates within 30 days
**Intent:** Max flexibility in the near term.  
**Applies when:** `8 <= leadTimeDays <= 30`  
**Decision:** Do not apply RULE-BOAT-010/011/015/016 constraints.

---

### RULE-BOAT-021: Cancellation/modification penalty for <=30 days (unused days counted as used)
**Intent:** Discourage last-minute cancellations that reduce availability.  
**Applies when:** Cancel or modify a booking when `leadTimeDays <= 30`.  
**Decision:** Unused days are counted as used **unless** another co-owner books those dates.

---

## Lead-time bucket: Bookings made with **7 days or less** in advance

### RULE-BOAT-030: Extra days allowance beyond annual max (<=7 days lead time)
**Intent:** Allow additional near-term usage beyond the annual cap.  
**Applies when:** `leadTimeDays <= 7`  
**Decision:** Allow booking even if annual usage max is reached, up to an extra cap.

**Definition**
- Additional days allowed = `10 * eighthShares` beyond the normal `44 * eighthShares`.

---

## 7) Computation Standards (must be consistent everywhere)

### Duration in calendar days
- `durationDays` is measured in **calendar days**, not nights.
- `durationDays` counts both `startDate` and `endDate` (inclusive).

---
