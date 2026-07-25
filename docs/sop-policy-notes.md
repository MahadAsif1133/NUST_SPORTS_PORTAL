# SOP Policy Notes — Unresolved Discrepancies

This document tracks policy conflicts and ambiguities found in the source SOPs that need resolution with the Sports Branch before production deployment.

## POLICY_TODO #1: Non-Payment Cancellation Rules

**Source conflict**: The Pool SOP and Saddle Club SOP define different non-payment handling rules.

| Rule | Pool SOP | Saddle Club SOP |
|------|----------|----------------|
| Grace period after 5th | None — cancel immediately | 5 days (cancel on day 10) |
| Late fee | Not mentioned | Applied at day 5 |
| Cumulative rule | Not mentioned | 2 missed months in a year → cancellation |

**Current implementation**: Per-facility configurable values in the `facilities` table:
- `grace_period_days`: Pool = 0, Saddle Club = 5, Gym = 0
- `cumulative_missed_months_limit`: All facilities = 2

**Action needed**: Sports Branch to confirm:
1. Should the Gym follow Pool rules or Saddle Club rules?
2. Does the cumulative 2-month rule apply to ALL facilities or just Saddle Club?
3. Is there a late fee amount? (Not specified in Pool SOP)

## POLICY_TODO #2: Master Card Facility Coverage

**Current understanding**: The Master Card covers Pool + Gym together, but NOT Saddle Club. A member wanting Saddle Club access must purchase a separate Saddle Club membership.

**Action needed**: Confirm this is correct.

## POLICY_TODO #3: Freeze During Overdue Status

**Ambiguity**: Can a member request a freeze if their membership is in OVERDUE status?

**Current implementation**: Freeze requests are only allowed when membership status = ACTIVE.

**Action needed**: Sports Branch to confirm whether an overdue member can freeze to "pause" their overdue status.

## POLICY_TODO #4: Family Master Card — Dependent Age Limits

**Ambiguity**: The SOPs mention "Children of Faculty/Staff" but don't specify an age limit for dependents on a Family Master Card.

**Current implementation**: No age limit enforced. Age is recorded but not validated.

**Action needed**: Is there a minimum/maximum age for dependents?

## POLICY_TODO #5: Saddle Club — Children Weekend Restriction

**Current understanding**: Children of Faculty/Staff can only use Saddle Club on weekends (Saturday/Sunday).

**Current implementation**: Enforced at QR scan time — if a dependent's membership category indicates they are a child of faculty/staff, and the scan happens on a weekday at Saddle Club, the scan is denied.

**Action needed**: Confirm the exact definition of "children" (age range? relation type on Family Master Card?)
