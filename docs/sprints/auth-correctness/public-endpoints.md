# Public endpoints register — Capacity Planner

**Sprint:** Auth Correctness Sprint  
**Fix:** #3 — `/api/*` route handler JWT verification  
**Date:** 2026-04-22

## Result

**No public (unauthenticated) endpoints exist in this application.**

Every exported HTTP method in every `app/api/**/route.ts` file is gated by either
`verifyAuth` (any authenticated user) or `verifyAdmin` (admin role required).

---

## Notes

The following classification decisions were flagged for Joel's review:

| Route | Method | Decision | Flag |
|---|---|---|---|
| /api/rows/[sheet] | POST / PATCH / DELETE | `any-authed` | Modifies the `cp_rows` Google Sheets staging table. Classified as user-owned staging writes (per the spec pattern of `POST /api/staff/[id]/leave`), but the Capacity Planner is an admin-only tool. **Consider promoting to `admin` in Fix #5 if this table is not user-editable by design.** |
| /api/data/import | GET | `any-authed` | Read endpoint, but lives on an "import" route. Classified as any-authed (reads project + staff data). Flagging in case this route should be admin-only for access-control clarity. |
| /api/test-data | GET | `admin` | Diagnostic endpoint exposing `cp_rows` counts and sample data. Classified conservatively as admin. **Consider removing or restricting to non-production environments entirely.** |

---

## Classification summary

| Classification | Count |
|---|---|
| `any-authed` | 18 method/route combinations |
| `admin` | 16 method/route combinations |
| `public` | 0 |
