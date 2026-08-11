# Security

## Supported version

The closed-beta release identified in the invitation you received. Combie is
not published to a package registry and there is no auto-update mechanism.

## Reporting a vulnerability

If you believe you have discovered a security vulnerability in Combie, please
do not open a public issue. Instead, report it privately through the same
channel used for your closed-beta invitation (invitation thread or direct
message to the maintainer).

Please include:

- Combie version (`bun run combie --version` and `git rev-parse HEAD`)
- OS / architecture
- Bun version (`bun --version`)
- A clear description of the vulnerability and steps to reproduce
- Any relevant output or error messages

**Never include API tokens, credentials, connection strings, or unredacted
state files.** If your report may contain a credential, rotate it before
sharing.

## Scope

Combie is a local-first CLI tool. The security model assumes the user's
machine and filesystem are trusted. Combie does not implement encryption at
rest, OS keychain integration, or network authentication for its MCP server
(MCP is local stdio only).

The scope of this policy covers:

- Provider credential handling and storage
- Accidental credential exposure through CLI output, errors, or MCP
- SQLite state integrity and access control
- Filesystem path safety
- MCP server boundaries (read-only, credential isolation)
- Dependency supply chain

## Out of scope

- Local privilege escalation from a process that already has user-level access
- Side-channel attacks requiring local filesystem access
- MCP client prompt injection (external agents own interpretation safety)
- Denial of service from excessive local resource consumption within normal
  operating bounds

## Safe harbor

Good-faith security research conducted in accordance with this policy will be
considered authorized. We will not pursue legal action against researchers who
follow these guidelines and make a reasonable effort to avoid harm to users.

## Acknowledgements

We aim to acknowledge vulnerability reports within 5 business days and provide
an initial assessment within 10 business days. This timeline applies during
the closed-beta period.
