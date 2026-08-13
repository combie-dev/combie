# HERDR → COMBIE ADOPTION NOTES

## Purpose

This document captures the Herdr patterns we want to adapt into Combie before or shortly after launch.

The goal is not to expand Combie into an agent runtime. The goal is to make Combie dramatically easier for users to connect to the AI agents they already use.

Combie should feel agent-native from day one.

> **Install Combie once, connect your engineering stack once, and make that context available to every agent you already use.**

---

## 1. Combie Agent Skill

Combie should ship a reusable agent skill at:

```text
skills/combie/SKILL.md
```

The skill teaches supported coding agents how to use Combie correctly.

It should cover:

- how to detect when Combie is available
- how to query engineering resources
- how to inspect relationships
- how to retrieve timelines
- how to access operational memory
- how to request investigations
- how to retrieve evidence
- how to interpret Combie resource identifiers
- when to use deterministic Combie context instead of guessing

Example capabilities:

```bash
combie resources
combie related production-api
combie timeline production-api
combie memory production-api
combie investigate production-api
combie ask "what changed?"
```

The skill should be installable globally or per-project.

Potential install experience:

```bash
npx skills add <combie-repo> --skill combie -g
```

The skill should remain lightweight and primarily consist of agent instructions rather than implementation logic.

### Launch recommendation

**Include before launch if possible.**

This is one of the lowest-effort, highest-value additions because it immediately makes Combie easier to use with existing agents.

---

## 2. Agent Guide

Combie should also expose a separate guide for AI agents helping a user install, configure, or troubleshoot Combie.

Suggested location:

```text
combie.dev/agent-guide.md
```

This serves a different purpose from `SKILL.md`.

```text
SKILL.md
→ teaches an agent how to USE Combie

agent-guide.md
→ teaches an agent how to HELP A HUMAN use Combie
```

The guide should cover:

- installing Combie
- initializing Combie
- connecting providers
- configuring credentials
- connecting Combie to agents
- validating the installation
- common troubleshooting
- safe credential handling

### Launch recommendation

**Include before launch.**

This is inexpensive and gives users an easy way to say:

> “Claude, help me set up Combie.”

---

## 3. Local Agent Detection

Combie should detect commonly installed AI coding agents on the user's machine.

Initial targets:

```text
Claude Code
Codex
Cursor Agent
Pi
OpenCode
Kimi Code
Grok CLI
GitHub Copilot CLI
```

The first implementation does not need deep agent-state detection.

Combie only needs to identify:

```text
installed
not installed
integration available
integration configured
```

Example onboarding:

```text
Detected AI agents:

✓ Claude Code
✓ Codex
✓ Pi
✓ OpenCode

Configure Combie for:

[x] Claude Code
[x] Codex
[x] Pi
[x] OpenCode
```

Detection should inspect known executable locations, `PATH`, and documented configuration locations.

It should not silently retrieve model API keys.

### Launch recommendation

**Include a lightweight version before launch if implementation is small.**

Agent detection by itself should remain simple.

Do not block launch on supporting every agent.

A reasonable launch target would be:

```text
Claude Code
Codex
Cursor
Pi
OpenCode
```

Additional agents can be added incrementally.

---

## 4. Guided Agent Integration

Combie should provide one command for configuring supported agents.

Example:

```bash
combie agent add claude
combie agent add codex
combie agent add cursor
combie agent add pi
combie agent add opencode
```

Or:

```bash
combie agent setup
```

which launches an interactive flow.

Example:

```text
Combie found 4 supported agents.

Configure Combie for:

[x] Claude Code
[x] Codex
[x] Pi
[ ] OpenCode

Installing Combie context integration...

✓ Claude Code
✓ Codex
✓ Pi

Done.
```

The integration should use the smallest native mechanism available for that agent:

```text
MCP configuration
skills
hooks
plugins
extensions
custom instructions
```

Users should not need to manually copy configuration snippets when Combie can safely configure them.

### Launch recommendation

**Worth squeezing into launch if limited to 2–4 agents.**

Do not attempt full agent coverage before launch.

Start with the agents most likely to be used by Combie's audience.

Recommended initial order:

```text
1. Claude Code
2. Codex
3. Cursor
4. Pi
5. OpenCode
```

### Delivery status (Sprint 041B)

Delivered for Claude Code, Codex, and Cursor only:

```text
combie agent status             detection + integration status table
combie agent setup [agent...]   TTY-only [Y/n] confirm; --yes; non-TTY proceeds
combie agent remove <agent...>  removes only the Combie MCP entry
```

MCP configuration is written to `~/.claude.json`, `~/.codex/config.toml`, and
`~/.cursor/mcp.json`; an existing correct entry is left untouched, a stale
entry is updated in place, and unrelated configuration is preserved. Pi,
OpenCode, and other agents remain future planning items (deferred).

---

## 5. Pi Integration

Combie should provide a native Pi extension.

The purpose is not to manage Pi's runtime.

The extension gives Pi direct access to Combie context.

Conceptually:

```text
Pi
 ↓
Combie Extension
 ↓
Combie Local API
 ↓
Engineering Graph
Operational Memory
Provider Context
Investigations
```

The integration can make it easy for Pi to retrieve:

- current repository context
- resources related to the current repository
- deployments
- infrastructure relationships
- recent changes
- relevant incidents
- previous investigations
- operational memory

Example:

```text
User:
Why did production break?

Pi:
→ asks Combie for current repository
→ finds related Vercel deployment
→ finds Sentry issue
→ retrieves deployment timeline
→ uses Combie context during reasoning
```

### Launch recommendation

**Good launch candidate if the extension is thin.**

If it requires significant Pi-specific implementation or testing, ship it immediately after launch.

---

## 6. Claude Code Integration

Combie should support Claude Code through the most native lightweight mechanism available.

Potential pieces:

```text
Combie SKILL.md
MCP configuration
optional hooks
project instructions
```

The priority is making Combie context immediately available to Claude rather than tracking Claude lifecycle state.

The ideal experience:

```bash
combie agent add claude
```

Then inside Claude:

```text
> What changed before the production outage?
```

Claude can query Combie rather than independently wiring GitHub, Vercel, Cloudflare, and Sentry.

### Launch recommendation

**High priority for launch.**

---

## 7. Codex Integration

Codex should receive the same first-class treatment.

Potential integration surfaces:

```text
Combie skill/instructions
MCP
Codex-supported hooks/configuration
```

Desired experience:

```bash
combie agent add codex
```

Then Codex can access:

```text
Combie resources
Combie graph
Combie timelines
Combie memory
Combie investigations
```

### Launch recommendation

**High priority for launch.**

---

## 8. Cursor Integration

Cursor is another high-value initial agent.

The integration can initially be as simple as automatically adding Combie as an MCP server where supported.

Example:

```bash
combie agent add cursor
```

Result:

```text
✓ Cursor detected
✓ Combie MCP configured
```

Cursor continues using its existing model configuration.

Combie only provides context.

### Launch recommendation

**High priority if configuration is straightforward.**

---

## 9. OpenCode Integration

OpenCode supports a plugin-oriented ecosystem, which makes it a natural Combie integration target.

A thin plugin could make Combie context directly available from OpenCode without requiring manual MCP setup.

Potential capabilities:

```text
current repository context
related infrastructure
recent deployments
incident history
investigation retrieval
```

### Launch recommendation

**Post-launch or launch stretch goal.**

Claude, Codex, Cursor, and Pi should take priority.

---

## 10. Agent Integration Capability Model

Combie should model agent integrations explicitly.

Example:

```text
AgentIntegration
│
├── Skill
├── MCP
├── Hook
├── Plugin
├── Extension
└── Custom Instructions
```

An agent may support multiple integration types.

Example:

```yaml
agent: claude-code

capabilities:
  skill: true
  mcp: true
  hooks: true
  plugin: false
```

Another:

```yaml
agent: pi

capabilities:
  skill: true
  mcp: optional
  extension: true
```

This prevents Combie from assuming every AI agent integrates in the same way.

---

## 11. Generic Agent Integration Contract

Combie should support agents beyond the ones officially recognized.

A generic integration contract can expose Combie locally through stable environment variables and APIs.

Potential environment:

```text
COMBIE_ENV=1
COMBIE_PROJECT_ID=<id>
COMBIE_SOCKET_PATH=<path>
COMBIE_BIN_PATH=<path>
```

Potential commands:

```bash
combie context current
combie context resource <id>
combie resources
combie related <id>
combie timeline <id>
combie memory <id>
```

An agent developer can then integrate with Combie without waiting for first-party support.

### Launch recommendation

**Design the contract now; implementation can remain minimal.**

This is valuable because it prevents the first-party agent list from becoming an architectural limitation.

---

## 12. Integration Status

Combie should expose the state of its agent integrations.

Example:

```bash
combie agents
```

Output:

```text
Agent          Detected    Integration
Claude Code    yes         configured
Codex          yes         configured
Cursor         yes         available
Pi             no          —
OpenCode       yes         available
```

Potential commands:

```bash
combie agent list
combie agent add <agent>
combie agent remove <agent>
combie agent status
```

This keeps local integration management understandable.

---

# Recommended Pre-Launch Scope

These ideas are valuable, but they should remain a **thin interoperability layer** around the Combie product that already exists.

The pre-launch implementation should focus on the highest-value additions:

```text
P0 — Combie SKILL.md
P0 — Combie agent-guide.md

P1 — lightweight agent detection

P1 — guided integration:
     Claude Code
     Codex
     Cursor

P1 — Combie MCP setup

P2 — Pi native extension

P2 — generic AgentIntegration capability model

P3 — OpenCode and additional agents
```

The target launch experience should be:

```bash
$ combie init

Detected:
✓ Claude Code
✓ Codex
✓ Cursor

Configure Combie for detected agents? [Y/n]

✓ Claude Code configured
✓ Codex configured
✓ Cursor configured

Your agents can now access Combie context.
```

That is enough to substantially improve onboarding without creating another major product surface.

---

# Definition of Done for Launch

The agent-native launch work is complete when a user can:

1. install Combie,
2. connect their engineering providers,
3. run one setup command,
4. have Combie detect at least the major supported agents,
5. configure Combie for those agents,
6. open the agent they already use,
7. ask an engineering question,
8. have that agent retrieve Combie context without manually configuring every engineering provider.

The resulting architecture should look like:

```text
GitHub ────────┐
Cloudflare ────┤
Vercel ────────┤
Sentry ────────┤
               ↓
             Combie
               ↓
      Engineering Context
               ↓
     ┌─────────┼─────────┐
     ↓         ↓         ↓
   Claude    Codex     Cursor
     ↓         ↓         ↓
              Pi
```

This strengthens Combie's core promise:

> **Connect your engineering stack once. Let every agent understand it.**