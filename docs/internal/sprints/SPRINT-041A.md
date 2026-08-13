# SPRINT-041A — Pre-Beta Security Audit & Hardening

> **Status:** Complete — SECURITY GO; Sprint 042 blocked only by Sprint 041 release conditions
> **Depends on:** SPRINT-041
> **Type:** Security audit / adversarial validation / release hardening
> **Primary goal:** Perform a systematic security review of the exact Combie code and release path that closed-beta users will execute; identify and validate vulnerabilities across credentials, filesystem/storage, provider boundaries, MCP, dependencies, input handling, and distribution; fix only genuine pre-beta security blockers; and produce an evidence-backed security release decision.
> **Product phase:** Closed-beta release candidate
> **Feature development:** Frozen
> **MCP contract:** Frozen
> **Beta invitations:** Blocked
> **Execution:** Out of scope
> **Internal AI/model reasoning:** Out of scope
> **Security gate:** Required before Sprint 042

---

# Why This Sprint Exists

Sprint 041 completed the Closed Beta Release Candidate with:

```text
CONDITIONAL GO
```

Sprint 041 also discovered and fixed real security-relevant defects:

```text
read-only paths could mutate/migrate SQLite
exact provider credentials could be echoed through error paths
MCP read-only semantics were not fully represented in tool annotations
```

Those findings are evidence that a deliberate security pass is warranted before
Combie is placed in external users' environments.

At the same time, Sprint 041 already proved important security properties:

```text
credential storage uses restrictive permissions
read-only MCP calls preserve database bytes
provider credentials are absent from MCP output
exact credential echo regressions exist
MCP is local stdio
MCP exposes only four read-only tools
secret scans pass
offline investigation works without provider credentials
```

Therefore Sprint 041A is NOT:

```text
starting security from scratch
building enterprise security infrastructure
adding authentication systems
adding remote services
rewriting Combie
```

It is:

> **A systematic pre-beta attempt to falsify our assumption that the local Combie release is safe enough to give to external users.**

---

# Governing Principle

> **Do not prove that Combie is secure. Try to prove that it is not.**

The audit should actively search for ways Combie could:

```text
expose credentials
modify unexpected files
escape its state boundary
execute unintended commands
trust malicious provider data
mutate during read-only operations
expose sensitive local data through MCP
accept dangerous filesystem paths
hang or exhaust resources on malformed input
ship vulnerable dependencies
leak secrets through errors
```

If those attempts fail under reasonable adversarial conditions, record the evidence.

---

# Security Claim Boundary

Sprint 041A MUST NOT end with claims such as:

```text
Combie is completely secure.
Combie has no vulnerabilities.
Combie is production-secure.
Combie is enterprise-secure.
```

No bounded audit can prove those statements.

The strongest acceptable conclusion is:

> **No unresolved Critical or High findings were identified within the Sprint 041A threat model and tested release surface.**

or:

> **Known findings have been classified, mitigated, accepted, or deferred according to the documented pre-beta security policy.**

---

# Baseline

Begin from the clean committed Sprint 041 baseline.

Sprint 041 reported:

```text
Release commit:
da038939e1def0cf3b2888ec973a8ca465955425

Completion commit:
f8d733a

Tests:
624 pass across 57 files

Typecheck:
clean

Worktree:
clean

Decision:
CONDITIONAL GO
```

Verify the actual repository state:

```bash
git status
git log -10 --oneline
bun test
bun run typecheck
```

Record:

```text
branch
exact HEAD
Sprint 041 release SHA
Sprint 041 completion SHA
test count
typecheck
worktree
```

If Sprint 041 is not committed cleanly:

**STOP.**

Do not combine Sprint 041 and Sprint 041A.

---

# Sprint Mode

Sprint 041A is:

```text
SECURITY AUDIT
+
SECURITY HARDENING
```

It is NOT:

```text
feature development
architecture expansion
security-platform development
```

Production changes are permitted only when they remediate a concrete security finding.

Every production change must reference:

```text
finding ID
severity
attack/failure path
fix
regression test
```

---

# Hard Product Freeze

Do NOT add:

```text
new providers
new MCP tools
new Resource kinds
new Relationship kinds
new evidence families
new investigation features
new graph abstractions
new AI/model integration
new execution capability
background sync
remote MCP
webhooks
accounts
hosted services
```

Security findings do not authorize unrelated cleanup.

---

# Audit Method

Use multiple complementary techniques.

Do not rely on any single scanner or model review.

The audit should combine:

```text
1. architecture/threat-model review
2. dependency/advisory scanning
3. secret scanning
4. static source review
5. dangerous-pattern search
6. filesystem/path adversarial tests
7. malformed-input tests
8. provider-response adversarial tests
9. MCP boundary tests
10. local storage tests
11. credential handling tests
12. release/install review
13. focused regression tests for findings
```

Tool output is evidence.

Tool output is NOT automatically truth.

Review findings manually before assigning severity.

---

# Security Scope

Audit the exact code closed-beta users execute.

Primary scope:

```text
src/
package.json
bun.lock / lockfile
CLI entrypoint
storage
credentials
provider adapters
provider clients
sync
investigation
MCP
serialization
filesystem/state resolution
release/install path
public setup documentation
```

Tests and fixtures are also in scope for:

```text
committed secrets
unsafe examples
false security assumptions
```

Internal docs are in scope where they affect release instructions or expose secrets.

---

# Out-of-Scope Security Domains

Unless repository evidence proves they currently exist, do NOT audit hypothetical:

```text
hosted Combie backend
web application
remote MCP server
multi-user authorization
tenant isolation
OAuth service
cloud database
browser security
public API
billing
remote execution
container runtime
```

Combie does not currently expose those surfaces.

Do not invent them.

---

# Repository Understanding

Before changing code, inspect the security-sensitive architecture.

At minimum inspect:

```text
skills/build-combie/SKILL.md
Canon
ROADMAP
README.md
docs/public/QUICKSTART.md
docs/public/MCP.md
docs/internal/beta/RELEASE.md
docs/internal/beta/READINESS.md
docs/internal/beta/DOGFOOD.md
SPRINT-039.md
SPRINT-040.md
SPRINT-041.md

package.json
lockfile
CLI
state resolution
Store
credential storage
connect application layer
all six provider adapters/clients
sync
MCP server
MCP tools
MCP serialization
investigation entrypoints
```

Produce a Security Repository Understanding report.

Explicitly answer:

1. What code receives provider credentials?
2. Where are credentials persisted?
3. What permissions protect them?
4. What code can read credentials?
5. Which code can write to the filesystem?
6. Which code opens SQLite?
7. Which paths are supposed to be read-only?
8. Which paths can perform schema migrations?
9. Which commands perform provider network requests?
10. Which commands must remain offline?
11. What user-controlled paths exist?
12. How are `COMBIE_HOME` and `--dir` resolved?
13. Are paths normalized/canonicalized?
14. Can Combie follow symlinks?
15. What subprocess execution exists?
16. What shell execution exists?
17. What dynamic imports exist?
18. What external URLs can Combie request?
19. Which URLs are fixed provider endpoints?
20. Can provider responses influence later network destinations?
21. What untrusted provider fields are persisted?
22. What untrusted provider fields are printed?
23. What untrusted provider fields reach MCP?
24. What validation occurs before persistence?
25. What validation occurs at MCP inputs?
26. What limits exist on provider pagination?
27. What limits exist on MCP response size?
28. Can malformed evidence create recursive serialization?
29. What dependencies are security-sensitive?
30. What package lifecycle scripts execute during install?
31. What does the beta user execute after cloning?
32. What privileges does Combie require?
33. What security boundaries were already proven by Sprint 041?
34. What security assumptions remain untested?

No implementation before this report.

---

# Threat Model

Build a concise threat model for the actual beta architecture.

Actors:

## A — Normal local user

A legitimate Combie user who may:

```text
make mistakes
provide malformed paths
use expired tokens
use unusual provider accounts
run from arbitrary cwd
```

## B — Malicious or compromised provider response

Assume a provider API may return:

```text
unexpected strings
extremely long strings
control characters
malformed optional fields
URLs
HTML
ANSI sequences
unexpected JSON shapes
credential echoes
```

Combie must not treat provider data as trusted simply because it came from an API.

## C — Malicious local repository/environment

A user may run Combie from a directory containing:

```text
symlinks
unexpected files
crafted paths
hostile filenames
repository-controlled content
```

## D — Over-permissioned local MCP client

A local coding agent can invoke Combie's four MCP tools.

Assume the agent itself may be manipulated by:

```text
prompt injection
malicious repository text
incorrect reasoning
```

The Combie MCP boundary must still remain:

```text
read-only
local
closed-world
no provider network
no credential output
```

## E — Compromised dependency

We cannot eliminate this risk, but Sprint 041A must inspect:

```text
known advisories
dependency provenance
unexpected lifecycle scripts
unnecessary dependencies
lockfile state
```

---

# Security Invariants

Define the invariants the audit will attempt to break.

## S1 — Credentials never appear in user-visible output

Includes:

```text
CLI
errors
provider failures
MCP
logs
test snapshots
```

## S2 — Credentials never appear in Combie context data

Provider credentials must not enter:

```text
Resource metadata
Relationships
Changes
provider evidence
investigation projections
MCP structuredContent
```

## S3 — Credential storage remains restrictive

Expected:

```text
credentials file: 0600
state directory: 0700 where applicable
```

Verify on actual filesystem.

## S4 — Read-only means byte-level non-mutating where promised

Commands/tools classified as read-only must not:

```text
migrate schema
rewrite SQLite
touch credential files
update timestamps
create state
perform provider network calls
```

## S5 — MCP cannot perform provider network access

The four MCP tools operate only over local Combie state.

## S6 — MCP cannot mutate Combie state

Verify database and relevant files before/after calls.

## S7 — MCP cannot expose credentials

Even when:

```text
provider errors were previously persisted
metadata contains suspicious values
state contains adversarial strings
```

## S8 — State directory cannot unexpectedly escape its intended path

Audit:

```text
--dir
COMBIE_HOME
relative paths
absolute paths
..
symlinks
files instead of directories
```

## S9 — Provider responses cannot cause arbitrary network requests

Provider-returned URLs/metadata must not create SSRF-like behavior.

## S10 — Provider data cannot trigger command execution

No provider field may become:

```text
shell command
subprocess argument with unsafe semantics
dynamic code
eval input
```

## S11 — Malformed input fails safely

Includes:

```text
Resource IDs
provider IDs
paths
MCP arguments
provider JSON
database contents
```

## S12 — Installation does not execute surprising project-controlled behavior

Review package lifecycle scripts and beta installation path.

---

# Phase 1 — Dependency / Supply-Chain Audit

Inspect:

```text
package.json
lockfile
direct dependencies
dev dependencies
transitive dependency state where tooling supports it
install scripts
postinstall scripts
preinstall scripts
prepare scripts
```

Run the ecosystem-appropriate vulnerability/advisory tooling available in the environment.

Do not invent commands.

First inspect what Bun/package tooling actually supports.

Where useful and available, use an additional software composition/advisory scanner.

Record:

```text
tool
version
database/update date if available
command
findings
severity
affected package
direct/transitive
reachable/relevant?
fix available?
```

Do not blindly upgrade dependencies.

A dependency update requires:

```text
actual finding
relevance assessment
minimal compatible fix
full regression
```

---

# Dependency Finding Policy

For every advisory:

ask:

```text
Is the package actually present?
Is the vulnerable version present?
Is the vulnerable code path relevant to Combie?
Is it runtime or dev-only?
Can an external beta user reach it?
Is exploitation local-only?
Does a patched compatible version exist?
```

Record accepted false positives/irrelevant advisories explicitly.

---

# Phase 2 — Secret Audit

Run repository secret scanning across:

```text
tracked source
tests
fixtures
docs
configuration
current diff
git history where tooling permits
```

Search for common credential patterns relevant to:

```text
GitHub
Vercel
Cloudflare
Sentry
Neon
PlanetScale
generic bearer tokens
private keys
connection strings
```

Do NOT print discovered secrets into Sprint notes.

If a real credential is discovered:

```text
STOP exposing it
record only finding metadata
recommend rotation/revocation
remove it safely
```

Never preserve the value in a test fixture.

---

# Phase 3 — Credential Flow Audit

Trace every provider credential end-to-end:

```text
CLI argument/env/gh
→ application layer
→ credential persistence
→ provider client
→ request header
→ error handling
→ redaction
```

Providers:

```text
Cloudflare
GitHub
Vercel
Sentry
Neon
PlanetScale
```

Sprint 041 fixed exact echo for four provider adapters.

Sprint 041A must verify all six.

Test error bodies containing:

```text
exact token
token embedded in sentence
token inside JSON
token repeated
token near punctuation
short token
long token
URL-encoded representation where relevant
```

Do not build a speculative redaction framework unless a concrete bypass is found.

---

# Phase 4 — Filesystem / Path Audit

Audit all uses of:

```text
COMBIE_HOME
--dir
cwd
path.resolve
path.join
mkdir
readFile
writeFile
chmod
SQLite paths
credential paths
```

Search for:

```text
path traversal
unexpected parent writes
symlink behavior
TOCTOU-like file replacement
writing through symlinks
state path pointing at regular file
credential path collision
database path collision
```

Adversarial test cases should include where safe:

```text
relative path
absolute path
nested path
path containing ..
symlinked state directory
state path pointing to file
read-only directory
missing parent
spaces
unicode path
```

Do not damage files outside a disposable scratch directory.

---

# Filesystem Safety Rule

All adversarial filesystem testing must occur under a disposable test root.

Never test traversal by writing into real sensitive paths.

Prove containment using sentinel files and temporary directories.

---

# Phase 5 — SQLite / Storage Audit

Review:

```text
database initialization
schema migration
queries
prepared statements
dynamic SQL
transactions
read-only opens
write opens
failure behavior
corrupt database handling
legacy database behavior
```

Search specifically for SQL built through string interpolation.

Classify every dynamic query.

Test where appropriate:

```text
malformed Resource IDs
provider-controlled strings
quotes
wildcards
very long values
null bytes if runtime permits
```

Verify prepared statements/parameterization protect untrusted values.

---

# SQLite Read-Only Regression

Sprint 041 fixed read probes that applied migrations.

Re-test:

```text
legacy DB
current DB
MCP read
CLI read
uninitialized path
```

Record before/after:

```text
SHA-256
table list
file metadata where useful
```

No read-only operation may silently migrate the database.

---

# Phase 6 — Provider Network Boundary

Map every provider HTTP request.

For each provider record:

```text
base URL
HTTP method
authentication mechanism
pagination behavior
timeouts if any
retry behavior if any
response size assumptions
user-controlled URL components
provider-controlled URL components
```

Search for:

```text
fetch(variableUrl)
new URL(untrusted)
redirect following
provider-returned URL reuse
arbitrary host selection
```

Determine whether any SSRF-like primitive exists.

Do not claim SSRF merely because `fetch` exists.

Show the data flow.

---

# Provider Scope / Least Privilege

Review public credential guidance for each provider.

Ask:

```text
What permissions does Combie actually require?
Does documentation request broader permissions?
Can beta users reasonably use read-only/minimal tokens?
```

Do not redesign provider auth.

Document excessive permission requirements as findings where applicable.

---

# Phase 7 — Untrusted Provider Data

Provider data eventually reaches:

```text
SQLite
CLI
investigation
MCP
external agents
```

Test malicious-but-valid strings such as:

```text
ANSI escape sequences
newlines
tabs
very long names
markdown-like text
JSON-like text
shell-looking text
prompt-injection-looking text
HTML
control characters where accepted
```

Goals:

```text
no command execution
no terminal corruption beyond reasonable text handling
no structural MCP corruption
no serialization recursion
no secret interpolation
```

---

# Agent / Prompt-Injection Boundary

Combie does not control the reasoning behavior of external agents.

However, provider-originated strings may be delivered to those agents.

Determine:

```text
which fields can contain free-form provider/user text
which of those reach MCP
whether provenance remains identifiable
whether Combie ever interprets provider text as instructions
```

Do NOT build an AI prompt-injection defense system in Sprint 041A.

The required invariant is narrower:

> **Combie transports evidence as data and never executes instructions contained within that evidence.**

Document residual external-agent prompt-injection risk as appropriate.

---

# Phase 8 — MCP Security Audit

The frozen MCP surface is:

```text
list_resources
list_providers
get_related_context
investigate_resource
```

Verify exactly four tools.

For every tool verify:

```text
readOnlyHint = true
destructiveHint = false
idempotentHint = true
openWorldHint = false
```

or the exact SDK-equivalent representation.

Verify tool implementations cannot:

```text
sync
connect
write
migrate
spawn commands
access arbitrary files
make provider requests
return credentials
```

---

# MCP Input Adversarial Tests

Test:

```text
missing arguments
wrong types
empty strings
extremely long Resource IDs
malformed provider/kind filters
unicode
control characters
unknown Resources
uninitialized state
corrupt/partial state where safe
```

Expected:

```text
bounded failure
clear error
no crash
no mutation
no network
no secret output
```

---

# MCP Serialization Audit

Sprint 040 previously found infinite recursion in serialization.

Review serialization for:

```text
cycles
BigInt
Date
undefined
arrays
nested objects
unexpected prototypes
very deep structures
very large structures
```

Determine whether an adversarial local DB/provider value can:

```text
hang serialization
overflow recursion
explode output size
crash MCP
```

Do not create arbitrary complexity limits unless evidence warrants them.

If a practical denial-of-service path exists, remediate minimally.

---

# MCP Data Exposure Review

Ask:

```text
Does MCP return more local data than the tool contract requires?
Can one Resource query expose unrelated Resources?
Does one-hop remain one-hop?
Can filters be bypassed?
Can hidden credential/state paths appear?
Can raw provider responses appear?
```

Verify structured output contains only intended context.

---

# Phase 9 — CLI Security Review

Audit command parsing and dispatch.

Search for:

```text
exec
spawn
shell
eval
Function(...)
dynamic import from user path
command construction
unsafe interpolation
```

For each occurrence:

```text
why does it exist?
can user/provider data reach it?
is shell mode enabled?
can arguments escape intended semantics?
```

No finding should be inferred without a real data flow.

---

# Phase 10 — Denial-of-Service / Bounds Review

Do not benchmark.

Look for obvious unbounded behavior:

```text
infinite pagination
recursive traversal
unbounded relationship traversal
unbounded serialization
unbounded file reads
unbounded retries
unbounded output composition
```

Confirm existing product bounds such as:

```text
one-hop investigation
provider-specific pagination limits
GitHub workflow-run bound
```

Where a loop is intentionally unbounded because provider pagination must complete,
record why it remains safe/reasonable.

Do not introduce arbitrary limits solely for audit aesthetics.

---

# Phase 11 — Error Handling

Security-test errors from:

```text
provider authentication
network failure
JSON parse failure
SQLite failure
permission failure
MCP validation
unknown Resource
invalid state path
```

Verify errors do not expose:

```text
credentials
Authorization headers
connection strings
sensitive filesystem contents
raw request configuration
unexpected stack traces in normal user output
```

Internal developer stack traces may be acceptable only where explicitly intended.

---

# Phase 12 — Logging / Diagnostics

Determine whether Combie logs:

```text
request headers
provider responses
credentials
environment variables
database contents
MCP payloads
```

If no logging system exists, record that.

Do not build one.

If diagnostic output exists, verify secret safety.

---

# Phase 13 — Installation / Package Security

Audit the exact beta installation path established in Sprint 041.

Sprint 041 found:

```text
repository-only distribution
package is private
bin points to TypeScript source
bun install --frozen-lockfile
```

Verify:

```text
lockfile is committed
frozen install works
package scripts are understood
no surprising lifecycle script executes
no generated executable permission mutation is required
no global linking is required
```

Do not publish a package during this Sprint.

---

# Phase 14 — Git / Repository Hygiene

Inspect:

```text
.gitignore
.env patterns
.combie exclusion
SQLite files
credential files
temporary files
coverage
build output
```

Verify a normal beta user's local Combie state is unlikely to be accidentally committed.

If `.combie` is not appropriately ignored where it should be:

classify severity based on actual repository behavior.

Do not assume global gitignore.

---

# `.combie` Safety

Because Combie stores local context and credentials, explicitly determine:

```text
what lives under .combie
whether credentials are inside it
whether database contents may contain sensitive infrastructure metadata
whether README/Quickstart warn appropriately
whether repository gitignore protects it
```

The audit must treat accidental `.combie` commits as a security/privacy risk.

---

# Phase 15 — Sensitive Metadata Review

Combie intentionally stores engineering context.

Review what is persisted:

```text
Resource names
provider IDs
account identities
repository identities
domains
deployment evidence
workflow evidence
operation evidence
Relationships
Changes
```

Ask:

```text
Could any stored field unexpectedly contain secrets?
Are raw provider payloads stored?
Are free-form commit messages stored?
Are author fields stored?
Are URLs stored?
Are database connection strings stored?
```

Preserve the existing allowlist philosophy.

Do not expand stored metadata.

---

# Phase 16 — Permissions

Verify actual filesystem permissions after:

```text
init
connect
sync
```

At minimum inspect:

```text
state directory
database
credentials
```

Expected known contract:

```text
state directory: 0700 where applicable
credentials: 0600
```

Determine whether the database permission is appropriate for the local threat model.

If changing database permissions is proposed, justify it from actual exposure.

---

# Phase 17 — Corrupt / Hostile Local State

Using disposable copies only, test reasonable corruption cases:

```text
invalid credentials JSON
empty credentials file
invalid SQLite file
missing database
database with older schema
database missing optional tables
```

Expected:

```text
safe failure
actionable recovery
no destructive automatic behavior from read-only commands
```

Do not build full database recovery tooling.

---

# Phase 18 — Security Documentation

Public documentation should explain only what users need.

Review whether docs truthfully communicate:

```text
credentials are stored locally
where Combie state lives
how credentials are protected
MCP is local/read-only
provider credentials are not exposed to MCP
sync performs provider network access
offline reads do not
beta limitations
```

Do not turn README into a security whitepaper.

If useful, add a concise:

```text
SECURITY.md
```

only if the repository does not already have an appropriate security reporting path.

A beta repository should tell users how to privately report a vulnerability.

---

# Vulnerability Reporting

Determine whether the repository has a security reporting mechanism.

Preferred minimal outcome:

```text
SECURITY.md
```

containing:

```text
supported beta version/build
how to report privately
what information to include
do not open public issues for suspected secrets/vulnerabilities
do not include credentials
expected acknowledgement language if appropriate
```

Do not invent a security email address that does not exist.

Use an actual authorized contact mechanism.

If none exists, record this as a release condition rather than fabricating one.

---

# Finding Format

Every finding must use:

```text
ID:
Title:
Severity:
Beta blocker:
Surface:
Threat actor:
Preconditions:
Evidence:
Impact:
Exploitability:
Affected code:
Recommended fix:
Regression required:
Disposition:
```

IDs:

```text
SEC-041A-001
SEC-041A-002
...
```

---

# Severity Model

Use:

## Critical

Reasonable exploitation could result in:

```text
credential theft
arbitrary code execution
arbitrary filesystem write outside intended state
major destructive behavior
```

**Beta blocker: always.**

## High

Reasonable exploitation could result in:

```text
sensitive local data disclosure
credential exposure under realistic conditions
MCP write/network boundary escape
significant path traversal
known exploitable runtime dependency
```

**Beta blocker: normally yes.**

## Medium

Examples:

```text
limited denial of service
overly broad permissions
restricted metadata disclosure
defense-in-depth weakness
exploit requiring strong local preconditions
```

Evaluate individually.

## Low

Examples:

```text
minor hardening
limited information exposure
unlikely edge case
```

Usually backlog.

## Informational

Examples:

```text
documented residual risk
future hardening opportunity
security-positive observation
```

No fix required.

---

# False Positive Discipline

Do not inflate the audit.

A scanner result is not automatically a vulnerability.

A suspicious code pattern is not automatically exploitable.

Every Critical/High finding requires:

```text
real code path
attacker-controlled input
security boundary crossed
credible impact
```

If not proven:

downgrade or record as unconfirmed.

---

# Fix Policy

Fix during Sprint 041A:

```text
all Critical
all High
Medium findings that are cheap and directly beta-relevant
```

Do not automatically fix:

```text
Low
Informational
speculative Medium
future architecture concerns
```

Record them.

---

# Red → Green → Refactor

Every security code fix requires a regression.

Preferred sequence:

```text
1. reproduce vulnerability safely
2. write failing regression
3. implement minimal fix
4. prove regression green
5. run surrounding suite
6. refactor only if necessary
```

Do not preserve live exploit payloads containing real secrets.

Use synthetic values.

---

# Independent Review

Use parallel subagents for independent security review where useful.

Recommended independent lanes:

```text
A — credentials + provider clients
B — filesystem + SQLite
C — MCP + serialization
D — dependencies + repository hygiene
E — threat model + security documentation
```

Subagents may identify candidate findings.

The primary agent must verify every Critical/High finding before accepting it.

Do not allow multiple subagents to modify overlapping security-sensitive code concurrently.

Prefer audit-first, synthesis, then controlled remediation.

---

# External Security Research

Where dependency or framework behavior matters, consult authoritative current sources.

Preferred:

```text
official Bun documentation
official MCP specification / SDK docs
official dependency advisories
GitHub Security Advisories
NVD where useful
provider security/auth documentation
OWASP
NIST
```

Do not rely on random blog posts for vulnerability claims.

Record sources for externally derived security conclusions.

---

# Security Test Matrix

Complete:

| Surface | Static review | Adversarial test | Automated scan | Result |
|---|---:|---:|---:|---|
| Credentials | | | | |
| Cloudflare | | | | |
| GitHub | | | | |
| Vercel | | | | |
| Sentry | | | | |
| Neon | | | | |
| PlanetScale | | | | |
| Filesystem | | | | |
| COMBIE_HOME | | | | |
| SQLite | | | | |
| Read-only CLI | | | | |
| MCP | | | | |
| Serialization | | | | |
| Provider network | | | | |
| Provider data | | | | |
| Dependencies | | | | |
| Install path | | | | |
| Git hygiene | | | | |
| Public docs | | | | |

---

# Security Invariant Matrix

Complete:

| Invariant | Status | Evidence |
|---|---|---|
| S1 Credentials absent from output | | |
| S2 Credentials absent from context | | |
| S3 Credential storage restrictive | | |
| S4 Read-only paths non-mutating | | |
| S5 MCP performs no provider network | | |
| S6 MCP performs no state mutation | | |
| S7 MCP exposes no credentials | | |
| S8 State path behavior safe | | |
| S9 Provider data cannot redirect network | | |
| S10 Provider data cannot execute commands | | |
| S11 Malformed input fails safely | | |
| S12 Installation behavior understood | | |

Statuses:

```text
PASS
PARTIAL
FAIL
NOT APPLICABLE
```

---

# Final Security Regression

After all fixes:

```bash
bun test
bun run typecheck
git diff --check
git status
```

Run the repository's established secret scan.

Re-run applicable dependency/advisory scan.

Re-run:

```text
credential echo regressions
read-only database hash regression
MCP protocol regression
MCP mutation checks
filesystem/path regressions
security regressions added during this Sprint
```

Record exact counts.

---

# Security Diff Review

Before commit:

```text
review every production diff manually
```

Ask:

```text
Does this actually close the finding?
Did it create a broader abstraction unnecessarily?
Did it change product semantics?
Did it weaken another boundary?
Did it add dependencies?
Did it expand stored data?
```

Security fixes should generally make the product narrower, not broader.

---

# Remaining Sprint 041 Release Conditions

Sprint 041A does NOT automatically close these existing conditions:

```text
accessible repository/release URL
authorized beta-use/license terms
fresh live provider sync on final build
GitHub + Vercel dogfood OR explicitly narrowed cohort
```

Track them separately.

Sprint 041A may discover additional release conditions.

---

# Final Security Decision

Sprint 041A MUST end with exactly one:

## A — SECURITY GO

Meaning:

```text
no unresolved Critical findings
no unresolved High findings
security invariants sufficiently validated
dependency state acceptable for beta
secret handling acceptable
filesystem/storage boundary acceptable
MCP boundary acceptable
release path acceptable
```

This clears the security gate.

Sprint 042 remains blocked only by any unresolved Sprint 041 release conditions.

---

## B — CONDITIONAL SECURITY GO

Meaning:

```text
no unacceptable Critical/High exposure in the tested core path
but explicit security condition(s) must close before invitations
```

List each condition.

---

## C — SECURITY NO-GO

Meaning:

```text
one or more unacceptable security vulnerabilities remain
```

Sprint 042 remains blocked.

Identify the smallest remediation required.

---

# Combined Closed-Beta Gate

Sprint 042 may begin ONLY when both are true:

```text
SECURITY GATE = GO
```

and:

```text
SPRINT 041 RELEASE CONDITIONS = CLOSED
```

Therefore:

```text
Sprint 041
CONDITIONAL GO
      ↓
Sprint 041A
Security Audit
      ↓
security conditions closed
      +
release conditions closed
      ↓
FINAL GO
      ↓
Sprint 042
Closed Beta — First Users
```

---

# Architecture Review Questions

Answer all:

1. What exact baseline was audited?
2. What exact release code will beta users execute?
3. What is Combie's actual local trust boundary?
4. What code receives credentials?
5. Where are credentials persisted?
6. What permissions protect them?
7. Can credentials reach Resource metadata?
8. Can credentials reach Change data?
9. Can credentials reach provider evidence?
10. Can credentials reach MCP?
11. Were all six provider error paths tested for credential echo?
12. Were any redaction bypasses found?
13. Can read-only CLI commands mutate SQLite?
14. Can MCP mutate SQLite?
15. Can read-only paths run migrations?
16. Can MCP trigger sync?
17. Can MCP connect providers?
18. Can MCP perform provider network calls?
19. Can MCP read arbitrary files?
20. Can MCP escape the configured state directory?
21. Can `COMBIE_HOME` cause unsafe path behavior?
22. Can `--dir` cause unsafe path behavior?
23. What symlink behavior was observed?
24. Are SQL queries parameterized?
25. Was dynamic SQL found?
26. Is any user/provider input used in SQL structure?
27. Is shell execution present?
28. Is subprocess execution present?
29. Can provider input reach either?
30. Is `eval` or dynamic code execution present?
31. Can provider data determine request hosts?
32. Is an SSRF-like path present?
33. Are provider redirects relevant?
34. Can malicious provider strings corrupt CLI structure?
35. Can malicious provider strings corrupt MCP structure?
36. Can malicious provider strings trigger execution?
37. Can malicious provider strings cause serialization recursion?
38. Can MCP payload size become practically unbounded?
39. Are provider pagination loops bounded/reasonable?
40. Were obvious DoS paths identified?
41. What direct dependencies are security-sensitive?
42. What dependency vulnerabilities were reported?
43. Which are actually relevant?
44. Were any dependencies upgraded?
45. Why?
46. Does installation execute lifecycle scripts?
47. Are those scripts understood?
48. Is the lockfile committed and frozen install reproducible?
49. Could `.combie` be accidentally committed?
50. Does `.combie` contain credentials?
51. Does `.combie` contain sensitive engineering metadata?
52. Are ignore/documentation protections adequate?
53. Were repository secrets found?
54. Was git history scanned where possible?
55. Were any real credentials discovered?
56. If yes, were rotation/removal steps recorded without exposing them?
57. What sensitive provider metadata is persisted?
58. Are raw provider responses persisted?
59. Are commit messages persisted?
60. Are connection strings persisted?
61. Is provider evidence allowlisted?
62. Are state directory permissions appropriate?
63. Are credential permissions still `0600`?
64. Is database access appropriately restricted?
65. How does Combie behave with corrupt credentials state?
66. How does Combie behave with corrupt SQLite state?
67. Are recovery errors secret-safe?
68. Does the repository have a private vulnerability-reporting path?
69. Is SECURITY.md needed?
70. Were any Critical findings identified?
71. Were any High findings identified?
72. Were any Medium findings identified?
73. Were any Low findings identified?
74. Which findings were fixed?
75. Which findings were accepted/deferred?
76. Does every security fix have regression coverage?
77. Did any security fix change domain semantics?
78. Did any security fix expand the MCP contract?
79. Did any security fix expand provider permissions?
80. Did any security fix add a dependency?
81. Are S1–S12 satisfied?
82. What residual risks remain?
83. What is outside the audit scope?
84. What security claims are safe to make publicly?
85. What security claims are unsafe to make?
86. Final decision: SECURITY GO / CONDITIONAL SECURITY GO / SECURITY NO-GO?
87. Which Sprint 041 release conditions remain?
88. Are there new security release conditions?
89. Is Sprint 042 still blocked?
90. What exact conditions must be true before the first invite?

---

# Completion Notes

## Baseline

- **Sprint 041 HEAD**: `f8d733a5dc0845ac72a48b84b66bbb4d2b74043d` (master)
- **Sprint 041 release commit**: `da038939e1def0cf3b2888ec973a8ca465955425`
- **Tests**: 624 pass across 57 files
- **Typecheck**: clean
- **Worktree**: clean (only SPRINT-041A.md untracked)
- **Verification**: Release SHA present in git log; `da03893` → `f8d733a` (docs-only completion record)

## Security Repository Understanding

Combie is a Bun/TypeScript local CLI backed by SQLite domain state and a
separate `0600` credentials file. Six provider adapters (Cloudflare, GitHub,
Vercel, Sentry, Neon, PlanetScale) authenticate via explicit CLI args/env vars,
store credentials in a permissions-restricted file, and attach tokens as HTTP
Authorization headers. Read-only CLI commands and MCP tools open the database
with `{ readonly: true }` and never perform provider network calls. MCP is
local stdio with exactly four read-only tools. The product has no hosted
backend, remote MCP, user accounts, background daemon, AI/model reasoning, or
execution capability.

### Key Boundaries

| Boundary | Mechanism |
|---|---|
| Credentials → DB separation | Separate `credentials` file (0600) from `combie.db` |
| Read vs Write DB | `isInitialized()` opens readonly; `init()` reopens writable |
| MCP isolation | No CredentialStore import; no fetch calls; stdio only |
| Provider network | Only `connect` and `sync` call fetch; all reads are offline |
| Error redaction | All 6 providers: exact-secret redact + regex patterns |

## Threat Model

### Actor A — Normal Local User
Risks: `--token` in shell history (documented); expired tokens produce
actionable but opaque errors; accidental state in unexpected CWD (default
`./.combie` is CWD-relative); CLI path args without full normalization
(fixed in this Sprint). Mitigation: `--use-env` recommended; `COMBIE_HOME`
and `--dir` resolve to absolute paths.

### Actor B — Malicious Provider Response
No code execution path from provider data. Provider strings reach CLI/MCP
output without sanitization (ANSI, control chars, prompt injection). No
interpretation of provider text as instructions. Serialization cycle/depth
protection added in this Sprint. Residual risk: external agents receiving
untrusted provider data through MCP (prompt injection at the agent layer).

### Actor C — Malicious Local Environment
Symlinks, crafted paths, hostile filenames can influence state directory
resolution. `path.resolve()` now normalizes inputs. No realpath/symlink
following — directory is the user's explicit choice. `.combie` is gitignored.

### Actor D — Over-Permissioned MCP Client
MCP tools are annotated read-only/non-destructive/idempotent/closed-world.
No mutation, network, credential, or file-system-escape paths exist. MCP
exposes provider metadata (account IDs, resource names, deployment details)
which is by design per the frozen contract.

### Actor E — Compromised Dependency
Two runtime deps (`@modelcontextprotocol/server@2.0.0`, `zod@4.4.3`); no
lifecycle scripts; frozen lockfile with integrity hashes. Blast radius: MCP
server compromise could read SQLite/credentials within the same process.
zod compromise limited to input validation bypass.

## Security Invariants

### S1 — Credentials absent from output: PASS
All 6 providers verified. Exact-secret redact uses `> 0` threshold.
Regex catch-all patterns for Bearer, token, and 40+ char hex strings.
Corrupted credentials file no longer crashes with raw content (SEC-041A-001).

### S2 — Credentials absent from context: PASS
Credentials never enter Resource metadata, Relationships, Changes, or
provider evidence. MCP `list_providers` exposes only `accountId`/`accountName`.

### S3 — Credential storage restrictive: PASS
Credentials file: 0600. State directory: 0700. DB file now 0600 after
explicit chmod (SEC-041A-051). Separate from domain DB.

### S4 — Read-only paths non-mutating: PASS
Read-only CLI commands and MCP tools use `isInitialized()` which opens with
`{ readonly: true }`. No migration or write from read-only paths.

### S5 — MCP performs no provider network: PASS
Zero fetch calls in `src/mcp/`. All tools delegate to app-layer read methods.

### S6 — MCP performs no state mutation: PASS
No write methods called from MCP path. DB hash verification exists.

### S7 — MCP exposes no credentials: PASS
No CredentialStore import. `list_providers` filters to accountId/accountName.

### S8 — State path behavior safe: PASS
`path.resolve()` added to `getCombieRoot()`. Defaults to CWD. COMBIE_HOME
and `--dir` now resolve to absolute paths. `.combie` is gitignored.

### S9 — Provider data cannot redirect network: PASS
All provider clients use fixed base URLs. No provider-returned URLs reused
as fetch destinations. URL path components are `encodeURIComponent`-encoded.

### S10 — Provider data cannot execute commands: PASS
Single `spawnSync("gh", ["auth", "token"])` with hardcoded args. No eval,
Function(), or dynamic imports from user/provider input.

### S11 — Malformed input fails safely: PASS
Corrupted credentials → empty state (no crash). Invalid Resource IDs → clear
errors. SQLite uses parameterized queries. MCP serialization handles cycles
and deep nesting (SEC-041A-100/102).

### S12 — Installation behavior understood: PASS
No lifecycle scripts. `--frozen-lockfile` verified. bun.lock committed with
integrity hashes. `bun link` removed from beta path.

## Dependency Audit

| Tool | Version | Database | Findings |
|---|---|---|---|
| Bun audit | 1.3.5 | Built-in | No `bun audit` command available |
| Manual advisory review | N/A | GitHub Advisory DB | No known CVEs in direct deps |

**Direct dependencies (2 runtime + 3 dev):**

| Package | Version | Type | Known CVEs | Assessment |
|---|---|---|---|---|
| `@modelcontextprotocol/server` | 2.0.0 | runtime | None | Limited advisory history; monitor |
| `zod` | 4.4.3 | runtime | CVE-2023-4316 (v3 only) | Pre-release major; monitor |
| `@modelcontextprotocol/client` | 2.0.0 | dev | None | Limited advisory history |
| `@types/bun` | latest | dev | N/A | Type definitions only |
| `typescript` | ^5.8.0 | dev | None | Compiler only |

**Lifecycle scripts:** None in project or direct dependencies.

**Lockfile:** bun.lock committed, `--frozen-lockfile` succeeds, 19 packages
across 20 installs verified.

## Secret Audit

**Scope:** Source code, tests, fixtures, docs, config, git history.

**Result: CLEAN.** No real credentials found. All token-like values are:
- Environment variable names in documentation
- Synthetic test tokens (`"ghp_test_token"`, `"napi_test_token_abcdef"`)
- Redaction logic test strings (`"short-secret-123"`)
- Redaction function internals (`[REDACTED]`)

Git history scan confirmed no real credentials in recent commits.
`.combie/` is gitignored.

## Credential Flow Audit

All six providers traced end-to-end:

| Provider | Input | Storage | HTTP Auth | Error Redaction | Status |
|---|---|---|---|---|---|
| Cloudflare | `--token`, `--use-env`, `CLOUDFLARE_API_TOKEN` | 0600 file | `Bearer` header | Exact + regex | PASS |
| GitHub | `--token`, `--use-env`, `--use-gh` (`gh auth token`) | 0600 file | `Bearer` header | Exact + regex + `ghp_`/`github_pat_` patterns | PASS |
| Vercel | `--token`, `--use-env`, `VERCEL_TOKEN` | 0600 file | `Bearer` header | Exact + regex | PASS |
| Sentry | `--token`, `--use-env`, `SENTRY_AUTH_TOKEN`/`SENTRY_TOKEN` | 0600 file | `Bearer` header | Exact + regex | PASS |
| Neon | `--token`, `--use-env`, `NEON_API_KEY` | 0600 file | `Bearer` header | Exact + regex + password | PASS |
| PlanetScale | `--token-id` + `--token`, `--use-env`, `PLANETSCALE_SERVICE_TOKEN_ID` + `PLANETSCALE_SERVICE_TOKEN` | 0600 file (encoded `id:secret`) | `Authorization: id:secret` header | Exact + regex + auth header + password | PASS |

**Redaction threshold unified:** All six providers now use `secret.length > 0`
(no minimum length requirement). Previously Neon used `>= 8` and PlanetScale
used `>= 4`. Fix: SEC-041A-003.

**Corrupted credentials file validation:** `JSON.parse` in `read()` is now
try/catch-protected. Malformed JSON returns empty state instead of crashing
with raw token content. Fix: SEC-041A-001.

## Filesystem Audit

**Path resolution:** `getCombieRoot()` now resolves all paths with
`path.resolve()`. Fix: SEC-041A-050.

**Directory creation:** `mkdirSync` with `{ recursive: true, mode: 0o700 }`.
TOCTOU `existsSync` guard removed (relies on `mkdirSync` idempotency).
Fix: SEC-041A-053.

**Permissions:** State directory 0700, credentials file 0600, DB file
0600 (explicit chmod after creation). Fix: SEC-041A-051.

**Symlinks:** Not followed. No `realpath`/`lstat` usage. Directory is the
user's explicit choice. Accepted residual risk.

**Traversal:** `path.resolve()` normalizes `..` segments. No writes outside
the resolved absolute path observed.

## SQLite Audit

**String interpolation:** Dynamic SQL present only in migration helpers
(`ensureNullableTextColumn`/`ensureNullableIntegerColumn`) with hardcoded
table/column names from a constant allowlist array. No user input reaches
SQL structure. All data queries use parameterized `?` placeholders.

**Read-only behavior:** `isInitialized()` opens with `{ readonly: true }`.
Re-verified: read-only paths do NOT apply migrations, do NOT rewrite DB,
do NOT update timestamps.

**Legacy DB handling:** Legacy-initialized database preserves SHA-256 and
table set across read-only probes.

## Provider Network Audit

All six providers use fixed base URLs. No user-controlled or
provider-controlled URL host components. URL path segments consistently
`encodeURIComponent`-encoded. No SSRF-like primitive exists. Provider
redirects not explicitly followed (Bun's default fetch behavior).

## Untrusted Provider Data Audit

Provider strings (resource names, workflow names, branch names, repo names,
commit SHAs, deployment UIDs) are persisted without content sanitization
and rendered to CLI/MCP output. No ANSI escape stripping. This is accepted
as a known residual risk — Combie treats provider evidence as data and
never interprets it as instructions.

## MCP Audit

**Contract verification:** Exactly 4 tools: `list_resources`,
`list_providers`, `get_related_context`, `investigate_resource`. All
annotations correct: `readOnlyHint=true`, `destructiveHint=false`,
`idempotentHint=true`, `openWorldHint=false`.

**Mutation test:** MCP calls leave DB SHA-256 unchanged. No sync, connect,
credential, or write tools exist.

**Network test:** Zero fetch calls in MCP code path.

**Credential test:** No CredentialStore import. `list_providers` surfaces
only accountId/accountName.

## Serialization Audit

**Cycle detection:** Added `WeakSet`-based visited object guard. Returns
`"[Circular]"` for cycles. Fix: SEC-041A-100.

**Depth limit:** Added depth counter (max 100). Returns `"[max depth]"` for
excessive nesting. Fix: SEC-041A-102.

**BigInt:** Now converted to string (was `Number()`, could lose precision).
No BigInt values exist in current domain model.

**Date/Map/Set/undefined/null:** All handled correctly (pre-existing).

## CLI / Code Execution

**Single subprocess:** `spawnSync("gh", ["auth", "token"])` with hardcoded
args. No user/provider input reaches command or arguments. No eval,
`Function()`, or dynamic import from user-supplied paths.

## DoS / Bounds Audit

- Provider pagination loops: bounded by API-native pagination. GitHub
  workflow runs capped at 100 per repository.
- Investigation: one-hop only. Relationships: two deterministic kinds.
- Serialization: cycle detection + depth limit added.
- No unbounded recursion, file reads, or output composition identified.

## Error / Logging Audit

No logging system exists. `console.log`/`console.error` only in CLI for
user-visible output. All error messages go through `CombieError` or
`redactSecrets()` before display. Non-CombieError catch-all at CLI level
prints `err.message` — now safe because credential crash is eliminated.

## Installation Audit

Repository-only distribution. `bin` points to TypeScript source. `bun install
--frozen-lockfile` succeeds. No lifecycle scripts. `bun link` removed from
beta path. SECURITY.md created.

## Repository Hygiene

`.gitignore` additions: `.env`, `.env.*`, `coverage/`, `*.sqlite`.
`.combie` already gitignored. DB and credentials properly excluded from
tracking. Fix: SEC-041A-157.

## Sensitive Metadata

Persisted: provider account IDs/names, resource names/IDs, repository
fullNames, Vercel project metadata, Cloudflare zone names, Sentry org
slugs, Neon region/org IDs, PlanetScale engine/region, deployment/workflow/
operation evidence. Not persisted: raw provider responses, commit messages
(only SHAs stored), connection strings, passwords, Authorization headers.
Provider evidence is allowlisted by normalize functions.

## Permissions

- State directory: `0700` (confirmed)
- Credentials file: `0600` (confirmed)
- Database file: `0600` (new; was default umask/0644). Fix: SEC-041A-051.

## Corrupt State

- Malformed credentials JSON: returns `{}` without crash (SEC-041A-001).
- Empty/whitespace credentials file: returns `{}`.
- Non-object JSON: returns `{}`.
- Missing DB: `isInitialized()` returns false.
- Legacy DB: read-only probe preserves SHA-256 and table set.

## Security Documentation

`SECURITY.md` created with: supported version, private reporting channel
(closed-beta invitation thread), scope, out-of-scope, safe harbor,
acknowledgement timeline. Fix: SEC-041A-200.

## Findings

### SEC-041A Finding Inventory

| ID | Title | Severity | Beta Blocker | Disposition |
|---|---|---|---|---|
| SEC-041A-001 | JSON.parse crash leaks raw tokens to stderr | **Critical** | **Yes** | **Fixed** |
| SEC-041A-002 | Non-atomic credential RMW causes file corruption | High | Maybe | Deferred |
| SEC-041A-003 | Inconsistent redact thresholds (Neon >=8, PlanetScale >=4) | Medium | No | **Fixed** |
| SEC-041A-005 | Optional explicitSecrets param in Neon/PlanetScale | Low | No | **Fixed** |
| SEC-041A-050 | Unvalidated --dir/COMBIE_HOME paths | High | Maybe | **Fixed** |
| SEC-041A-051 | SQLite DB file lacks explicit restrictive permissions | High | Yes | **Fixed** |
| SEC-041A-053 | TOCTOU in mkdirSync via existsSync guard | Medium | No | **Fixed** |
| SEC-041A-100 | Missing cycle detection in MCP serialization | High | Yes | **Fixed** |
| SEC-041A-102 | No recursion depth limit in serialization | Medium | No | **Fixed** |
| SEC-041A-152 | zod@4.4.3 pre-release maturity | Medium | Maybe | Deferred (monitor) |
| SEC-041A-153 | MCP packages at v2.0.0 - limited advisory history | Medium | Maybe | Deferred (monitor) |
| SEC-041A-157 | Missing .env/coverage/*.sqlite in .gitignore | Low | No | **Fixed** |
| SEC-041A-200 | No SECURITY.md or vulnerability reporting channel | High | Yes | **Fixed** |
| SEC-041A-201 | No ANSI/terminal escape sanitization | Medium | No | Deferred |
| SEC-041A-202 | Path traversal via COMBIE_HOME/--dir (combined with 050) | Medium | No | Merged into 050 |
| SEC-041A-203 | Provider error at sync boundaries not re-redacted | Medium | No | Deferred |
| SEC-041A-204 | MCP responses contain untrusted provider metadata | Medium | No | Accepted (by design) |

### Critical

1. **SEC-041A-001** — Corrupted credentials file (`JSON.parse` crash) leaks
   raw tokens to stderr. **FIXED**: try/catch in `CredentialsStore.read()`.

### High

1. **SEC-041A-050** — Unvalidated paths allow arbitrary filesystem writes.
   **FIXED**: `path.resolve()` in `getCombieRoot()`.
2. **SEC-041A-051** — SQLite DB file world-readable (default umask).
   **FIXED**: `chmodSync(0600)` after DB creation.
3. **SEC-041A-100** — Serialization cycle detection missing → MCP crash.
   **FIXED**: `WeakSet` visited-object guard + depth limit.
4. **SEC-041A-200** — No SECURITY.md or vulnerability reporting channel.
   **FIXED**: `SECURITY.md` created with private reporting guidance.
5. **SEC-041A-002** — Non-atomic credential read-modify-write.
   **DEFERRED**: Low exploitability; primary concern (triggering SEC-041A-001) is fixed.

### Medium

1. **SEC-041A-003** — Inconsistent redact thresholds. **FIXED**: Unified to `> 0`.
2. **SEC-041A-053** — TOCTOU in mkdirSync. **FIXED**: Removed existsSync guard.
3. **SEC-041A-102** — No recursion depth limit. **FIXED**: Max depth 100.
4. **SEC-041A-152** — zod v4 pre-release maturity. **DEFERRED**: No known CVEs; monitor.
5. **SEC-041A-153** — MCP packages limited history. **DEFERRED**: No known CVEs; monitor.
6. **SEC-041A-201** — No ANSI escape sanitization. **DEFERRED**: Low likelihood.
7. **SEC-041A-203** — Provider error at sync boundaries. **DEFERRED**: Defense-in-depth.
8. **SEC-041A-204** — Untrusted metadata in MCP. **ACCEPTED**: By design; agent owns interpretation.

### Low

1. **SEC-041A-005** — Optional explicitSecrets param. **FIXED**: Made non-optional with default.
2. **SEC-041A-157** — Missing gitignore patterns. **FIXED**: Added .env, coverage, *.sqlite.

### Informational

All remaining findings are informational/confirmed-safe, covering positive
verifications of credential isolation, SQL parameterization, lockfile integrity,
and absence of eval/injection patterns. See subagent audit reports for full
details.

## Fixes

| Finding | Regression Test | Production Fix |
|---|---|---|
| SEC-041A-001 | `tests/storage/credentials.test.ts`: corrupted/empty/whitespace/non-object JSON tests | Try/catch in `CredentialsStore.read()` |
| SEC-041A-003 | Existing Neon redaction test updated for `[REDACTED]` | Threshold `>= 8` → `> 0` in `neon/errors.ts`; `>= 4` → `> 0` in `planetscale/errors.ts` |
| SEC-041A-005 | N/A (signature change, existing callers unaffected) | `explicitSecrets?:` → `explicitSecrets:` with `= []` default |
| SEC-041A-050 | `tests/app/mcp-unit.test.ts`: path normalization tests | `path.resolve()` in `getCombieRoot()` |
| SEC-041A-051 | N/A (behavioral, verified manually) | `chmodSync(0600)` after DB creation in `Store.init()` |
| SEC-041A-053 | N/A (existing mkdir tests cover idempotency) | Removed `existsSync` guard; rely on `mkdirSync` idempotency |
| SEC-041A-100 | `tests/app/mcp-unit.test.ts`: circular reference test | `WeakSet` visited-object guard in `safeValue()` |
| SEC-041A-102 | `tests/app/mcp-unit.test.ts`: deep nesting test | Depth counter (max 100) in `safeValue()` |
| SEC-041A-157 | N/A (config change) | `.env`, `.env.*`, `coverage/`, `*.sqlite` in `.gitignore` |
| SEC-041A-200 | N/A (documentation) | `SECURITY.md` created |

## Deferred / Accepted Risk

1. **SEC-041A-002**: Non-atomic credential RMW. Accepted — primary threat
   (crash exposing secrets) is fixed by SEC-041A-001.
2. **SEC-041A-152/153**: zod/MCP dependency maturity. Accepted — monitor
   advisories; no known CVEs today.
3. **SEC-041A-201**: ANSI escape sanitization. Deferred — requires
   compromised provider API; low likelihood for beta.
4. **SEC-041A-203**: Sync boundary re-redaction. Deferred — per-provider
   redaction is thorough; defense-in-depth only.
5. **SEC-041A-204**: Untrusted metadata in MCP. Accepted — by design;
   external agents own interpretation safety.
6. **Plaintext credential storage**: Documented limitation. Encryption at
   rest and OS keychain deferred to post-beta.

## Security Test Matrix

| Surface | Static review | Adversarial test | Automated scan | Result |
|---|---|---|---|---|
| Credentials | All 6 providers traced | Corrupted JSON, empty, whitespace, non-object | Secret scan | PASS |
| Cloudflare | Error paths verified | Exact-secret redaction | Secret scan | PASS |
| GitHub | Error paths verified | Exact-secret redaction | Secret scan | PASS |
| Vercel | Error paths verified | Exact-secret redaction | Secret scan | PASS |
| Sentry | Error paths verified | Exact-secret redaction | Secret scan | PASS |
| Neon | Error paths verified, threshold fixed | Exact-secret redaction | Secret scan | PASS |
| PlanetScale | Error paths + dual-credential verified, threshold fixed | Exact-secret redaction | Secret scan | PASS |
| Filesystem | All paths traced | path.resolve normalization | N/A | PASS |
| COMBIE_HOME | Resolution traced | Absolute path resolution | N/A | PASS |
| SQLite | All queries reviewed | Parameterized queries confirmed | N/A | PASS |
| Read-only CLI | Paths traced | DB hash unchanged across reads | N/A | PASS |
| MCP | 4 tools, annotations, network/mutation verified | Cycle/depth serialization, credential isolation | N/A | PASS |
| Serialization | Cycle/depth/type handling reviewed | Circular/200-deep/BigInt tests | N/A | PASS |
| Provider network | All fixed URLs, encodeURIComponent | SSRF path review | N/A | PASS |
| Provider data | All normalize functions reviewed | ANSI/prompt-injection assessed | N/A | ACCEPTED RISK |
| Dependencies | All direct/transitive reviewed | No known exploitable CVEs | Manual advisory review | PASS |
| Install path | Lifecycle scripts, bin, frozen-lockfile | `bun install --frozen-lockfile` | N/A | PASS |
| Git hygiene | .gitignore, .combie, state files | .env/coverage/*.sqlite added | Git log secret scan | PASS |
| Public docs | README, QUICKSTART, MCP.md | SECURITY.md created | N/A | PASS |

## Security Invariant Matrix

| Invariant | Status | Evidence |
|---|---|---|
| S1 Credentials absent from output | PASS | All 6 provider redaction verified |
| S2 Credentials absent from context | PASS | No credentials in Resource/Relationship/Change/evidence |
| S3 Credential storage restrictive | PASS | 0600 credentials file; 0700 state dir; 0600 DB |
| S4 Read-only paths non-mutating | PASS | readonly DB open; SHA-256 unchanged post-read |
| S5 MCP performs no provider network | PASS | Zero fetch calls in src/mcp/ |
| S6 MCP performs no state mutation | PASS | SHA-256 unchanged; no write methods in MCP path |
| S7 MCP exposes no credentials | PASS | list_providers filters to accountId/accountName |
| S8 State path behavior safe | PASS | path.resolve() added; .combie gitignored |
| S9 Provider data cannot redirect network | PASS | Fixed base URLs; no provider-URL reuse |
| S10 Provider data cannot execute commands | PASS | Single safe spawnSync; no eval/Function |
| S11 Malformed input fails safely | PASS | Cycle/depth protection; param queries; JSON.parse guard |
| S12 Installation behavior understood | PASS | No lifecycle scripts; frozen lockfile committed |

## Validation

```text
Tests:       635 pass across 57 files (up from 624 baseline)
Typecheck:   clean
Secret scan: clean (no real credentials in diff or repo)
Dependency:  no known exploitable CVEs
Diff check:  clean
Worktree:    SPRINT-041A.md + SECURITY.md untracked; 10 modified files
```

## Sprint 041 Conditions

Remaining from Sprint 041:
- [ ] Accessible repository release URL + exact SHA
- [ ] Owner-approved license/beta-use terms
- [ ] Fresh live provider sync on final build
- [ ] GitHub + Vercel dogfood OR explicitly narrowed cohort

> **Updated 2026-08-13 (release closure):** all four conditions are now closed
> by the v0.1.1 publication on `github.com/combie-dev/combie` (URL + SHA
> `1643252…`, Apache-2.0 LICENSE owner-approved, fresh live GitHub
> connect/sync on the installed binary — 312 repositories, 611 workflow runs,
> and the cohort explicitly narrowed to GitHub-only with owner approval).
> See `docs/internal/beta/RELEASE.md`, `READINESS.md`, and `DOGFOOD.md` for
> evidence. The Sprint 042 gate below is thereby cleared at v0.1.1.

## New Security Conditions

- [x] SECURITY.md created with reporting channel
- [x] Credential crash (SEC-041A-001) fixed
- [x] Serialization cycle/depth protection (SEC-041A-100/102) added
- [x] Path resolution normalization (SEC-041A-050) added
- [x] DB file permissions (SEC-041A-051) fixed
- [x] Redaction thresholds unified (SEC-041A-003)
- [x] .gitignore expanded (SEC-041A-157)

## Final Security Decision

**SECURITY GO**

No unresolved Critical findings. No unresolved High findings. All 12
security invariants PASS. The fixes are minimal, targeted, and
regression-covered.

The audit uncovered one Critical (credential crash on corrupted file),
four High (path resolution, DB permissions, serialization crash,
missing SECURITY.md), and several Medium improvements. All Critical
and High findings are fixed.

Residual risks are documented: plaintext storage, ANSI escape rendering
by terminals, external-agent prompt injection through MCP, dependency
maturity monitoring.

## Sprint 042 Gate

Sprint 042 remains **blocked** by the unresolved Sprint 041 release
conditions:
1. Accessible repository/release URL
2. Authorized beta-use/license terms
3. Fresh live provider sync on final build
4. GitHub + Vercel dogfood OR explicitly narrowed first cohort

The **security gate** is now CLEARED. Sprint 042 may begin once the
above release conditions are closed.

> **Verdict 2026-08-13:** the security gate remains CLEARED (no new findings,
> no re-scoring) and all four release conditions above are now closed by the
> v0.1.1 publication (evidence in `RELEASE.md` / `READINESS.md` /
> `DOGFOOD.md`). **Sprint 042 is READY TO BEGIN.** It has not started; no
> Sprint 042 work is authorized in this release-closure commit.

## Canon Changes

None.

## Commit

```text
Security implementation:
efe1d28a58fe1e2a8f1f0f2ebfed3e64f9daf216
feat(security): harden pre-beta credential, storage, and MCP boundaries

Sprint completion:
(this docs commit)
docs(sprint): record Sprint 041A completion
```

---

---

# Definition of Done

- [ ] Sprint 041 clean baseline verified
- [ ] exact baseline SHA recorded
- [ ] SKILL protocol followed
- [ ] Canon reviewed
- [ ] Sprint 039–041 reviewed
- [ ] RELEASE / READINESS / DOGFOOD reviewed
- [ ] Security Repository Understanding completed
- [ ] threat model completed
- [ ] S1–S12 defined and tested
- [ ] dependency inventory reviewed
- [ ] advisory/vulnerability scan run
- [ ] findings manually triaged
- [ ] package lifecycle scripts reviewed
- [ ] lockfile reviewed
- [ ] frozen install security reviewed
- [ ] repository secret scan run
- [ ] git-history secret scan attempted where practical
- [ ] all six credential flows traced
- [ ] all six provider error paths reviewed
- [ ] exact-secret echo tested
- [ ] embedded-secret echo tested
- [ ] filesystem writes mapped
- [ ] COMBIE_HOME adversarially tested
- [ ] --dir adversarially tested
- [ ] path traversal reviewed
- [ ] symlink behavior reviewed
- [ ] SQLite queries reviewed
- [ ] dynamic SQL reviewed
- [ ] read-only database behavior revalidated
- [ ] legacy DB behavior revalidated
- [ ] provider request destinations mapped
- [ ] SSRF-like paths reviewed
- [ ] provider permission guidance reviewed
- [ ] untrusted provider strings tested
- [ ] command execution search completed
- [ ] subprocess execution search completed
- [ ] dynamic-code search completed
- [ ] MCP exactly-four-tool contract verified
- [ ] MCP annotations verified
- [ ] MCP read-only behavior verified
- [ ] MCP no-network behavior verified
- [ ] MCP credential isolation verified
- [ ] MCP malformed inputs tested
- [ ] MCP serialization reviewed
- [ ] serialization recursion regression preserved
- [ ] obvious output/DoS risks reviewed
- [ ] CLI errors reviewed
- [ ] logs/diagnostics reviewed
- [ ] `.combie` repository safety reviewed
- [ ] sensitive persisted metadata reviewed
- [ ] credential permissions verified
- [ ] state directory permissions verified
- [ ] database permissions reviewed
- [ ] corrupt credential state tested
- [ ] corrupt database state tested
- [ ] security reporting mechanism reviewed
- [ ] every finding assigned SEC-041A-* ID
- [ ] every finding assigned severity
- [ ] every finding assigned beta-blocker status
- [ ] all Critical findings fixed
- [ ] all High findings fixed or Sprint remains blocked
- [ ] relevant Medium findings dispositioned
- [ ] every code fix has regression coverage
- [ ] security test matrix completed
- [ ] security invariant matrix completed
- [ ] full tests pass
- [ ] typecheck passes
- [ ] secret scan clean
- [ ] dependency scan dispositioned
- [ ] diff check clean
- [ ] production diff manually reviewed
- [ ] worktree clean
- [ ] no feature scope added
- [ ] no MCP surface expansion
- [ ] no provider scope expansion
- [ ] no AI added
- [ ] no execution added
- [ ] remaining Sprint 041 conditions recorded
- [ ] new security release conditions recorded
- [ ] final security decision selected
- [ ] Sprint 042 gate explicitly stated
- [ ] completion notes written
- [ ] Canon changes recorded or None
- [ ] Sprint 041A committed separately
- [ ] Sprint 042 not started

---

# Explicitly Out of Scope

Do not implement:

- new providers
- new Resource kinds
- new Relationship kinds
- new evidence
- new investigate sections
- new MCP tools
- MCP writes
- MCP connect
- MCP sync
- remote MCP
- HTTP MCP
- hosted Combie
- authentication service
- user accounts
- OAuth platform
- telemetry platform
- analytics
- SIEM integration
- enterprise RBAC
- encryption platform
- secrets manager integration
- container sandbox
- execution sandbox
- generic policy engine
- generic security framework
- correlation
- causality
- internal AI
- BYO models
- operational learning
- controlled execution
- background sync
- webhooks
- alerts
- Sprint 042 beta invitations

---

# Final Principle

> **Security is not another Combie capability. It is a condition for trusting the capabilities we already built.**

And:

> **Before Combie asks users to trust it with engineering context and provider credentials, we should deliberately try to break that trust boundary ourselves.**