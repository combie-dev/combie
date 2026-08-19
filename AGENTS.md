# AGENTS.md — Combie

Combie is the open engineering context layer. Sprints 001–047 implement the
local multi-provider context foundation through **Cloudflare**, **GitHub**,
**Vercel**, **Sentry**, **Neon**, and **PlanetScale**, including deterministic
Relationships (including GitHub↔Sentry `code_mapped_to`), retained provider
evidence (including Sentry releases, release commit identities, and Sentry
issue aggregates), offline investigation, read-only MCP, release distribution,
guided agent setup, and a concluded GitHub-first closed beta. Sprint 047 shipped
same-SHA release↔deployment correspondence (two proven edges; no new
Relationship). Sprint 048 shipped the smallest durable Investigation snapshot
(list + reopen of an explicit `investigate --save`; not the
Investigation Engine). Sprint 049 shipped compare-to-current: `investigation
<id> --compare` diffs one retained snapshot against a live one-hop compose of
the same subject (SAME / SNAPSHOT ONLY / CURRENT ONLY / AUTHORITY CLOCK).
Sprint 050 shipped subject-scoped Investigation history: `investigations
--resource <resource-id>` lists retained snapshots for one exact subject id
(ROADMAP v0.6 historical retrieval; not lifecycle, not Operational
Memory, not the Investigation Engine). Sprint 051 shipped explicit
Investigation resolution memory: `resolution --investigation <id>` records
decision / action / outcome as fields on a saved Investigation;
`resolutions --investigation` / `--resource` retrieve them (ROADMAP v0.7
smallest capture; founder override 2026-08-16; not Incident, not separate
Decision / Action / Outcome models, not Recommendation, not the
Investigation Engine). Sprint 052 shipped exact-id Resolution recall
on live `investigate` and `investigation <id>` reopen (ROADMAP v0.7;
read-time list over the 051 table; not snapshot JSON, not Known Facts,
not evidence-id joins, not Incident, not MCP, not the Investigation
Engine). Sprint 053 shipped Resolution body recall on live
`investigate` and `investigation <id>` RESOLUTION MEMORY (ROADMAP
v0.7; retained decision / action / outcome text; not snapshot JSON,
not Known Facts, not evidence-id joins, not Incident, not MCP, not
the Investigation Engine). Sprint 054 shipped explicit Resolution
evidence references (ROADMAP v0.7; human-attached exact local
evidence ids on a Resolution, validated against what live
`investigate` already shows, shown as a distinct EVIDENCE block on
`resolution <id>` and RESOLUTION MEMORY; not inferred Action, not in
snapshot JSON, not evidence-id joins, not Incident, not MCP, not the
Investigation Engine). Sprint 055 shipped exact evidence-id Resolution
retrieval: `resolutions --evidence <id>` lists retained Resolution
summaries whose human-attached evidence ids include that exact string
(ROADMAP v0.7; read-time membership over the 054 column, 050-shaped;
not inferred, not substring, not similarity, not Incident, not MCP,
not the Investigation Engine). Sprint 056 shipped exact-id Resolution
rows on the existing agent investigate tool (ROADMAP v0.7; additive
`resolutionMemory` on `investigate_resource`; not a fifth tool, not
snapshot MCP, not MCP writes, not Incident, not the Investigation
Engine). Sprint 057 shipped Resource-anchored Resolution:
`resolution --resource <id>` records decision / action / outcome
without a saved Investigation; `investigationId` omitted (ROADMAP
v0.7; founder override 2026-08-17; not Incident, not auto-saved
snapshot, not MCP writes, not inferred Action, not the
Investigation Engine). Sprint 058 shipped explicit Incident grouping:
`incident --resolution` groups ≥2 existing Resolution ids as one
occurrence (`inc:` ids, exclusive membership; ROADMAP v0.7; founder
override 2026-08-17; not lifecycle, not MCP writes, not inferred
Action, not similarity, not Incident recall on investigate, not the
Investigation Engine). Sprint 059 shipped exact-id Incident recall
on live `investigate` / `investigation <id>` reopen and additive
`incidentMemory` on existing `investigate_resource` (ROADMAP v0.7;
read-time membership over 058 member ids; not a fifth tool, not MCP
writes, not lifecycle, not inferred members, not `incidents
--resource` list retrieve, not the Investigation Engine). Sprint 060
shipped exact-id Incident list retrieve under founder override
2026-08-18 (ROADMAP v0.7; `incidents --resolution` / `--resource`;
exact stored-member and 059 subject membership, known-empty exit 0,
AND when both flags; not `--investigation`, not a fifth tool, not
MCP writes, not lifecycle, not inferred members, not `resolution
--incident`, not the Investigation Engine). Sprint 061 shipped
the third Resolution write identity under founder override
2026-08-18 (ROADMAP v0.7; `resolution --incident` XOR;
homogeneous-subject copy; new `res:` appended to the 058 member
array; not `incident_id` on resolutions, not add-existing-members,
not a fifth tool, not MCP writes, not lifecycle, not inferred
Action, not the Investigation Engine). Sprint 062 shipped
the add-existing-members slice under founder override
2026-08-18 (ROADMAP v0.7; `incident <inc> --resolution` appends
already-recorded ungrouped `res:` ids to an existing grouping;
exclusive membership; no `incident_id`; not create-a-new-Incident,
not `incidents --investigation`, not cross-resource
`resolution --incident`, not a fifth tool, not MCP writes, not
lifecycle, not inferred Action, not the Investigation Engine).
Sprint 063 shipped
the remaining Incident list-retrieve-by-investigation slice under
founder override 2026-08-18 (ROADMAP v0.7; `incidents
--investigation`; 059 membership; 060 list shape; known-empty
exit 0; AND with `--resolution` / `--resource`; not a fifth tool,
not MCP writes, not grouping snapshots as members, not
cross-resource `resolution --incident`, not member removal, not
lifecycle, not inferred Action, not the Investigation Engine).
Sprint 064 shipped
the Incident-anchored write for mixed-subject Incidents under
founder override 2026-08-18 (ROADMAP v0.7; `resolution --incident
--resource`; named member subject; 061 homogeneous path unchanged;
not grouping snapshots as members, not first-seen subject, not
`incident_id`, not a fifth tool, not MCP writes, not member
removal, not lifecycle, not inferred Action, not the Investigation
Engine). Sprint 065 shipped
the membership-remove slice under founder override 2026-08-18
(ROADMAP v0.7; `incident <inc> --remove-resolution`; named current
members; remaining ≥2; Resolution rows unchanged; not grouping
snapshots as members, not retitle, not `incident_id`, not a fifth
tool, not MCP writes, not lifecycle, not inferred Action, not the
Investigation Engine). Sprint 066 shipped
the retitle slice under founder override 2026-08-18 (ROADMAP v0.7;
`incident <inc> --title`; named text; `recordedAt` / members
unchanged; not grouping snapshots as members, not `recordedAt`
rewrite, not title-clear, not `incident_id`, not a fifth tool, not
MCP writes, not lifecycle, not inferred Action, not the
Investigation Engine). Sprint 067 shipped
the title-clear slice under founder override 2026-08-18 (ROADMAP
v0.7; `incident <inc> --clear-title`; omit stored title;
`recordedAt` / members unchanged; not grouping snapshots as
members, not `recordedAt` rewrite, not blank `--title` as clear,
not `incident_id`, not a fifth tool, not MCP writes, not
lifecycle, not inferred Action, not the Investigation Engine).
Sprint 068 shipped
the recordedAt-rewrite slice under founder override 2026-08-18
(ROADMAP v0.7; `incident <inc> --recorded-at`; named ISO; title /
members unchanged; not grouping snapshots as members, not
`occurredAt`, not `--recorded-at` on create, not `incident_id`,
not a fifth tool, not MCP writes, not lifecycle, not inferred
Action, not the Investigation Engine).
Sprint 069 shipped
the Investigation-snapshot-pointer slice under founder override
2026-08-18 (ROADMAP v0.6; live `investigate` / `investigation <id>`
050 summaries as INVESTIGATION HISTORY; omitted when empty; not
grouping snapshots as members, not snapshot MCP, not a fifth tool,
not MCP writes, not lifecycle, not `occurredAt`, not inferred
Action, not the Investigation Engine).
Sprint 070 shipped
the Investigation-history-on-`investigate_resource` slice
(ROADMAP v0.6; additive `investigationHistory` on the existing
agent investigate tool; 069 summaries; omitted when empty; not a
fifth tool, not grouping snapshots as members, not MCP writes,
not lifecycle, not `occurredAt`, not snapshot JSON, not the
Investigation Engine).
Sprint 071 shipped
the Investigation-compare-on-`investigate_resource` slice
(ROADMAP v0.6; optional `investigationId` plus additive
`investigationCompare` on the existing agent investigate tool; 049
semantics; omitted when the id is not passed; not a fifth tool,
not snapshot reopen, not grouping snapshots as members, not MCP
writes, not lifecycle, not `occurredAt`, not inferred latest, not
the Investigation Engine).
Sprint 072 shipped
the Investigation-snapshot-on-`investigate_resource` slice
(ROADMAP v0.6; additive `investigationSnapshot` on the existing
agent investigate tool when `investigationId` is named; 048
retained composition; omitted when the id is not passed; not a
fifth tool, not replacing live compose, not
`list_investigations`, not grouping snapshots as members, not
MCP writes, not lifecycle, not `occurredAt`, not the
Investigation Engine).
Sprint 073 shipped
the Investigation-scoped-Resolution-memory-on-`investigate_resource`
slice (ROADMAP v0.7; additive investigation-scoped Resolution
recall on the existing agent investigate tool when
`investigationId` is named; 052 `listResolutions` filter; omitted
when the id is not passed or empty; not a fifth tool, not
changing 056 subject-scoped `resolutionMemory`, not live memory
on `investigationSnapshot`, not investigation-scoped Incident
memory, not grouping snapshots as members, not MCP writes, not
lifecycle, not `occurredAt`, not the Investigation Engine).
Sprint 074 shipped
the Investigation-scoped-Incident-memory-on-`investigate_resource`
slice (ROADMAP v0.7; additive investigation-scoped Incident
recall on the existing agent investigate tool when
`investigationId` is named; 059 `listIncidentsForInvestigation`
filter; omitted when the id is not passed or empty; not a fifth
tool, not changing 059 subject-scoped `incidentMemory`, not live
memory on `investigationSnapshot`, not grouping snapshots as
members, not MCP writes, not lifecycle, not `occurredAt`, not
the Investigation Engine).

## Mandatory reading order before any substantive change

Per `skills/build-combie/SKILL.md` (the canonical Engineering Constitution), read in this order:

1. `skills/build-combie/SKILL.md`
2. `docs/internal/VISION.md`
3. `docs/internal/ARCHITECTURE.md`
4. `docs/internal/ROADMAP.md`
5. Active Sprint under `docs/internal/sprints/`
6. Relevant code and tests under `src/` and `tests/`

## Source-of-truth hierarchy

`VISION.md` → `ARCHITECTURE.md` → `ROADMAP.md` → Active Sprint → Code.

- If implementation conflicts with the Canon, **report the conflict — do not silently change the Canon or the code to mask it.**
- Do not create new permanent documents (e.g. `MEMORY_MODEL.md`, `MCP_SPEC.md`) unless explicitly requested. Canon = VISION, ARCHITECTURE, ROADMAP, SKILL.
- Update only the canonical doc whose *material* content changed; otherwise leave docs untouched.
- `.history/` contains editor backups — never treat as canonical or edit.

## Current baseline: Sprints 001–074 complete; Sprint 075 not started

Multi-provider connection loop:

```text
combie init
  → connect cloudflare | github | vercel | sentry | neon | planetscale
  → sync (all connected providers)
  → providers | resources | relationships | changes | history | context
  → investigate (deterministic, offline, one hop)
  → agent setup | mcp (four read-only local tools)
```

Supported resource kinds: `worker`, `database` (Cloudflare D1 / PlanetScale), `kv_namespace`, `zone`, `repository`, `project` (Vercel / Sentry / Neon).

Providers: Cloudflare, GitHub, Vercel, Sentry, Neon, PlanetScale.

- Current proven graph scope: `source_for` (GitHub repository → Vercel
  project), `uses_domain_in` (Vercel project → Cloudflare zone), and
  `code_mapped_to` (GitHub repository → Sentry project), derived only from
  exact provider evidence. `code_mapped_to` means Sentry configured the
  repository as source-context for the project; it does not prove
  error-reporting completeness or release/issue causality.
- Current agent scope: exactly four local, offline, read-only MCP tools:
  `list_resources`, `list_providers`, `get_related_context`, and
  `investigate_resource`.
- **Shipped Sentry evidence:** compact release history and compact issue
  aggregates on `sentry:project:<id>`, offline `RELEASES` and `ISSUES`,
  `sentry_release` / `sentry_issue` provider activity, and compact
  project-scoped GitHub code-mapping facts used only for `code_mapped_to`.
  Issue rows are current-state snapshots (`firstSeen` / `lastSeen` /
  `count`), not an occurrence log. Sentry releases carry an optional
  compact full Git commit SHA (`lastCommit.id` / `ref` allowlist) shown
  as `git commit` in RELEASES and used only for shared-commit grouping
  inside `code_mapped_to`.
- **Sprint 046 shipped:** persist a compact Sentry release Git commit
  SHA when the provider supplies a full SHA, and extend existing
  ephemeral shared-commit grouping to `code_mapped_to` only (ROADMAP
  v0.5 Safe Semantic Boundary).
- **Sprint 047 shipped:** when one investigation already holds both a
  `source_for` and a `code_mapped_to` shared-commit group for the same
  exact SHA, Combie surfaces that those Vercel deployment and Sentry
  release records reference the commit through those two proven edges —
  a read-time `SharedCommitCorrespondence` (one per SHA) shown in the
  CLI SHARED COMMIT CONTEXT note and an additive
  `sharedCommitCorrespondences` MCP field, plus a
  `shared_commit_correspondence_missing` Missing Context item for
  one-sided groups. No Vercel↔Sentry Relationship, multi-hop
  traversal, Sentry deploy N+1, version-string joins, release↔issue
  joins, new MCP tools, a generic Event or Correlation abstraction,
  Class D events, additional providers, model reasoning, background
  sync, webhooks, telemetry ingestion, operational learning, policy, or
  execution.
- **Sprint 048 shipped:** persist a local, explicit, read-only snapshot
  of an already-composed `investigate` result (`investigate --save`,
  `investigations`, `investigation <id>`). The snapshot is retained
  composition at `composedAt`, not current provider truth. Do not add
  an Investigation Engine, hypotheses, confidence, ContextPack,
  fact-budget redesign, Sentry deploy N+1, new MCP tools, graph
  mutation, multi-hop, generic Event/Correlation abstractions, or
  execution.
- **Sprint 049 shipped:** compare one saved Investigation snapshot to a
  live one-hop compose of the same subject (`investigation <id>
  --compare`), bounded to SAME / SNAPSHOT ONLY / CURRENT ONLY /
  AUTHORITY CLOCK per section. The comparison is ephemeral, persists
  nothing, and never rewrites the snapshot; a missing subject Resource
  is the reported status `subject_missing` (exit 0), not a command
  failure. Do not add Investigation lifecycle status, Incident /
  Decision / Action / Outcome, hypotheses, ContextPack, fact-budget
  redesign, new MCP tools, graph mutation, multi-hop, or execution.
- **Sprint 050 shipped:** subject-scoped Investigation history:
  `investigations --resource <resource-id>` lists retained snapshot
  summaries for one exact `subjectResourceId` (`composedAt` DESC, `id`
  DESC; same 048 table, read-time filter, no schema migration).
  Filtered listing survives subject Resource deletion (never
  `RESOURCE_NOT_FOUND`); a subject with zero snapshots is
  known-empty (exit 0) with distinct copy; unfiltered `investigations`
  is unchanged. Reopen/compare remain `investigation <id>` /
  `--compare`. Do not add lifecycle status, live-investigate
  historical sections, similarity, Incident / Decision / Action /
  Outcome, hypotheses, ContextPack, new MCP tools, graph mutation,
  or execution.
- **Sprint 051 shipped:** explicit Resolution capture on a saved
  Investigation (`resolution --investigation <id> --decision/--action/
  --outcome`, `resolution <id>`, `resolutions [--investigation|--resource]`).
  Decision, action, and outcome are distinguishable free-text fields on
  one record (append-only, `res:` ids, `subjectResourceId` copied so
  listing survives Resource deletion). At least one field is required;
  there is no `resolved: true`, no inferred Action from provider
  activity, no Incident, no Investigation lifecycle, no snapshot rewrite,
  and no MCP change. Founder override 2026-08-16 started this smallest
  v0.7 slice; it does not authorize Recommendation, Learning, similarity,
  or MCP writes. `docs/internal/beta/INVESTIGATION-DOGFOOD.md` remains
  the learning ledger for capture-shape use.
- **Sprint 052 shipped:** exact-id Resolution recall on live
  `investigate` and `investigation <id>` reopen (read-time list over
  the 051 table; distinct RESOLUTION MEMORY section omitted when empty;
  summaries only, not essays; not in snapshot JSON, not Known Facts,
  not `--compare`, not MCP, not evidence-id attribution, not Incident).
- **Sprint 053 shipped:** Resolution body recall on live
  `investigate` and `investigation <id>` reopen (retained decision /
  action / outcome text in the 052 RESOLUTION MEMORY section; omitted
  when empty; not in snapshot JSON, not Known Facts, not `--compare`,
  not MCP, not evidence-id attribution, not Incident).
- **Sprint 054 shipped:** explicit Resolution evidence references
  (optional human-attached exact local evidence ids at record time,
  validated against what live `investigate` shows for that subject;
  shown as a distinct EVIDENCE block on `resolution <id>` and
  RESOLUTION MEMORY; omitted when empty; duplicates collapse
  first-seen; unknown ids fail the whole record; not inferred from
  provider activity, not Action, not snapshot JSON, not Known Facts,
  not MCP, not Incident).
- **Sprint 055 shipped:** exact evidence-id Resolution retrieval:
  `resolutions --evidence <id>` lists retained Resolution summaries
  whose human-attached evidence ids include that exact string
  (membership, not substring; read-time over the 054 column, no
  schema change; known-empty for that id exits 0, never
  `EVIDENCE_ID_NOT_FOUND`; survives subject Resource deletion and
  evidence aging out of live compose; ANDs with `--investigation` /
  `--resource`; one exact id on the list; not inferred from provider
  activity, not Action, not similarity, not Incident, not MCP, not
  snapshot JSON, not Known Facts).
- **Sprint 056 shipped:** exact-id Resolution recall on the existing
  `investigate_resource` tool (read-time list over the 051 table;
  additive `resolutionMemory` structured field, omitted when empty,
  full 053+054 fields, ordered `recordedAt` DESC `id` DESC, never
  mixed into Known Facts / `InvestigationContext` / snapshot JSON;
  not a fifth tool, not snapshot MCP, not MCP writes, not
  `--compare`, not Incident, not inferred Action).
- **Sprint 057 shipped:** Resource-anchored Resolution
  (`resolution --resource <id>` records decision / action / outcome
  without a saved Investigation; `investigationId` omitted as SQL
  NULL; XOR with `--investigation`; Resource must exist at record
  time; 054 evidence validation against that Resource's live compose;
  list placeholder `-`; show / confirmation / RESOLUTION MEMORY omit
  the investigation token; MCP `resolutionMemory` omits
  `investigationId`; investigation reopen stays investigation-scoped;
  no auto-saved snapshot, no sentinel id, no MCP writes, no Incident,
  no inferred Action).
- **Sprint 058 shipped:** explicit Incident grouping
  (`incident --resolution` groups ≥2 existing `res:` ids as one
  occurrence; exclusive membership; optional `--title`; Resolution
  rows unchanged; list count not member essays; show lists exact
  member ids; no lifecycle; no inferred members; no MCP writes; no
  Incident surface on investigate / compare / `investigate_resource`).
- **Sprint 059 shipped:** Incident recall under founder override
  2026-08-17 (INCIDENT MEMORY on live `investigate` / investigation
  reopen; additive `incidentMemory` on existing `investigate_resource`;
  membership over 058 member ids; omitted when empty; not in snapshot
  JSON / Known Facts / `--compare`; not a fifth tool, not MCP writes,
  not lifecycle, not inferred members, not `incidents --resource`
  list retrieve).
- **Sprint 060 shipped:** Incident list retrieve under founder
  override 2026-08-18 (`incidents --resolution` / `--resource`;
  exact stored-member and 059 subject membership; known-empty exit 0;
  AND when both flags; not `--investigation`, not lifecycle, not
  inferred members, not MCP writes, not `resolution --incident`).
- **Sprint 061 shipped:** Incident-anchored Resolution write under
  founder override 2026-08-18 (`resolution --incident` XOR with
  `--investigation` / `--resource`; copy `subjectResourceId` only
  when every loaded member shares one subject; append the new `res:`
  to that Incident’s stored members in the same transaction; no
  `incident_id` column; confirmation names the `inc:`; show has no
  INCIDENT heading; not add-existing-members, not
  `--investigation` list retrieve, not lifecycle, not inferred
  Action, not MCP writes).
- **Sprint 062 shipped:** add existing members after Incident
  record under founder override 2026-08-18 (`incident <inc>
  --resolution` appends already-recorded ungrouped `res:` ids;
  exclusive membership; `recordedAt` / title unchanged; no
  `incident_id` column; not 058 create, not 061 new-row write, not
  `incidents --investigation`, not cross-resource
  `resolution --incident`, not member removal, not lifecycle, not
  inferred Action, not MCP writes).
- **Sprint 063 shipped:** Incident list retrieve by Investigation
  under founder override 2026-08-18 (`incidents --investigation`;
  059 `listIncidentsForInvestigation` membership; 060 list shape;
  known-empty exit 0; AND with `--resolution` / `--resource`; not a
  fifth tool, not MCP writes, not grouping snapshots as members,
  not cross-resource `resolution --incident`, not member removal,
  not lifecycle, not inferred Action).
- **Sprint 064 shipped:** Incident-anchored write for mixed-subject
  Incidents under founder override 2026-08-18 (`resolution
  --incident --resource`; named member subject; 061 homogeneous
  `--incident` unchanged; mixed without `--resource` still
  `INCIDENT_SUBJECT_AMBIGUOUS`; not grouping snapshots as members,
  not first-seen subject, not `incident_id`, not a fifth tool, not
  MCP writes, not member removal, not lifecycle, not inferred
  Action).
- **Sprint 065 shipped:** remove existing members after Incident
  record under founder override 2026-08-18 (`incident <inc>
  --remove-resolution`; named current `res:` ids; remaining ≥2;
  Resolution rows unchanged; no `incident_id`; not grouping
  snapshots as members, not retitle, not 058 create, not 062
  append, not a fifth tool, not MCP writes, not lifecycle, not
  inferred Action).
- **Sprint 066 shipped:** retitle an existing Incident under
  founder override 2026-08-18 (`incident <inc> --title`; named
  text; `recordedAt` / members unchanged; no `incident_id`; not
  grouping snapshots as members, not `recordedAt` rewrite, not
  title-clear, not 058 create, not 062 append, not 065 remove, not
  a fifth tool, not MCP writes, not lifecycle, not inferred
  Action).
- **Sprint 067 shipped:** clear an existing Incident title under
  founder override 2026-08-18 (`incident <inc> --clear-title`;
  omit stored title; `recordedAt` / members unchanged; no
  `incident_id`; not grouping snapshots as members, not
  `recordedAt` rewrite, not blank `--title` as clear, not 058
  create, not 066 retitle, not 062 append, not 065 remove, not a
  fifth tool, not MCP writes, not lifecycle, not inferred Action).
- **Sprint 068 shipped:** rewrite an existing Incident recordedAt
  under founder override 2026-08-18 (`incident <inc>
  --recorded-at`; named ISO; title / members unchanged; no
  `incident_id`; not grouping snapshots as members, not
  `occurredAt`, not `--recorded-at` on create, not 058 create, not
  066 retitle, not 067 clear, not 062 append, not 065 remove, not
  a fifth tool, not MCP writes, not lifecycle, not inferred
  Action).
- **Sprint 069 shipped:** Investigation snapshot pointers on live
  investigate under founder override 2026-08-18 (`INVESTIGATION
  HISTORY` on live `investigate` / `investigation <id>` reopen;
  050 summaries; omitted when empty; no `incident_id`; not
  grouping snapshots as members, not snapshot MCP, not a fifth
  tool, not MCP writes, not lifecycle, not `occurredAt`, not 048
  snapshot rewrite, not 049 `--compare`, not inferred Action).
- **Sprint 070 shipped:** Investigation history on
  `investigate_resource` (ROADMAP v0.6; additive
  `investigationHistory` on the existing agent investigate tool;
  069 summaries; omitted when empty; no `incident_id`; not
  grouping snapshots as members, not a fifth tool, not MCP writes,
  not lifecycle, not `occurredAt`, not 048 snapshot rewrite, not
  049 `--compare`, not inferred Action).
- **Sprint 071 shipped:** Investigation compare on
  `investigate_resource` (ROADMAP v0.6; optional `investigationId`
  plus additive `investigationCompare`; 049 semantics; omitted
  when the id is not passed; no `incident_id`; not grouping
  snapshots as members, not a fifth tool, not snapshot reopen, not
  MCP writes, not lifecycle, not `occurredAt`, not inferred
  latest, not 048 snapshot rewrite).
- **Sprint 072 shipped:** Investigation snapshot reopen on
  `investigate_resource` (ROADMAP v0.6; additive
  `investigationSnapshot` when named `investigationId`; 048
  semantics; omitted when the id is not passed; live compose stays
  the body; no `incident_id`; not grouping snapshots as members,
  not a fifth tool, not `list_investigations`, not MCP writes, not
  lifecycle, not `occurredAt`, not 048 snapshot rewrite).
- **Sprint 073 shipped:** Investigation-scoped Resolution recall
  on `investigate_resource` (ROADMAP v0.7; additive
  `investigationResolutionMemory` when named `investigationId`;
  052 filter; omitted when the id is not passed or empty; 056
  subject-scoped `resolutionMemory` unchanged; no live memory on
  `investigationSnapshot`; no `incident_id`; not grouping
  snapshots as members, not a fifth tool, not investigation-scoped
  Incident memory, not MCP writes, not lifecycle, not
  `occurredAt`).
- **Sprint 074 shipped:** Investigation-scoped Incident recall
  on `investigate_resource` (ROADMAP v0.7; additive
  `investigationIncidentMemory` when named `investigationId`;
  059 filter; omitted when the id is not passed or empty; 059
  subject-scoped `incidentMemory` unchanged; no live memory on
  `investigationSnapshot`; no `incident_id`; not grouping
  snapshots as members, not a fifth tool, not MCP writes, not
  lifecycle, not `occurredAt`).
- **ROADMAP v0.6 Investigation is closed at the deterministic
  milestone** (post-Sprint-050 architecture audit). Shipped minimum
  loop: compose → save retained composition (`investigate --save`) →
  reopen (`investigation <id>`) → compare retained vs current
  (`--compare`) → retrieve retained compositions by subject
  (`investigations --resource <id>`). The deterministic foundation
  (exact Resource subject, one-hop deterministic Relationships, Known
  Facts, Missing Context, provider-native evidence, provider activity,
  dual chronologies / authority semantics, exact shared-commit
  context, same-SHA correspondence) is complete.
  `getInvestigationContext` and its projections satisfy the
  deterministic Investigation coordination responsibility; do not
  introduce a redundant InvestigationEngine abstraction merely to
  match an architectural noun. Remaining v0.6 Capabilities (narrative
  summaries, hypotheses, confidence, live historical pointers, MCP
  snapshot/history/compare access, multi-hop graph expansion, telemetry
  query adapters, additional provider evidence, ContextPack /
  fact-budget redesign, notifications / Signal-driven investigation,
  Combie-managed model reasoning) are optional and evidence-gated, not
  unfinished v0.6 work; persisted open/closed/completed lifecycle is
  not unfinished v0.6 work either. Operational Memory remains ROADMAP
  v0.7 and stays distinct: Investigation ≠ Incident ≠ Decision ≠
  Action ≠ Outcome. Closing v0.6 did not by itself authorize Sprint 051.
  On 2026-08-16 a founder override started Sprint 051 as the smallest
  v0.7 slice: explicit Resolution capture on a saved Investigation
  (decision / action / outcome as fields, exact-id retrieve, no inferred
  Action, MCP frozen). Sprint 051 shipped that slice. It does not
  authorize Incident, Recommendation, Learning, similarity,
  Investigation lifecycle, or MCP writes. Sprint 052 shipped exact-id
  Resolution recall on live `investigate` and `investigation <id>`
  reopen. 051 leftover is not a sequence; evidence-id attribution
  remains unearned. Sprint 053 shipped Resolution body recall on
  those same paths. 052 leftover is not a sequence; evidence-id
  attribution remains unearned. Sprint 054 shipped explicit
  human-attached evidence references on a Resolution (051 leftover is
  not a sequence; evidence-id attribution remains unearned — Sprint
  054 was the smallest v0.7 slice and does not authorize Inference,
  Incident, Recommendation, Learning, similarity, or MCP writes).
  Inferred Action from provider activity remains forbidden. Sprint 055
  shipped exact evidence-id Resolution retrieval on the `resolutions`
  list (054 leftover is not a sequence; membership retrieval is not
  inference — the human named the id; Sprint 055 does not authorize
  Inference, Incident, Recommendation, Learning, similarity, or MCP
  writes). Sprint 055 leftover is not a sequence; Resource-anchored
  Resolution remains unearned. Sprint 056 shipped exact-id Resolution
  recall on the existing `investigate_resource` (additive structured
  field, omitted when empty, not a fifth tool, not snapshot MCP, not
  MCP writes). 056 leftover is not a sequence; Resource-anchored
  Resolution remained unearned until a founder override. On 2026-08-17
  a founder override started Sprint 057 as the smallest write-anchor
  expansion: Resource-anchored Resolution (`resolution --resource`,
  optional `investigationId`, no auto-saved snapshot). It does not
  authorize Incident, Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, or inferred Action. Sprint 057
  shipped that slice. Sprint 057 leftover is not a sequence; Incident
  grouping remained unearned until a founder override. On 2026-08-17
  a founder override started Sprint 058 as the smallest Incident
  grouping slice: explicit grouping of existing Resolution ids
  (`incident --resolution`, `inc:` ids, no inferred members, no
  lifecycle). It does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, inferred Action,
  or Incident recall on investigate. Sprint 058 shipped that slice.
  Sprint 058 leftover is not a sequence; Incident recall on
  investigate remained unearned until a founder override. On
  2026-08-17 a founder override started Sprint 059 as the smallest
  Incident recall slice: INCIDENT MEMORY on investigate / reopen and
  additive `incidentMemory` on existing `investigate_resource`
  (read-time membership, no new persistence). It does not authorize
  Recommendation, Learning, similarity, Investigation lifecycle,
  MCP writes, inferred Action, or `incidents --resource` list
  retrieve. Sprint 059 shipped that slice. Sprint 059 leftover is
  not a sequence; `incidents --resource` / `--resolution` list
  retrieve remained unearned until a founder override. On
  2026-08-18 a founder override started Sprint 060 as the smallest
  Incident list-retrieve slice: `incidents --resolution` /
  `--resource` (read-time membership, no new persistence). It does
  not authorize Recommendation, Learning, similarity, Investigation
  lifecycle, MCP writes, inferred Action, `incidents --investigation`,
  Incident-anchored write, or add-members mutation. Sprint 060
  shipped that slice. Sprint 060 leftover is not a sequence;
  `resolution --incident` write remained unearned until a founder
  override. On 2026-08-18 a founder override started Sprint 061 as
  the smallest third Resolution write identity: `resolution
  --incident` (XOR, homogeneous-subject copy, append the new `res:`
  to the 058 member array, no `incident_id` column). It does not
  authorize Recommendation, Learning, similarity, Investigation
  lifecycle, MCP writes, inferred Action, add-existing-members, or
  `incidents --investigation`. Sprint 061 shipped that slice.
  Sprint 061 leftover is not a sequence; add-existing-members of
  already-recorded `res:` ids remained unearned until a founder
  override. On 2026-08-18 a founder override started Sprint 062 as
  the smallest membership-append slice: `incident <inc>
  --resolution` (existing ungrouped `res:` ids, exclusive
  membership, no `incident_id` column). It does not authorize
  Recommendation, Learning, similarity, Investigation lifecycle,
  MCP writes, inferred Action, `incidents --investigation`,
  cross-resource `resolution --incident`, or member removal.
  Sprint 062 shipped that slice. Sprint 062 leftover is not a
  sequence; `incidents --investigation` retrieve remained unearned
  until a founder override. On 2026-08-18 a founder override
  started Sprint 063 as the smallest remaining Incident
  list-retrieve slice: `incidents --investigation` (059 membership,
  060 list shape, no new persistence). It does not authorize
  Recommendation, Learning, similarity, Investigation lifecycle,
  MCP writes, inferred Action, grouping snapshots as members,
  cross-resource `resolution --incident`, or member removal.
  Sprint 063 shipped that slice. Sprint 063 leftover is not a
  sequence; grouping Investigation snapshots as Incident members
  remains unearned. On 2026-08-18 a founder override started
  Sprint 064 as the smallest remaining Incident-anchored write
  slice: `resolution --incident --resource` (named member subject
  on a mixed grouping; 061 homogeneous path unchanged; no
  `incident_id` column). It does not authorize Recommendation,
  Learning, similarity, Investigation lifecycle, MCP writes,
  inferred Action, grouping snapshots as members, or member
  removal. Sprint 064 shipped that slice. Sprint 064 leftover is
  not a sequence; grouping Investigation snapshots as Incident
  members remains unearned. On 2026-08-18 a founder
  override started Sprint 065 as the smallest membership-remove
  slice: `incident <inc> --remove-resolution` (named current
  members, remaining ≥2, Resolution rows unchanged, no
  `incident_id` column). It does not authorize Recommendation,
  Learning, similarity, Investigation lifecycle, MCP writes,
  inferred Action, grouping snapshots as members, or retitle.
  Sprint 065 shipped that slice. Sprint 065 leftover is not a
  sequence; grouping Investigation snapshots as Incident members
  remains unearned. On 2026-08-18 a founder override started
  Sprint 066 as the smallest retitle slice: `incident <inc>
  --title` (named text, `recordedAt` / members unchanged, no
  `incident_id` column). It does not authorize Recommendation,
  Learning, similarity, Investigation lifecycle, MCP writes,
  inferred Action, grouping snapshots as members, `recordedAt`
  rewrite, or title-clear. Sprint 066 shipped that slice. Sprint
  066 leftover is not a sequence; grouping Investigation snapshots
  as Incident members remains unearned. On 2026-08-18 a founder
  override started Sprint 067 as the smallest title-clear slice:
  `incident <inc> --clear-title` (omit stored title, `recordedAt`
  / members unchanged, no `incident_id` column). It does not
  authorize Recommendation, Learning, similarity, Investigation
  lifecycle, MCP writes, inferred Action, grouping snapshots as
  members, `recordedAt` rewrite, or blank `--title` as clear.
  Sprint 067 shipped that slice. Sprint 067 leftover is not a
  sequence; grouping Investigation snapshots as Incident members
  remains unearned. On 2026-08-18 a founder override started
  Sprint 068 as the smallest recordedAt-rewrite slice: `incident
  <inc> --recorded-at` (named ISO, title / members unchanged, no
  `incident_id` column). It does not authorize Recommendation,
  Learning, similarity, Investigation lifecycle, MCP writes,
  inferred Action, grouping snapshots as members, `occurredAt`, or
  `--recorded-at` on create. Sprint 068 shipped that slice. Sprint
  068 leftover is not a sequence; grouping Investigation snapshots
  as Incident members remains unearned. `occurredAt` remains
  unearned. On 2026-08-18 a founder override started Sprint 069 as
  the smallest live-investigate snapshot-pointer slice: 050
  summaries on `investigate` / `investigation <id>` (omitted when
  empty, no snapshot JSON rewrite). It does not authorize
  Recommendation, Learning, similarity, Investigation lifecycle,
  MCP writes, a fifth tool, grouping snapshots as members,
  snapshot MCP, or `occurredAt`. Sprint 069 shipped that slice.
  Sprint 069 leftover is not a sequence; grouping Investigation
  snapshots as Incident members remains unearned. Fifth-tool
  snapshot reopen / list / compare MCP remains unearned.
  `occurredAt` remains unearned. On 2026-08-18 Sprint 070 started
  as the smallest MCP observe of 069 snapshot pointers: additive
  `investigationHistory` on existing `investigate_resource`
  (069 summaries, omitted when empty, no snapshot JSON). It does
  not authorize Recommendation, Learning, similarity, Investigation
  lifecycle, MCP writes, a fifth tool, grouping snapshots as
  members, or `occurredAt`. Sprint 070 shipped that slice.
  Sprint 070 leftover is not a sequence; grouping Investigation
  snapshots as Incident members remains unearned. Fifth-tool
  snapshot reopen / `list_investigations` remains unearned.
  `occurredAt` remains unearned. On 2026-08-18 Sprint 071 started
  as the smallest named-id compare observe of 049 on existing
  `investigate_resource` (optional `investigationId`, additive
  `investigationCompare`, no snapshot JSON as the live body). It
  does not authorize Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, a fifth tool, grouping
  snapshots as members, inferred latest, or `occurredAt`. Sprint
  071 shipped that slice. Sprint 071 leftover is not a sequence;
  grouping Investigation snapshots as Incident members remains
  unearned. Fifth-tool snapshot reopen / `list_investigations`
  remains unearned. `occurredAt` remains unearned. On 2026-08-18
  Sprint 072 started as the smallest named-id snapshot observe of
  048 on existing `investigate_resource` (additive
  `investigationSnapshot` when `investigationId` is named; live
  compose stays the body). It does not authorize Recommendation,
  Learning, similarity, Investigation lifecycle, MCP writes, a
  fifth tool, grouping snapshots as members, `list_investigations`,
  inferred latest, or `occurredAt`. Sprint 072 shipped that slice.
  Sprint 072 leftover is not a sequence; grouping Investigation
  snapshots as Incident members remains unearned. Fifth-tool
  snapshot reopen / `list_investigations` remains unearned.
  `occurredAt` remains unearned. On 2026-08-18 Sprint 073 started
  as the smallest investigation-scoped Resolution observe of 052
  on existing `investigate_resource` (additive
  `investigationResolutionMemory` when `investigationId` is named;
  056 subject-scoped `resolutionMemory` unchanged). It does not
  authorize Recommendation, Learning, similarity, Investigation
  lifecycle, MCP writes, a fifth tool, grouping snapshots as
  members, investigation-scoped Incident memory, orphan-subject
  MCP survival, inferred latest, or `occurredAt`. Sprint 073
  shipped that slice. Sprint 073 leftover is not a sequence;
  grouping Investigation snapshots as Incident members remains
  unearned. Fifth-tool snapshot reopen / `list_investigations`
  remains unearned. Investigation-scoped Incident memory on this
  path remains unearned. Orphan-subject MCP survival remains
  unearned. `occurredAt` remains unearned. On 2026-08-18 Sprint
  074 started as the smallest investigation-scoped Incident
  observe of 059 on existing `investigate_resource` (additive
  `investigationIncidentMemory` when `investigationId` is named;
  059 subject-scoped `incidentMemory` unchanged). It does not
  authorize Recommendation, Learning, similarity, Investigation
  lifecycle, MCP writes, a fifth tool, grouping snapshots as
  members, orphan-subject MCP survival, inferred latest, or
  `occurredAt`. Sprint 074 shipped that slice. Sprint 074
  leftover is not a sequence; grouping Investigation snapshots
  as Incident members remains unearned. Fifth-tool snapshot
  reopen / `list_investigations` remains unearned. Orphan-subject
  MCP survival remains unearned. `occurredAt` remains unearned.
  Sprint 075 is not started.
  `docs/internal/beta/INVESTIGATION-DOGFOOD.md` remains the learning
  ledger for capture-shape use.
- Explicitly out of scope until a later sprint authorizes a change: new MCP
  tools or semantics, API, SDK, hosted Combie, and in-product analytics or
  feedback collection.

## Repository layout

```text
src/
  cli/                 CLI entry and commands
  agent/               Claude Code, Codex, and Cursor MCP configuration
  app/                 Application services and deterministic context composition
  domain/              Provider-independent Resource, Relationship, and Change models
  mcp/                 Local stdio read-only agent interface
  provider/            Minimal provider contract + registry
  providers/cloudflare  Cloudflare adapter (HTTP client, normalize, errors)
  providers/github      GitHub adapter (HTTP client, normalize, errors)
  providers/vercel      Vercel adapter
  providers/sentry      Sentry adapter
  providers/neon        Neon adapter
  providers/planetscale PlanetScale adapter
  storage/              SQLite domain store + separate credentials file
tests/                 bun:test suites (no live provider credentials required)
```

## Conventions

- Stack: TypeScript + Bun (`bun:sqlite`, `bun:test`).
- TDD: Red → Green → Refactor; smallest implementation that satisfies the Sprint; provider-specific logic stays inside the provider adapter.
- New providers and material provider expansions must follow the
  **Provider Integration Workflow** in `skills/build-combie/SKILL.md`:
  use integrations.sh for surface/auth reconnaissance, verify every relied-on
  contract against first-party provider evidence, use fixtures plus local
  emulator contract tests when compatible, and finish with explicitly
  authorized live-provider dogfood. Registry metadata and emulator behavior
  are never provider authority; never place real secrets or private provider
  data in an emulator.
- Test suite must run **without live provider credentials** (fixtures/mocks).
- Credentials: explicit authorization only.
  - Cloudflare: `--token` or `--use-env` with `CLOUDFLARE_API_TOKEN`
  - GitHub: `--token`, `--use-env` with `GITHUB_TOKEN`/`GH_TOKEN`, or `--use-gh` (`gh auth token`)
  - Vercel: `--token` or `--use-env` with `VERCEL_TOKEN`
  - Sentry: `--token` or `--use-env` with `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN`
  - Neon: `--token` or `--use-env` with `NEON_API_KEY`
  - PlanetScale: `--use-env` with `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN`, or `--token-id` + `--token`; multi-org requires `--organization <slug>`
  - No filesystem/shell-history/`.env` scanning. Secrets never appear in logs, normal output, errors, or commits. Credentials file is mode `0600` and separate from the domain DB.
- Errors must say what the user can do next and preserve provider context without leaking secrets.
- Multi-provider sync attempts each connected provider, persists successes, reports failures, and exits non-zero if any provider fails.
- Commits only when authorized; conventional style (`feat(provider): …`, `fix(storage): …`).
- When a Sprint completes, record Implemented / Deviations / Validation / Learnings / Canon Changes notes in the Sprint doc; never start the next Sprint.
- Never request credentials, authorization headers, unredacted state
  databases, or private resource names.

## Commands

```bash
bun install
bun test
bun run typecheck
bun run combie -- help
```
