# Security Model

codewiki is designed to run **locally** on a developer's machine against code they have already trusted enough to clone and open in Claude Code. It is **not** a hosted service and should not be exposed to the network.

## Threat model

codewiki assumes:

- The user has already trusted the repository they are running it on (they've cloned it and opened Claude Code in it).
- Claude Code is already granted access to read/write files in the working directory.
- The local machine is not shared with untrusted users.

codewiki does **not** assume:

- Untrusted input from network peers.
- Untrusted repositories (don't run codewiki on code you haven't vetted).
- Use as a hosted multi-tenant service.

## Hardening measures

The local wiki server (`python3 -c "..."` started at the end of `/codewiki`) applies the following:

| Control | Detail |
| --- | --- |
| Loopback bind | Binds `127.0.0.1:8080` only. Never reachable from other machines on the network. |
| Origin header check | Rejects cross-origin POSTs from other websites. Same-origin and direct navigation are allowed. |
| Path traversal prevention | File-read API resolves paths and requires the result to stay under the project root. |
| File type allowlist | Only source-code-like extensions are readable through `/api/file`. |
| Size limits | 64KB max for `/api/ask` body, 1MB max for file reads. |
| Process isolation | `claude -p` is invoked via argv list (no shell), never via `shell=True`. |
| Timeout | `claude -p` times out at 120s. |
| `X-Content-Type-Options: nosniff` | Returned on all JSON responses. |

## What codewiki does NOT protect against

- **A malicious repository.** If you run `/codewiki` in a repo whose build scripts or `CLAUDE.md` instruct Claude Code to do harmful things, Claude Code will still follow those instructions. Treat codewiki the same as any other Claude Code skill: only run it in repos you trust.
- **Supply-chain attacks in analyzer tools.** codewiki only invokes analyzers that the user has already installed (`madge`, `radon`, `gocyclo`, etc. — checked via `command -v`). It never runs `npx --yes` or similar auto-install commands. If you install a compromised analyzer manually, that's outside codewiki's control.
- **Exposing localhost:8080.** If you deliberately forward port 8080 to the internet, all the above protections do not help. Don't do that.

## Reporting

Found a security issue? Open a GitHub issue at <https://github.com/susumutomita/codewiki/issues> or DM on the repo author's profile. Please do **not** disclose publicly before we have a chance to respond.
