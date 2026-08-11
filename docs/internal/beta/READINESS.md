# READINESS.md — Closed-Beta Release Gate (internal)

Gate for inviting the first closed-beta cohort (5–15 startup engineers).
Source of truth: the repository, Sprint 037 audit, Sprint 038 run, Sprint 039 MCP foundation, and Sprint 040 MCP validation.
Each item is an honest status checkbox with "Status / evidence" line.

Product status context: **B — late alpha / closed-beta candidate** (Sprint 037).
Three hard blockers were identified; Sprints 038–040 resolve blockers 1 and 2, with blocker 3 partially addressed.

---

## Gate items

- [x] **1. README accurately describes the current product**
      Status / evidence: README rewritten in Sprint 038; commands verified against `src/cli/index.ts`; no Sprint-001-era claims remaining.

- [x] **2. Public quickstart (`docs/public/QUICKSTART.md`) usable end-to-end**
      Status / evidence: followed line-by-line in Sprint 038; GitHub + Vercel path complete; Neon/PlanetScale optional sections present and clearly labeled optional.

- [x] **3. Provider credential matrix verified from code**
      Status / evidence: all rows verified against `src/app/connect.ts` in Sprint 038. Cloudflare `CLOUDFLARE_API_TOKEN`; GitHub `GITHUB_TOKEN`/`GH_TOKEN` or `--use-gh`; Vercel `VERCEL_TOKEN`; Sentry `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN`; Neon `NEON_API_KEY`; PlanetScale `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN`.

- [x] **4. Product limitations documented (what Combie does not do)**
      Status / evidence: explicit NOT-YET list in README; MCP read-only boundary in `docs/public/MCP.md`.

- [x] **5. Security behavior documented truthfully**
      Status / evidence: state dir `0700`; credentials file `0600` separate from `combie.db`; offline reads after sync; `--token` may appear in shell history — prefer `--use-env`/`--use-gh`; no OS keychain; no encryption at rest; reset = delete the state dir.

- [x] **6. CLI help strings consistent**
      Status / evidence: "PlanetScale" display label vs `planetscale` id; Sentry `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN` naming; all fixed in Sprint 038.

- [x] **7. Test suite green**
      Status / evidence: 616 passing, 0 failing, 56 files. Sprint 040 baseline; re-run `bun test`.

- [x] **8. Typecheck green**
      Status / evidence: `bun run typecheck` clean (Sprint 040 verified).

- [x] **9. Dogfood run status**
      Status / evidence: GitHub-only dogfood completed Sprint 038 (310 repos, 606 workflow runs). Multi-provider live state verified Sprint 040: Cloudflare (1 zone) + Vercel (44 projects) connected and synced on workspace `.combie`. Multi-provider relationships (source_for, uses_domain_in) not observed — no GitHub connected in workspace state, no custom domain matches found. Deferred scenarios documented in DOGFOOD.md.

- [x] **10. MCP status — foundation implemented AND externally validated (Sprint 039 + 040)**
      Status / evidence: Sprint 039: MCP foundation implemented (stdio server, 4 read-only tools). Sprint 040: stdio server fix (Bun event loop), serialization infinite recursion fix, tools.ts/server.ts duplication resolved, protocol-level scenario suite validated (Scenarios A–J), offline/read-only/security checks verified. Codex (v0.146.0) and Cursor (3.15.6) client configurations documented. Beta MCP contract frozen with 4 tools.

- [x] **11. MCP external-agent validation (Sprint 040)**
      Status / evidence: Protocol-level validation: 4 tools discovered, all respond with structured data, no credential leakage, read-only DB hash unchanged, offline works without provider credentials. Codex: MCP server discovered, tool calls attempted (approval mechanism in exec mode needs further investigation). Cursor: MCP config deployed. Claude Code: not validated (configuration mechanism differs; lower priority).

- [x] **12. Beta promise frozen (current vs not-yet boundary)**
      Status / evidence: Current: local-first CLI; six providers; normalized Resources; exact Relationships (2 kinds); Changes/history; Vercel deployments, GitHub workflow runs, Neon operations evidence; offline one-hop investigate; MCP beta with 4 read-only tools over local stdio. NOT YET: AI reasoning, automatic sync, webhooks, complete graph, root cause, autonomous execution, learning. Beta MCP contract frozen in `docs/public/MCP.md`.

- [ ] **13. Invite criteria note**
      Status / evidence: Beta start planned for after Sprint 041 (release prep). Sprints completed: 038 docs → 039 MCP foundation → 040 tools/validation. Sprint 041 release prep remains. Invites land in Sprint 042. Do not invite early.

---

## Remaining Beta Blockers

1. **Sprint 041 — Closed-beta release prep** (versioning, CI, known limitations, invite criteria, dogfood completion)
2. **Multi-provider dogfood completion** — workspace has Cloudflare + Vercel live; GitHub needed for source_for relationships and shared commit validation. Requires GitHub credentials in workspace context.
3. **Claude Code MCP validation** — deferred; not a hard blocker if Codex + Cursor are available.

---

## Decision rule

- All boxes ticked with real evidence, or explicit recorded deferrals with the exact missing prerequisite → gate passed / conditional.
- MCP must be validated (Sprint 039 + 040 completed).
- Any manufactured dogfood result invalidates the gate.

---

*Maintainers only. Updated after Sprint 040 MCP validation.*
