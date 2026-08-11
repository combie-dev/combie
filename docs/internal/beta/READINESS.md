# READINESS.md — Closed-Beta Release Gate (internal)

Gate for inviting the first closed-beta cohort (5–15 startup engineers).
Source of truth: the repository, Sprint 037 audit, and the Sprint 038 run
(README/Quickstart rewrite and DOGFOOD.md). Each item is an honest status
checkbox with a "Status / evidence" line. Nothing here is auto-approved;
fill the evidence, then decide.

Product status context: **B — late alpha / closed-beta candidate** (Sprint 037).
Three hard blockers were identified; Sprint 038 addresses blocker 1 and
prepares blocker 3. MCP (blocker 2) is Sprint 039+.

---

## Gate items

- [ ] **1. README accurately describes the current product**
      Status / evidence: (README rewritten in Sprint 038; commands verified
      against `src/cli/index.ts`; no Sprint-001-era claims remaining)

- [ ] **2. Public quickstart (`docs/public/QUICKSTART.md`) usable end-to-end**
      Status / evidence: (followed line-by-line by a fresh reader; GitHub +
      Vercel path complete; Neon/PlanetScale optional sections present and
      clearly labeled optional)

- [ ] **3. Provider credential matrix verified from code**
      Status / evidence: (verify each row against `src/app/connect.ts`:
      Cloudflare `CLOUDFLARE_API_TOKEN`; GitHub `GITHUB_TOKEN`/`GH_TOKEN` or
      `--use-gh`; Vercel `VERCEL_TOKEN`; Sentry `SENTRY_AUTH_TOKEN`/
      `SENTRY_TOKEN`; Neon `NEON_API_KEY`; PlanetScale
      `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN` with
      `--token-id`/`--token` and `--organization` documented)

- [ ] **4. Product limitations documented (what Combie does not do)**
      Status / evidence: (no MCP, no AI/model reasoning, no autonomous
      execution, no webhooks/background sync, no complete graph, no
      root-cause claims, one-hop offline investigate only)

- [ ] **5. Security behavior documented truthfully**
      Status / evidence: (state dir `0700`; credentials file `0600` separate
      from `combie.db`; offline reads after sync; network only on
      connect/sync; `--token` may appear in shell history — prefer
      `--use-env`/`--use-gh`; no OS keychain; no encryption at rest;
      reset = delete the state dir; no `disconnect` command)

- [ ] **6. CLI help strings consistent**
      Status / evidence: ("PlanetScale" display label vs `planetscale` id;
      Sentry `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN` naming; actionable empty
      states; command examples match actual flags)

- [ ] **7. Test suite green**
      Status / evidence: (608 passing, Sprint 038 baseline; re-run `bun test`)

- [ ] **8. Typecheck green**
      Status / evidence: (`bun run typecheck` clean)

- [ ] **9. Dogfood run status**
      Status / evidence: (fill from `docs/internal/beta/DOGFOOD.md`. If
      deferred: "deferred — exact missing credentials: ..." e.g. "deferred —
      no Vercel token" / "deferred — no Cloudflare zone" and list which
      scenarios A–G remain)

- [ ] **10. MCP status — MUST remain: NOT STARTED after Sprint 038**
      Status / evidence: (Sprint 038 does not begin agent access; Sprint 039
      is the MCP foundation. Zero MCP code under `src/`.)

- [ ] **11. Known remaining blockers**
      Status / evidence: (Sprint 037 list: external docs/onboarding —
      addressed in Sprint 038; read-only MCP — Sprint 039+; real
      multi-provider dogfood — in progress via DOGFOOD.md)

- [ ] **12. Beta promise frozen (current vs not-yet boundary)**
      Status / evidence: (current truthful promise: "Connect your stack once.
      Combie inventories resources, infers exact relationships it can prove,
      remembers changes and selected provider activity, and composes offline
      one-hop investigation context." NOT YET: MCP, AI reasoning, automatic
      sync, webhooks, complete graph, root cause, autonomous execution,
      learning.)

- [ ] **13. Invite criteria note**
      Status / evidence: (beta start planned for after Sprint 041, per
      Sprint 037 plan: 038 docs → 039 MCP foundation → 040 tools/validation →
      041 release prep → 042 invite. Invites land in Sprint 042. Do not
      invite early if the beta promise includes agent access.)

---

## Decision rule

- All boxes ticked with real evidence, or explicit recorded deferrals with
  the exact missing prerequisite → gate passed / conditional.
- MCP must still read NOT STARTED. A ticked "MCP done" is a failed gate.
- Any manufactured dogfood result invalidates the gate.

---

*Maintainers only. Update status after each Sprint 038–041 milestone.*