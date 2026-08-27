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
Sprint 075 shipped
the orphan-subject-named-id-observe-on-`investigate_resource`
slice (ROADMAP v0.6; named aligned `investigationId` still
returns 072–074 sidecars when the subject Resource is missing;
compare `currentStatus: subject_missing`; live compose keys
omitted; omitted id still `RESOURCE_NOT_FOUND`; not a fifth
tool, not snapshot JSON as the live body, not grouping snapshots
as members, not MCP writes, not lifecycle, not `occurredAt`, not
the Investigation Engine).
Sprint 076 shipped
the named-id-only-observe-on-`investigate_resource` slice
(ROADMAP v0.6; optional `resourceId` when `investigationId` is
named; subject derived from the 048 row; 074 path if Resource
exists, 075 path if missing; omitted `investigationId` still
requires `resourceId`; not a fifth tool, not
`list_investigations`, not grouping snapshots as members, not
MCP writes, not lifecycle, not `occurredAt`, not the
Investigation Engine).
Sprint 077 shipped
the optional-Incident-`occurredAt` slice (ROADMAP v0.7;
`incident <inc> --occurred-at`; named ISO; recordedAt / title /
members unchanged; omitted when absent; not `--occurred-at` on
create, not `--clear-occurred-at`, not grouping snapshots as
members, not a fifth tool, not MCP writes, not lifecycle, not
inferred time, not the Investigation Engine).
Sprint 078 shipped
the optional-Incident-occurredAt-clear slice (ROADMAP v0.7;
`incident <inc> --clear-occurred-at`; omit stored occurredAt;
recordedAt / title / members unchanged; not `--occurred-at` on
create, not blank `--occurred-at` as clear, not grouping
snapshots as members, not a fifth tool, not MCP writes, not
lifecycle, not inferred time, not the Investigation Engine).
Sprint 079 shipped
Resource CURRENT observation clocks (ROADMAP v0.3 remaining
freshness; `providers.last_attempt_at` on every sync try;
CURRENT shows Combie `updatedAt` plus last success vs last
attempt; `unknown_provider_sync_authority` when attempt is after
success; not Resource deletion, not `--json`, not a fifth tool,
not MCP writes, not 078 leftovers, not the Investigation Engine).
Sprint 080 shipped
MCP-parity CLI `--json` on `providers`, `resources`, `related`,
and live `investigate` (shared structured projections; human
output remains default; errors remain stderr; not writes, not
non-MCP commands, not a fifth tool, not artifact handles, not
`skills/combie`, not 078 leftovers).
Sprint 081 shipped
the Investigation snapshot artifact handle (ROADMAP Next Work
Sequence item 3; read-time over `investigations.snapshot_json`
only; sha256 of the stored TEXT, record counts from the retained
snapshot only, in-database location, and a reopen retrieve line
on CLI `investigation <id>` ARTIFACT block and additive MCP
`investigationArtifact` on named-id `investigate_resource`
(happy and orphan-subject 075 paths); `investigationSnapshot`
dump stays; not a file artifact store, not persisted columns,
not a fifth tool, not `--json` on `investigation`, not
`skills/combie`, not 078 leftovers, not the Investigation
Engine).
Sprint 082 shipped
the thin named-id MCP snapshot dump (ROADMAP Next Work Sequence
item 3 remaining slice; named-id `investigate_resource`
`investigationSnapshot` keeps `id` / `subjectResourceId` /
`composedAt` plus a bounded `subjectPreview` (`id`, `provider`,
`kind`, `name`) from the retained snapshot's subject and omits
the nested 048 `InvestigationContext`; `investigationArtifact`
unchanged; complete retrieve stays CLI `investigation <id>`;
`snapshot_json` not rewritten; not a file artifact store, not
persisted preview columns, not a fifth tool, not `--json` on
`investigation`, not `skills/combie`, not 078 leftovers, not the
Investigation Engine).
Sprint 083 shipped
the Composition-Oriented Agent Skill (ROADMAP Next Work Sequence
item 4; `skills/combie/SKILL.md` teaching the six-step shipped
composition loop — compact investigation, freshness / Missing
Context, scoped `sync [provider]` refresh, local `--json` filtering,
deeper evidence on demand, cite exact evidence; YAML `name: combie`
with a third-person description and no `disable-model-invocation`;
content-contract tests under `tests/skills/`; Constitution
`skills/build-combie/SKILL.md` byte-identical; not a fifth tool,
not MCP writes, not `--json` on `investigation`, not `agent setup`
install, not `npx skills add`, not unshipped commands (`timeline` /
`memory` / `ask`, `--refresh`, `--limit`, `--offline`,
`list_investigations`, `get_investigation`), not 078 leftovers,
not the Investigation Engine).
Sprint 084 shipped
Relationship verification clocks (ROADMAP v0.3 remaining Source
Authority; founder override 2026-08-20; last verified is
`Relationship.updatedAt` after a successful same-run pair refresh;
RELATED / investigate show that clock plus required-provider
last-attempt; Missing Context `unknown_relationship_authority`
when a required provider was attempted after last verified; MCP
`get_related_context` / `investigate_resource` related observe
`lastVerifiedAt` and `lastRequiredProviderAttemptAt`; not a new
Relationship kind, not edge deletion on incomplete pair, not
`--json` on `relationships`, not skill install, not populated-
membership, not 078 leftovers, not the Investigation Engine).
Sprint 085 shipped
populated-membership discovery id sets (ROADMAP v0.3 remaining
Source Authority; founder override 2026-08-20; persist Resource
ids from the last successful `discoverResources` as
`providers.last_discovery_resource_ids`; CURRENT
included vs not-in-last-successful-discovery; Missing Context
`not_in_last_successful_discovery` when the subject id is not
in that set; MCP `investigate_resource` subject observes
  `lastSuccessfulDiscovery`; not Resource deletion, not clock
  derivation, not `--json` on `relationships`, not skill install,
  not 078 leftovers, not the Investigation Engine).
Sprint 086 shipped
skill install delivery / discovery for `skills/combie` under founder
override 2026-08-21 (quoted YAML `description` so the skills CLI
discovers `combie`; `docs/public/MCP.md` documents the optional
`npx skills add combie-dev/combie --skill combie -a cursor -a
claude-code -a codex` path; `agent setup` prints that command as an
optional hint after MCP configure or when already configured, never
shelling out; skill body and denylist unchanged; no Combie skill
registry, no checkout copy, no fifth tool, no MCP writes, no extra
`--json`, no RELATED clock thaw, no 078 leftover thaw).
Sprint 087 shipped
Context RELATED verification clocks under founder override
2026-08-21 (ROADMAP v0.3 Source Authority parity; `combie context`
RELATED reuses `formatRelationshipClockLines` /
`lastRequiredProviderAttemptAt` — same copy and semantics as
`related` / investigate; attempt map already computed by
`getRelatedContextForResource`, now threaded through
`ResourceContext`; no Missing Context on `context`, no new clock
model, no `--json`, no checkout skill copy, no fifth tool, no MCP
writes, no 078 leftover thaw).

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

## Current baseline: Sprints 001–113 complete

Launch MVP was validated and concluded on released `v0.4.0`; its conditional
two-hop projection repair was distributed as `v0.4.1`. Task-Aware Context MVP
Waves 1–2 are complete and distributed as `v0.5.0`. On 2026-08-26 the founder
authorized the Operational Learning MVP, explicitly deferring the external
v0.5 task-loop validation pass until Combie has more pre-beta developer
utility. Sprint 111 (Wave 1: Structured Response Memory), Sprint 112 (Wave 2:
exact Incident links and deterministic precedents), and Sprint 113 (Wave 3:
transparent response experience + gated `v0.6.0` release) are complete and
distributed as `v0.6.0`. This is a named founder override, not leftover-order
thaw. No policy, execution, hosted platform, or Sprint 114.

Multi-provider connection loop:

```text
combie init
  → connect cloudflare | github | vercel | sentry | neon | planetscale
  → sync (all connected providers)
  → providers | resources | relationships | changes | history | context
  → investigate (deterministic, offline, one hop; additive two-hop paths)
  → agent setup | mcp (five read-only local tools)
```

Supported resource kinds: `worker`, `database` (Cloudflare D1 / PlanetScale), `kv_namespace`, `zone`, `repository`, `project` (Vercel / Sentry / Neon).

Providers: Cloudflare, GitHub, Vercel, Sentry, Neon, PlanetScale.

- Current proven graph scope: `source_for` (GitHub repository → Vercel
  project), `uses_domain_in` (Vercel project → Cloudflare zone), and
  `code_mapped_to` (GitHub repository → Sentry project), derived only from
  exact provider evidence. `code_mapped_to` means Sentry configured the
  repository as source-context for the project; it does not prove
  error-reporting completeness or release/issue causality.
- Current agent scope: five local, offline, read-only MCP tools
  shipped: `list_resources`, `list_providers`, `get_related_context`,
  `investigate_resource`, and `list_investigations` (summaries only).
  Zero-edge `get_related_context` names `no_known_relationships`
  (`related` stays `[]`). CLI `--json` includes `investigations` and
  compact `investigation <id>` (082 handle). `get_investigation` is
  not a sixth tool. MCP writes remain forbidden. Connection, sync,
  and memory writes stay CLI-only. Launch MVP Wave 2 (Sprint 107)
  shipped read-time two-hop `paths` over stored proven edges
  (`related[]` stays one-hop) and GitHub issues as `subjectGitHubIssues`
  (not Sentry `subjectIssues`).
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
- **Sprint 075 shipped:** Orphan-subject named-id observe on
  `investigate_resource` (ROADMAP v0.6; named aligned
  `investigationId` returns 072–074 sidecars when the subject
  Resource is missing; compare `subject_missing`; live keys
  omitted; omitted id still `RESOURCE_NOT_FOUND`; no
  `incident_id`; not grouping snapshots as members, not a fifth
  tool, not snapshot JSON as the live body, not MCP writes, not
  lifecycle, not `occurredAt`).
- **Sprint 076 shipped:** Named-id-only observe on
  `investigate_resource` (ROADMAP v0.6; optional `resourceId`
  when `investigationId` is named; subject from the 048 row;
  074 if Resource exists, 075 if missing; omitted
  `investigationId` still requires `resourceId`; no
  `incident_id`; not grouping snapshots as members, not a fifth
  tool, not `list_investigations`, not snapshot JSON as the live
  body, not MCP writes, not lifecycle, not `occurredAt`).
- **Sprint 077 shipped:** Optional Incident `occurredAt`
  (`incident <inc> --occurred-at`; ROADMAP v0.7; named ISO;
  recordedAt / title / members unchanged; omitted when absent; no
  `incident_id`; not grouping snapshots as members, not a fifth
  tool, not `--occurred-at` on create, not `--clear-occurred-at`,
  not MCP writes, not lifecycle, not inferred time).
- **Sprint 078 shipped:** Clear an existing Incident occurredAt
  (`incident <inc> --clear-occurred-at`; ROADMAP v0.7; omit stored
  occurredAt; recordedAt / title / members unchanged; no
  `incident_id`; not grouping snapshots as members, not a fifth
  tool, not `--occurred-at` on create, not blank `--occurred-at`
  as clear, not MCP writes, not lifecycle, not inferred time).
- **Sprint 079 shipped:** Resource CURRENT observation clocks
  (ROADMAP v0.3 remaining freshness; additive
  `providers.last_attempt_at`; LAST SYNC remains last success;
  CURRENT on `investigate` / `context` / `history` shows
  `observed by Combie at` (`Resource.updatedAt`), last successful
  provider sync, and last provider sync attempt; Missing Context
  `unknown_provider_sync_authority` only when attempt is after
  success; MCP `list_providers.lastAttemptAt` and
  `investigate_resource` subject clocks; no Resource deletion,
  no `--json`, no fifth tool, no MCP writes, no 078 leftover
  thaw).
- **Sprint 080 shipped:** MCP-parity CLI `--json` on `providers`,
  `resources`, `related`, and live `investigate` (shared MCP
  structured projections; human output remains default; errors
  remain stderr with existing exit codes; no persistence; no
  `--json` on writes or non-MCP commands; no fifth tool, artifact
  handles, `skills/combie`, or 078 leftover thaw).
- **Sprint 084 shipped:** Relationship verification clocks
  (ROADMAP v0.3 remaining Source Authority; founder override
  2026-08-20; last verified is `Relationship.updatedAt` after a
  successful same-run pair refresh; RELATED / investigate show
  that clock plus required-provider last-attempt; Missing Context
  `unknown_relationship_authority` when a required provider was
  attempted after last verified; MCP `get_related_context` /
  `investigate_resource` related observe `lastVerifiedAt` and
  `lastRequiredProviderAttemptAt`; no new Relationship kind, no
  edge deletion on incomplete pair, no `--json` on
  `relationships`, no skill install, no populated-membership, no
  078 leftover thaw).
- **Sprint 085 shipped:** populated-membership discovery id sets
  (ROADMAP v0.3 remaining Source Authority; founder override
  2026-08-20; persist Resource ids from the last successful
  `discoverResources` as `providers.last_discovery_resource_ids`;
  CURRENT included vs not-in-last-successful-discovery; Missing
  Context `not_in_last_successful_discovery` when the subject id
  is not in that set; MCP `investigate_resource` subject observes
  `lastSuccessfulDiscovery`; no Resource deletion, no clock
  derivation, no `--json` on `relationships`, no skill install,
  no 078 leftover thaw).
- **Sprint 086 shipped:** skill install delivery / discovery for
  `skills/combie` under founder override 2026-08-21 (quoted YAML
  `description` so the skills CLI discovers `combie`;
  `docs/public/MCP.md` documents the optional `npx skills add
  combie-dev/combie --skill combie -a cursor -a claude-code -a
  codex` path; `agent setup` prints that command as an optional
  hint after MCP configure or when already configured, never
  shelling out; skill body and denylist unchanged; no Combie skill
  registry, no checkout copy, no fifth tool, no MCP writes, no
  extra `--json`, no RELATED clock thaw, no 078 leftover thaw).
- **Sprint 087 shipped:** Context RELATED verification clocks under
  founder override 2026-08-21 (ROADMAP v0.3 Source Authority parity;
  `combie context` RELATED reuses `formatRelationshipClockLines` /
  `lastRequiredProviderAttemptAt` — same copy and semantics as
  `related` / investigate; attempt map already computed by
  `getRelatedContextForResource`, now threaded through
  `ResourceContext`; no Missing Context on `context`, no new clock
  model, no `--json`, no checkout skill copy, no fifth tool, no MCP
  writes, no 078 leftover thaw).
- **Sprint 088 shipped** CLI `--json` on `combie context` under
  founder override 2026-08-21 (`projectResourceContext` over the
  existing `getResourceContext` compose plus `"context"` in
  `JSON_COMMANDS`; subject identity + `updatedAt` with 079
  `lastSuccessfulProviderSyncAt` / `lastProviderSyncAttemptAt` and
  085 `lastSuccessfulDiscovery` omitted when null; `related[]`
  reuses the `related --json` neighbor shape including 084
  verification clocks; `changes` as investigate-style Change rows;
  human output and error exit codes unchanged; no Missing Context on
  `context`, no fifth tool / `get_context`, no other `--json` thaw,
  no `investigation --json`, no checkout skill copy, no 078 leftover
  thaw, no Resource deletion, no generic Observation type).
- **Sprint 089 shipped** the post-088 dogfood / evidence pass under
  founder override 2026-08-21 (research only; isolated `--dir`; CLI +
  four-tool MCP + `skills/combie` inspect; no `src/` / `tests/` /
  `package.json` edits). Decision: **NO-GO / defer**. One session; no
  blocker; leftover order did not authorize a slice. Listed leftovers
  stay frozen. Leading uneared candidate if a later session repeats
  it: cycle-free `investigate --json` / `investigate_resource` Known
  Facts (not a fifth tool, not `investigation --json`, not Missing
  Context on `context`, not implemented here). Sprint 090 was not
  started.
- **Sprint 090 shipped** cycle-free Investigate Known Facts JSON under
  founder override 2026-08-22 over Sprint 089 dogfood evidence
  (bucket H). `projectKnownFacts` in `src/mcp/projections.ts` copies
  composed facts by value at the boundary so CLI `investigate --json`
  and MCP `investigate_resource` structured `knownFacts` serialize
  shared authority / nested evidence as ordinary objects — no
  `"[Circular]"`. Compose semantics, human Known Facts prose,
  `safeJson` generic cycle marking, and `context --json` compactness
  unchanged; empty stays `[]`; no schema, no fifth tool, no MCP
  writes, no other `--json` thaw (`providerActivity` / `timeline`
  cycles stay frozen), no skill change.
- **Sprint 091 shipped** cycle-free `providerActivity` / `timeline`
  on existing `investigate --json` / MCP `investigate_resource` under
  founder override 2026-08-23 (the adjacent 090 leftover). The shared
  `deepCopyProjectionValue` helper (renamed from 090's
  `deepCopyKnownFactValue`) feeds `projectProviderActivity` /
  `projectTimeline` at the `projectInvestigateResourceLive` boundary,
  so shared `relationships` arrays / `Resource` / nested activity
  edges serialize as ordinary value copies — no `"[Circular]"`.
  Compose identity, human investigate prose, `safeJson` generic
  Circular, `knownFacts` (090), `context --json`, and empty shapes
  unchanged; no schema, no fifth tool, no MCP writes, no
  `investigation --json`, no other `--json` thaw, no skill change.
- **Sprint 092 shipped** the post-090/091 dogfood / evidence pass
  under founder override 2026-08-23 (research / dogfood only; zero
  product code). Re-verified the 090/091 regression claim (0
  `"[Circular]"` in `knownFacts` / `providerActivity` / `timeline` on
  CLI `investigate --json` and MCP `investigate_resource`); the only
  remaining Circular field on the deep document is
  `missingContext[].scope` (shared subject scope across ≥2
  `never_successfully_refreshed` families; `major`; observed on CLI +
  MCP on `sentry:project:450`; not a 090/091 regression). Exactly one
  earned next-work decision: **cycle-free `missingContext` projection
  on existing `investigate --json` / MCP `investigate_resource`**
  (same by-value class as 090/091; reuse `deepCopyProjectionValue`;
  not implemented in 092; founder override required for 093+).
  Secondary minor observations: `skills/combie` still omits
  `context --json` (recurrence 2), MCP still cannot list snapshots
  (recurrence 2), `.timeline` empty while `.providerActivity` /
  `.knownFacts` populated (nit). Leftovers stay frozen (additional
  `--json` reads, checkout skill copy, 078 leftovers, fifth MCP tool,
  `investigation --json`, Resource deletion, generic Observation type,
  Missing Context on `context`, skill-body rewrite). No schema, no
  fifth tool, no MCP writes, no `--json` thaw.
- **Sprint 093 shipped** cycle-free `missingContext` on existing
  `investigate --json` / MCP `investigate_resource` under founder
  override 2026-08-23 (the 092-earned slice; same by-value class as
  090/091). A thin `projectMissingContext` wrapper reuses the shared
  `deepCopyProjectionValue` helper at the `projectInvestigateResourceLive`
  boundary, so `missingContext[].scope` (shared subject scope across
  ≥2 `never_successfully_refreshed` families) serializes as ordinary
  objects on every item — no `"[Circular]"`. Compose scope sharing,
  human Missing Context prose, `safeJson` generic Circular,
  `knownFacts` (090) / `providerActivity` / `timeline` (091),
  `context --json` (still omits `missingContext`), and empty shapes
  unchanged; no schema, no fifth tool, no MCP writes, no
  `investigation --json`, no other `--json` thaw, no Missing Context
  on `context`, no skill change.
- **Sprint 094 shipped** the post-093 dogfood / evidence pass under
  founder override 2026-08-23 (research / dogfood only; zero product
  code). Mandatory **whole-document** deep JSON Circular scan run on
  every exercised surface: CLI `investigate --json` (4 offline
  subjects + live GitHub combie repo), MCP `investigate_resource`
  live (3 subjects) and named-id — **0 `"[Circular]"` anywhere in the
  entire documents**, not just the four fixed fields. The 090/091/093
  regression claim is verified and `missingContext[].scope` (092) is
  fixed; the shared-reference / `"[Circular]"` defect class is
  **CLOSED** on the existing `investigate --json` / MCP
  `investigate_resource` surfaces. Decision: **NO-GO / defer** — no
  remaining friction meets the ledger threshold (no blocker; no
  `major`+ recurrence without a sufficient workaround). Secondary
  observations: `skills/combie` still omits `context --json`
  (recurrence 3, minor, record-only — not auto-authorized), MCP
  list-history residual (recurrence 3, minor, narrowed by 070
  `investigationHistory`), `.timeline` empty while
  `.providerActivity` / `.knownFacts` populated (nit, recurrence 2).
  Leftovers stay frozen (additional `--json` reads, checkout skill
  copy, 078 leftovers, fifth MCP tool, `investigation --json`,
  Resource deletion, generic Observation type, Missing Context on
  `context`, skill-body rewrite). No schema, no fifth tool, no MCP
  writes, no `--json` thaw.
- **Sprint 095 shipped** the `skills/combie` `context --json`
  documentation slice under founder override 2026-08-23 (docs/skill
  only; zero product code). `skills/combie` step 4 now teaches the
  already-shipped `combie context <id> --json` surface (088): the
  `--json` reads list names all five shipped commands (`providers`,
  `resources`, `related`, `context`, live `investigate`); `combie
  context <id> --json` is taught as the compact CURRENT + RELATED +
  CHANGES local-filter document with deep investigation fields (Known
  Facts, provider activity, timeline, Missing Context, memory
  sidecars) staying on `investigate --json` / MCP
  `investigate_resource` — context does not replace investigate.
  Six-step loop, four-tool MCP list, 083 denylist, and Constitution
  guard all unchanged and green; content-contract allowlist extended
  (+1 test: `combie context` / `combie context <id> --json`). No
  `src/` / `package.json` diffs, no CLI flag change, no MCP change, no
  Missing Context on `context`, no skill install change, no checkout
  copy, no additional `--json` thaw, no 078 leftover thaw.
- **Sprint 096 shipped** the post-095 context-quality / task-success
  dogfood / evidence pass under founder override 2026-08-23 (research
  only; zero product code). Three surfaces (human CLI + `skills/combie`
  six-step loop, MCP-only four-tool, offline reads) exercised the
  post-095 loop against **five distinct real engineering questions**
  (release-workflow success/commit/freshness; save→resolution→incident
  memory follow-up; open GitHub issue count; Vercel deployment
  currentness + stale authority; Sentry release/issue depth + telemetry
  gap), each scored Q1–Q5. **Q1 correct retrieval / Q2 provenance /
  authority / uncertainty / Q4 parsimony PASS on every run; Q3
  sufficiency and Q5 gap exposure PASS except the evidence-absent
  GitHub-issues question** where the gap is unnamed
  (`.subjectIssues: not_applicable` is ambiguous; missingContext names
  only `no_known_relationships`) — the same evidence-family-absent
  situation that Sentry names precisely ("no absence can be inferred").
  **0 `"[Circular]"` whole-document** on every exercised surface
  (regression PASS; class stays CLOSED). **Bucket I skill-doc lag is
  CLOSED** — the 095 `context --json` teach was present and followed; a
  literal skill walk correctly chose **not** to sync when clocks were
  fresh. Decision: **NO-GO / defer** — no friction meets the ledger
  threshold (no blocker; no `major`+ recurrence with no sufficient
  workaround). Leading record-only candidate: bucket F GitHub-issue-
  family gap-naming asymmetry (minor, recurrence 1). Secondary record-
  only: bucket C MCP list-history residual (recurrence 4, minor, CLI
  workaround), bucket K structured `get_related_context` silent empty
  (minor), bucket L `context --json` omits deployment depth (minor,
  by-design), timeline-vs-activity (nit, recurrence 3), and two JSON
  shape nits. No `src/` / `package.json` diffs, no fifth tool, no MCP
  change, no `--json` thaw, no Missing Context on `context`, no skill
  change, no checkout copy, no 078 leftover thaw. Sprint 097 is not
  started.
- **Sprint 097 shipped** the cross-provider / memory-boundary dogfood /
  evidence pass under founder override 2026-08-23 (research only; zero
  product code). Three real operational signals (GitHub Release workflow
  failure→success exercised end-to-end; Vercel→GitHub and Sentry→repo
  deferred on expired maintainer credentials), each scored X1–X5 + M1.
  GitHub live sync succeeded (`--use-gh`; 313 repos / 638 workflow runs);
  Cloudflare / Sentry / Vercel live sync **failed** (expired/invalid
  tokens), so **0 Relationships derived** — but **6 Vercel projects
  retain `git.repoId` values that exactly match GitHub repositories** in
  the same store (latent `source_for` edges, e.g. `demo-hub` →
  `github:repository:915052094`), yet every surface reports an empty
  graph (`no_known_relationships` / `related: []`). Authority honesty,
  evidence≠interpretation, and causal-claim avoidance **PASS** everywhere
  (no stale/inferred Relationship asserted; sync failures named);
  X2 cross-provider assemble **deferred**; **M1 no gap** (shipped
  Resolution / Incident capture sufficed — save → resolution → incident →
  reopen recall worked end-to-end). **0 `"[Circular]"` whole-document**
  (regression PASS; class stays CLOSED). Decision: **NO-GO / defer** —
  no bucket meets the ledger threshold (no blocker; no `major`+
  recurrence ≥3 with no sufficient workaround). Leading record-only:
  bucket L cross-provider latent-edge invisibility (089 bucket-H,
  recurrence 2 with 6 concrete exact matches; root cause = credential
  expiry + authority-honest sync-only derivation) and bucket K
  `get_related_context` silent empty (recurrence 2, minor). The 096
  GitHub-issue gap-naming (bucket F) was not re-exercised and stays
  record-only. No `src/` / `package.json` diffs, no fifth tool, no MCP
  change, no `--json` thaw, no Missing Context on `context`, no skill
  change, no checkout copy, no 078 leftover thaw, no memory model.
  Sprint 098 is not started.
- **Sprint 098 shipped** the cross-provider X2 re-run dogfood / evidence
  pass under founder override 2026-08-23 (research only; zero product
  code). Preferred store `/tmp/combie-fresh-20260823` confirmed **6 live
  `source_for`** (GitHub→Vercel); `uses_domain_in` / `code_mapped_to`
  still 0 (honest). Scenarios A (Vercel→GitHub demo-hub), B (GitHub→
  Vercel demo-hub + Forest-Echo-Chat), C (four-tool MCP edged + 0-edge),
  E (Circular smoke) scored X1–X5. **X2 PASS** (097 deferred claim
  completed): verified edges traversed both directions; neighbor
  deployments assembled into RELATED / Known Facts / `context --json` /
  MCP; empty workflow authority named; verification clocks honest;
  evidence≠interpretation and causal-claim avoidance held. **Evidence-
  exists vs relationship-verified friction: none material** on verified
  edges (097 latent-edge observation superseded by re-auth + dual-
  provider sync — visibility product not earned). Record-only: bucket K
  `get_related_context` silent empty on 0-edge (recurrence 3, minor);
  timeline-vs-activity nit. **0 `"[Circular]"` whole-document**
  (regression PASS). Decision: **NO-GO / defer** — no bucket meets the
  ledger threshold. No `src/` / `package.json` diffs, no fifth tool, no
   MCP change, no `--json` thaw, no Missing Context on `context`, no
   skill change, no checkout copy, no 078 leftover thaw, no latent-edge
   visibility surface. Sprint 099 is not started.
- **Sprint 099 shipped** the closed-beta / release-readiness fresh-user
  journey dogfood / evidence pass under founder override 2026-08-24
  (research only; zero product code). Fresh local clone + isolated store
  `/tmp/combie-099-fresh-20260824/store` (NOT the 098 store); public
  QUICKSTART / MCP.md as primary guide. GitHub live (`--use-gh`, 313
  repos / 638 workflow runs, family refresh 177 ok / 136 failed
  disclosed inline); Vercel / Cloudflare / Sentry / Neon / PlanetScale
  deferred (env unset) with distinct actionable errors — honest empty
  graph by design. Scenarios A–E scored **PASS** (install/init;
  connect/auth; sync clarity; discovery; first investigate incl.
  `--json` offline proof), F **PASS as read-only contrast** on the 098
  store (proven `source_for` traversed with both verification clocks;
  neighbor deployment depth absent from `context --json` — known
  by-design minor, recurrence 2), G Circular smoke **0** (class stays
  CLOSED). D: isolated-HOME `agent setup --yes` wrote correct
  Claude/Codex/Cursor entries + skill hint; raw stdio handshake OK;
  exactly four readOnly tools; DB sha256 unchanged across the smoke. E:
  six-step loop steps 1–4 ran on skill text alone with an honest
  sync-skip decision. R1–R8 all PASS (R6 deferred-primary / PASS
  contrast). Friction all minor/nit with workarounds: sync exit code vs
  family-level failure (new, minor); bucket K `get_related_context`
  silent empty recurrence **4** (frozen, record-only); skill does not
  name the subject-workflow-runs JSON field (new, minor). Ledger
  threshold not met. Decision: **NO-GO / defer** — none earned.
- **Sprint 100 shipped** the multi-provider fresh-user completion
  dogfood / evidence pass under founder override 2026-08-24 (research
  only; zero product code). Fresh store
  `/tmp/combie-100-fresh-20260824/store` (not 098/099 primary); **4 live
  providers**; **6 `source_for`** after dual-provider sync; Scenarios
  A–G; **R1–R8 all PASS including R6 primary** — cross-provider
  evidence materially improves understanding vs isolated provider data
  (demo-hub bidirectional; GitHub sees neighbor Vercel deployments;
  Vercel sees composed GitHub CI authority via edge); Source Authority +
  evidence≠interpretation hold; 0 `"[Circular]"`. Friction all
  minor/nit with workarounds (sync exit-code; bucket K recurrence 4;
  skill field-location; context depth by-design). Ledger threshold not
  met. Decision: **NO-GO / defer** — none earned; Sprint 101 requires
  a new founder override. No `src/` / `package.json` diffs, no fifth
  tool, no MCP change, no `--json` thaw, no Missing Context on
  `context`, no skill change, no checkout copy, no 078 leftover thaw.
- **Sprint 101 shipped** the curl-installer / binary-distribution
  evidence pass under founder override 2026-08-24 (research only; zero
  product code). **Primary entry exercised for the first time**:
  `curl -fsSL https://combie.dev/install | sh` (isolated HOME
  `/tmp/combie-101-fresh-20260824/home`; real `$HOME` untouched;
  post-install smoke on fresh isolated `--dir
  /tmp/combie-101-fresh-20260824/store`). Installer mechanism PASS:
  URL 200, served script byte-identical to `install.sh`, darwin-arm64
  selection correct, checksum verified, installed binary sha matches
  published `combie-darwin-arm64`, `combie --version` == `0.1.1`
  (exact QUICKSTART match). **D1–D7 PASS (with friction); D8 FAIL —
  one blocker: release lag vs docs.** The only published release
  (v0.1.1, 2026-08-13, commit `1643252`) is **177 commits / 11 days
  behind HEAD**; Sprints 048–100 unreleased; public docs (MCP.md +
  `skills/combie`) describe the HEAD surface. Manifestations: `--json`
  / `--save` silent no-ops (exit 0), unknown commands
  `investigation(s)` / `resolution` / `incident`, MCP
  `investigate_resource` missing `investigationId` and all sidecar
  fields, `list_providers` lacking `lastAttemptAt`, pre-090
  `"[Circular]"` defect class shipping in MCP results (CLOSED on HEAD
  since 094). Minor/nit: no skill hint (086 absent), `source
  ~/.profile` hint errors on fresh HOME, stale-binary PATH shadow,
  `npx skills add` CWD-write isolation surprise, opaque checksum
  verification, flag-position inconsistency. **Earned next-work
  recommendation for Sprint 102+ (not leftover-order; freezes stay
  frozen): cut and publish a release of current HEAD via the existing
  pipeline (tag push → release.yml matrix + checksums), then re-run
  the D1–D8 smoke against the fresh release** — semantic claim: the
  documented `curl -fsSL https://combie.dev/install | sh` path
  distributes a binary whose behavior matches the public docs and
  `skills/combie`. `bun test` 1286/0 + typecheck PASS; no `src/` /
  `tests/` / `package.json` diffs; no fifth tool, no MCP change, no
  `--json` thaw, no skill change, no checkout copy, no 078 leftover
  thaw.
- **Sprint 102 shipped** the release cut of HEAD + fresh-release D1–D8
  smoke under founder override 2026-08-25 (implements the 101 earned
  recommendation; push authorization recorded verbatim in
  SPRINT-102.md). Prep commit `1993359`: `package.json` → 0.2.0,
  QUICKSTART expected string → `combie 0.2.0`, plus the mechanical
  package-identity assertion update in `tests/cli/commands.test.ts`
  (recorded as Deviation). Annotated tag `v0.2.0` → existing pipeline
  green ×3 + release job (run `32856206747`); Release "Combie v0.2.0"
  with six assets; checksum verified (`c95991a7…`); `latest` resolved
  poll 1; served installer byte-identical to repo `install.sh`.
  Fresh-release curl smoke on isolated HOME + isolated `--dir`:
  **D1–D8 PASS — the Sprint 101 blocker is CLOSED** (findings 2–5
  cleared: `--json` / `--save` live; memory commands recognized; MCP
  `investigationId` + sidecars + `lastAttemptAt` present; 0
  `"[Circular]"` whole-set; DB bytes unchanged under MCP reads;
  skills/combie command audit complete; 086 skill hint printed). New
  friction minor/nit only (agent-setup CWD-dependent `COMBIE_HOME`
  embed without `--dir`; installer `~/.profile` hint recurrence 2; sync
  exit-code carry-over confirmed on release; bucket K recurrence 5) —
  ledger threshold not met, **NO-GO / defer**. No installer or pipeline
  edit, no fifth tool, no MCP change, no `--json` thaw, no skill
  change, no checkout copy, no 078 leftover thaw. Sprint 103 requires a
  new founder override.
- **Sprint 103 shipped** the install / first-run setup-correctness
  slice under founder override 2026-08-25 (implements 102 findings
  1–2; publish-gate sentence recorded verbatim in SPRINT-103.md).
  Prep commit `4a85148`: installer PATH hint names rc-files (both
  copies, sha `79765825…`; no `source ~/.profile`);
  `resolveAgentCombieHome` (`--dir` > `COMBIE_HOME` > cwd `combie.db`
  > `$HOME/.combie` + disclosure) consumed only by the `agent`
  branch; MCP.md automatic-setup wording; `package.json` → 0.2.1,
  QUICKSTART expected string, package-identity assertions. Annotated
  tag `v0.2.1` → existing pipeline green ×4 (run `32890223615`);
  Release "Combie v0.2.1" with six assets; checksum verified
  (`339371c2…`); `latest` resolved poll 1. Isolated HOME/CWD
  verification: V1–V6 PASS; V4 re-checked on the installed
  0.2.1 binary; V6 PASS (`curl | sh` installed 0.2.1, sha match) —
  the first V6 curl (before the V3 redeploy) saw the old
  `source ~/.profile` hint. V3 PASS: served installer
  byte-identical to repo `install.sh` (sha `79765825…`; PARITY-OK);
  post-redeploy piped curl reproduced the rc-file hint. New friction
  minor/nit only (Node-20 action deprecations recurrence;
  `/private/tmp` realpath nit 102 #7 observed again) — ledger
  threshold not met, **NO-GO / defer**. `getCombieRoot` untouched;
  four-tool MCP untouched; no pipeline edit; no fifth tool; leftovers
  stay frozen. Sprint 104 requires a new founder override.
- **Sprint 104 shipped** the post-103 served+released fresh-user
  evidence pass under founder override 2026-08-25 (research only;
  zero product code). Isolated sandbox
  `/tmp/combie-104-fresh-20260825` (never real `$HOME` as a
  Combie-state write; never founder store); primary binary =
  curl-installed v0.2.1. Served installer sha `79765825…` == repo
  `install.sh` (PARITY-OK); latest `v0.2.1`; 6 assets; installed
  sha `339371c2…` == published; PATH hint names rc-files; **no**
  `source ~/.profile`. GitHub live (`--use-gh`, account sgr0691)
  after host-HOME retry for gh + `--dir` store; 313 repositories /
  641 workflow runs (177 refreshed / 136 failed disclosed
  inline); relationships 0 (honest GitHub-only). Investigate
  `github:repository:1331212396`: CURRENT clocks equal; last
  successful discovery included; Missing Context
  `no_known_relationships`; 0 `"[Circular]"` on
  `investigate --json` (29391 bytes) and `context --json`. V4 a–d
  + V5 on the **installed** 0.2.1 binary; four readOnly tools;
  `serverInfo.version` 0.2.1; DB sha unchanged; 086 skill hint
  printed. **D1–D8 PASS; V1–V6 PASS (103-regression HOLD);
  J1–J5 PASS.** R6 not scored (GitHub-only honest empty graph
  PASS). Friction record-only (sync exit-code recurrence of 102
  #3; bucket K silent empty recurrence **6**; `/private/tmp`
  realpath nit 102 #7; isolated-HOME `--use-gh` harness nit). No
  blocker. No 103 regression. Ledger threshold not met.
  Decision: **NO-GO / defer** — no earned 105 slice. Leftovers
  stay frozen. Sprint 105 not started. No `src/` / `tests/` /
  `package.json` diffs; no fifth tool; no MCP change; no
  `--json` thaw; no skill change; no checkout copy; no 078
  leftover thaw.
- **Sprint 105 shipped** the multi-provider / R6 evidence pass
  on the served+released binary under founder override
  2026-08-25 (research only; zero product code). Isolated
  sandbox `/tmp/combie-105-fresh-20260825` (never founder store;
  never real `$HOME` as a Combie-state write). PRIMARY
  curl-installed v0.2.1: `--version` `combie 0.2.1`; sha
  `339371c211a1a8f35bca77b0ec243d48ca4b9e2ae7bc395b66a70bb0c6502058`;
  served sha `79765825…` PARITY-OK; PATH rc-file hint; **no**
  `source ~/.profile`. **104 D/V HOLD.** GitHub `--use-gh`
  connected (sgr0691) via host HOME + `--dir` harness. Vercel
  `--use-env` first failed (`VERCEL_TOKEN is not set`; Scenario H
  historical). Same-day founder-authorized `--use-env`: Connected
  Vercel (sgr0691); token not logged or committed. Dual sync:
  313 GitHub repositories + 44 Vercel projects; **6 `source_for`**.
  R6 driver `demo-hub` (`github:repository:915052094` ↔
  `vercel:project:prj_W7Eweo0ep9oKSczjgdJSZGeSeBvu`): GitHub
  investigate shows 4 neighbor Vercel deployments via the edge;
  Vercel investigate shows inbound GitHub source (workflow
  known-empty honest); verification clocks; MCP related=1;
  `serverInfo.version` 0.2.1; DB unchanged; 0 `"[Circular]"`;
  not the 100 store. **R1–R8 PASS including R6 PRIMARY.**
  Friction record-only (sync exit-code recurrence; bucket K on
  0-edge). Leftover thaw **NO-GO / defer**. Sprint 106 not
  started. A faster-MVP product program remains a separate
  founder override. No `src/` / `tests/` / `package.json` diffs;
  no fifth tool; no MCP change; no `--json` thaw; no skill
  change; no checkout copy; no 078 leftover thaw.
- **Launch MVP authorized (2026-08-25):** keep distributing the
  current curl binary (A). Program B is two capability waves plus a
  launch pass — not v0.8/v0.9, not Investigation
  lifecycle/Recommendation. Cadence: outcome-sized sprints;
  implementation+dogfood together; release after each wave.
  **Sprint 106 (Wave 1) shipped (2026-08-25):** named zero-edge
  `get_related_context` (`no_known_relationships`), fifth tool
  `list_investigations` over existing summaries, `--json` on
  `investigations` and compact `investigation <id>` (082 handle).
  Publish gate **opened** — prep commit + annotated tag `v0.3.0`.
  **Sprint 107 (Wave 2) shipped (2026-08-26):** two-hop proven
  paths (path + clocks; `related[]` stays one-hop; no transitive
  Relationship; no Vercel↔Sentry causality) + GitHub issues as
  `subjectGitHubIssues`. Publish gate **opened** — prep commit +
  annotated tag `v0.4.0`.
- **Sprint 108 (launch pass) shipped (2026-08-26):** Launch MVP
  **concluded (PASS) on released `v0.4.0`** — fresh curl identity +
  checksum verified; v0.2.1→v0.4.0 replacement preserved store bytes,
  Resource/Investigation identity, composedAt, artifact hash; Wave 1
  five-tool/list/named-empty and Wave 2 two-hop paths + GitHub-issue
  tasks passed on the installed binary (live two-hop honestly absent;
  labeled deterministic store for shape); skill-only agent answered
  with exact ids/clocks, no causal invention. One major repaired on
  HEAD under the conditional gate: `[Circular]` in `paths` hop
  evidence (reproduced by test; deep-copy at projection boundary);
  QUICKSTART/MCP.md aligned to three relationship kinds. Publish gate
  **opened and published** — prep commit `29083f5` + annotated tag
  `v0.4.1`; GitHub Release with six assets. Launch MVP was concluded on
  `v0.4.0`; `v0.4.1` distributes the launch repair. Lifecycle /
  Recommendation / Learning / similarity / policy / execution / sixth
  tool / MCP writes remain out of scope.
- **Sprint 109 shipped (2026-08-26): Task-Aware Context MVP Wave 1 —
  task-scoped deterministic composition.** Founder agreement with the
  recommended next program plus explicit instruction "author sprint 109
  then." Exact Resource id + one explicit profile: `change-review`,
  `dependency-impact`, or `response-recall`. CLI surface:
  `investigate <resource-id> --task <profile> --json`; MCP surface:
  optional `task` enum on existing `investigate_resource`. Task mode
  reuses the complete current Investigation compose and exact subject
  Investigation / Resolution / Incident reads, then selects one smaller
  profile-specific view through a concrete application composer and
  shared CLI/MCP projection. Omitted task behavior stays unchanged.
  `--task` cannot combine with `--save`; MCP `task` cannot combine with
  `investigationId`. No schema, task persistence, task-scoped snapshot,
  human task renderer, generic ContextPack / ContextEngine, free-text
  classification, ranking, budget, sixth tool, MCP write, new provider /
  Relationship / traversal, Recommendation, Learning, policy, or
  execution. Shipped in HEAD: `src/app/task-context.ts` (exhaustive
  switch reusing existing composers) + shared `projectTaskContext`
  (thin dependency-impact neighbors, deep-copied path evidence, no
  `"[Circular]"`); CLI validation (rejects `--save`, missing `--json`,
  missing value, unknown profile, and `--task` on other commands) and MCP
  `task` enum (rejects
  `investigationId`, requires `resourceId`, still five read-only tools);
  skill + MCP.md + QUICKSTART teach the surface; 1362 tests / typecheck
  green; T1–T3 dogfood PASS on an isolated store. No tag/push/release;
  Wave 2 not selected.
- **Sprint 110 Complete (2026-08-26): Task-Aware Context MVP Wave 2 —
  progressive on-demand retrieval + gated v0.5.0 release.** Founder
  instruction starts Wave 2 and authorizes version bump / commit / tag / push /
  release only after implementation, architecture, full-test, and P1–P4
  dogfood gates pass. Additive `availableOnDemand` on Sprint 109 task results:
  one semantic current-investigation target on every profile; ordered retained-
  investigation targets only for rows already visible in `response-recall`
  `investigationHistory`. Application Core owns a closed target union without
  CLI/MCP syntax; the shared boundary emits inert CLI argv arrays and exact
  existing `investigate_resource` arguments. Existing full-live and retained
  retrieval paths remain authoritative; current follow-up is live, retained is
  frozen, and MCP retained retrieval stays a thin artifact handle rather than
  the snapshot body. No new inputs, sixth tool, MCP write, schema, persistence,
  command string, automatic retrieval, generic ContextPack/handle registry,
  budget, ranking, classifier, profile rewrite, Investigation lifecycle,
  Recommendation, Learning, policy, execution, provider/graph expansion, or
  Sprint 111. Shipped `availableOnDemand` (one `current-investigation` target
  on every profile + ordered `retained-investigation` targets on
  `response-recall`); Core owns the semantic target union with no CLI/MCP
  syntax; boundary emits safe `argv` arrays + exact `investigate_resource`
  arguments with `returns: retained-snapshot-handle`; 1373 tests / typecheck
  green; P1–P4 dogfood PASS; released as `v0.5.0` (commit `74a54a6`, tag
  `v0.5.0`, run `33016091159`, six assets, checksum `f217e2e8…`, isolated curl
  install and v0.4.1→v0.5.0 state continuity PASS).
- **Sprint 111 Complete (2026-08-26): Operational Learning MVP Wave 1 —
  Structured Response Memory.** Founder-authorized program after explicitly
  deferring external v0.5 task-loop validation before beta. Four append-only
  provider-independent records with exact parent identity: Recommendation
  (`rec:`) → Decision (`dec:`) → Action (`act:`) → Outcome (`out:`).
  Recommendation anchors to an exact Investigation, Resource, or explicit
  Incident member subject; Decision records approved/rejected/deferred/
  modified; Action requires an approved/modified Decision; Outcome records
  an explicit assessment, optional atomic numeric measurement, named
  observation time, and exact evidence. Direct create/show/list is CLI-only.
  Existing `response-recall` CLI JSON and five-tool read-only MCP task mode
  gain additive subject-scoped `structuredResponseMemory` (always present;
  `[]` known-empty). Legacy Resolution fields, Incident `res:` membership,
  Investigation snapshots/artifacts, other task profiles, and task-omitted
  output remain unchanged. Shared `evidence-attachment.ts` leaf reused by
  Resolution / Recommendation / Outcome. 1419 tests / typecheck green;
  O1–O6 dogfood PASS on isolated `/tmp/combie-111-dogfood-20260826`. No
  legacy promotion, inferred Action/Outcome, similarity, Incident linking,
  precedent retrieval, scoring, Learning Engine, policy, execution, MCP
  write/new tool, hosted platform, version bump, commit/tag/push/release, or
  Sprint 112 inside that Sprint (112 was separately authorized afterward).
- **Sprint 112 Complete (2026-08-26): Operational Learning MVP Wave 2 —
  Incident Links and Deterministic Precedents.** Founder explicitly started
  Wave 2 after Sprint 111 PASS. One append-only `IncidentLinkRecord`
  (`ilink:`) for a canonical unordered pair of two exact existing Incidents
  plus required authored reason. Explicit precedents are separate from
  ephemeral candidates. Candidate inclusion is limited to a closed exact
  union: same retained Resolution subject, directly related Incident subjects
  through one stored proven Relationship, shared proven one-hop neighbor
  through two exact Relationships, same exact Incident-anchored Recommendation
  action key, or same exact attempted Action key. Graph reasons retain exact
  Relationship evidence and verification/required-provider-attempt clocks;
  candidates return exact Incident-anchored Sprint 111 chains but never infer
  final Outcome or success. Direct `precedents --incident` supports human and
  JSON output; existing `response-recall` gains additive
  `incidentPrecedentMemory` through shared CLI/MCP projection. One additive
  `incident_links` table only; computed candidates are never persisted. 1463
  tests / typecheck green after the corrective closeout; P1–P7 dogfood PASS on isolated
  `/tmp/combie-112-dogfood-20260826`. Corrective closeout the same day: precedents
  require temporal prior (`effectiveAt = occurredAt ?? recordedAt`; peer
  strictly before query) for both explicit and candidate rows. No text/fuzzy/
  embedding similarity, hidden score/rank, pattern detection, recommendation
  generation, Learning Engine, Incident membership/graph mutation, new MCP
  input/write/tool, broad JSON thaw, policy, execution, hosted platform, Wave 3,
  version bump, commit/tag/push/release, or Sprint 113 inside that Sprint. Wave
  3 was separately authorized on 2026-08-27.
- **Sprint 113 Complete (2026-08-27): Operational Learning MVP Wave 3 —
  Transparent Response Experience + v0.6.0 Release.** Shipped one pure
  read-time application summary (`src/app/incident-response-experience.ts`)
  over Sprint 112's temporally prior precedent sets and exact Incident-
  anchored Sprint 111 chains: groups exact `actionKey` history, keeps
  PROPOSED Recommendations and literal Decision dispositions separate from
  ATTEMPTED Actions and literal Outcome assessments, exposes every count as
  exact retained ids (`count === ids.length`), and surfaces incomplete
  Recommendation/Action branches. Existing `precedents` gains additive
  `responseExperience` (JSON) plus a RECORDED RESPONSE EXPERIENCE human
  section; existing `response-recall` gains additive always-present
  `incidentResponseExperienceMemory` through the same five-tool read-only MCP
  boundary. 1490 tests / typecheck green; L1–L7 dogfood PASS on an isolated
  `/tmp` store (temporal containment incl. occurredAt precedence,
  proposed/attempted separation, outcome completeness, incomplete branches,
  explicit/candidate basis, `precedents`↔`response-recall` JSON parity, zero
  `"[Circular]"`, DB bytes unchanged). No Experience/Learning persistence,
  score, ranking, final Decision/Outcome, success rate, measurement
  interpretation, recommendation generation, preference inference,
  model/provider call, generic Learning Engine, new MCP tool/input/write,
  policy, execution, or hosted platform. Released as `v0.6.0` (commit
  `6e240d8`, tag `v0.6.0`, run `33089613798`, six assets, checksum
  `0c9a3d30…`, isolated curl install `combie 0.6.0`, L8 state-continuity
  PASS; known MCP stdio subprocess flake recurred once and passed on the
  isolated rerun). No Sprint 114.
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
  On 2026-08-18 Sprint 075 started as the smallest named-id
  observe when live compose is `RESOURCE_NOT_FOUND` (aligned
  `investigationId`; sidecars remain; live keys omitted; compare
  `subject_missing`). It does not authorize Recommendation,
  Learning, similarity, Investigation lifecycle, MCP writes, a
  fifth tool, grouping snapshots as members, omitted-id survival,
  inferred latest, or `occurredAt`. Sprint 075 shipped that slice.
  Sprint 075 leftover is not a sequence; grouping Investigation
  snapshots as Incident members remains unearned. Fifth-tool
  snapshot reopen / `list_investigations` remained unearned until
  this Sprint split leftover[1]: named-id-only observe on the
  existing tool (optional `resourceId` when `investigationId` is
  named) is earned; `list_investigations` / `get_investigation`
  stay frozen. `occurredAt` remains unearned. On 2026-08-18
  Sprint 076 started as the smallest named-id-only observe on
  existing `investigate_resource` (`resourceId` optional when
  `investigationId` is named; subject from the 048 row; 074 or
  075 path). It does not authorize Recommendation, Learning,
  similarity, Investigation lifecycle, MCP writes, a fifth tool,
  grouping snapshots as members, `list_investigations`, inferred
  latest, omitted-id live investigate, or `occurredAt`. Sprint
  076 shipped that slice. Sprint 076 leftover is not a sequence;
  grouping Investigation snapshots as Incident members remains
  unearned. Fifth-tool snapshot reopen /
  `list_investigations` remains unearned. Investigation lifecycle
  remains unearned. `occurredAt` remained unearned until this
  Sprint: leftover[0] stays frozen (Investigation ≠ Incident;
  members stay `res:`); leftover[1] fifth-tool /
  `list_investigations` / `get_investigation` stays frozen (076
  already took named-id-only observe; unfiltered list still has
  no four-tool home); lifecycle stays frozen (process claim). On
  2026-08-19 a founder override started Sprint 077 as the
  smallest occurredAt slice (`incident <inc> --occurred-at`;
  optional occurrence time distinct from recordedAt; named ISO;
  recordedAt / title / members unchanged). It does not authorize
  Recommendation, Learning, similarity, Investigation lifecycle,
  MCP writes, a fifth tool, grouping snapshots as members,
  `--occurred-at` on create, `--clear-occurred-at`, inferred
  time, or `incident_id`. Sprint 077 shipped that slice. Sprint
  077 leftover is not a sequence; grouping Investigation
  snapshots as Incident members remains unearned. Fifth-tool
  snapshot reopen / `list_investigations` remains unearned.
  Investigation lifecycle remains unearned. `--occurred-at` on
  create remains unearned. `--clear-occurred-at` remained
  unearned until this Sprint: leftover[0] stays frozen
  (Investigation ≠ Incident; members stay `res:`); leftover[1]
  fifth-tool / `list_investigations` / `get_investigation` stays
  frozen; lifecycle stays frozen; `--occurred-at` on create stays
  frozen (077 / 068 create still omits). On 2026-08-19 a founder
  override started Sprint 078 as the smallest occurredAt-clear
  slice (`incident <inc> --clear-occurred-at`; omit stored
  occurredAt; recordedAt / title / members unchanged). It does
  not authorize Recommendation, Learning, similarity,
  Investigation lifecycle, MCP writes, a fifth tool, grouping
  snapshots as members, `--occurred-at` on create, blank
  `--occurred-at` as clear, inferred time, or `incident_id`.
  Sprint 078 shipped that slice. Sprint 078 leftover is not a
  sequence; grouping Investigation snapshots as Incident members
  remains unearned. Fifth-tool snapshot reopen /
  `list_investigations` remains unearned. Investigation lifecycle
  remains unearned. `--occurred-at` on create remains unearned.
  On 2026-08-19 Canon recorded the Source Authority Contract and
  opened Sprint 079 as the smallest remaining v0.3 freshness
  slice: Resource CURRENT observation clocks plus provider
  last-attempt vs last-success. It does not authorize CLI
  `--json`, artifact handles, `skills/combie`, Relationship
  verification clocks, populated-membership id sets, a generic
  Observation type, MCP writes, a fifth tool, Resource deletion,
  or 078 leftover thaw. Sprint 079 shipped that slice. Sprint
  079 leftover is not a sequence. On 2026-08-19 Sprint 080
  shipped shell-native `--json` on the four MCP-parity CLI reads
  using shared projections. It did not authorize `--json` on
  writes or non-MCP commands, `--limit`, `--offline`, `--refresh`,
  a fifth MCP tool, artifact handles, `skills/combie`, or 078
  leftover thaw. Artifact-backed investigation shipped Sprints
  081–082. `skills/combie/SKILL.md` shipped Sprint 083. On
  2026-08-20 a founder override started Sprint 084 as the
  smallest remaining Source Authority slice (Relationship
  verification clocks). Sprint 084 shipped that slice. Sprint
  084 leftover is not a sequence. On 2026-08-20 a founder
  override started Sprint 085 as the smallest remaining Source
  Authority slice (persist last-successful discovery Resource
  ids; not deletion). Sprint 085 shipped that slice. Sprint 085
  leftover is not a sequence; skill install, extra `--json`, a
  generic Observation type, Resource deletion, and 078 leftovers
  stay frozen.
  `docs/internal/beta/INVESTIGATION-DOGFOOD.md`
  remains the learning ledger for capture-shape use.
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
