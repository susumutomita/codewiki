# Product Hunt Submission

## Tagline (60 chars max)

Democratize AI-assisted code reading. One command.

Alternative: `Every codebase has a senior. codewiki clones them.`

## Description

**codewiki** turns every developer into a senior code reader.

### The problem

AI-assisted code reading is a skill — and it's not distributed evenly.

Senior engineers run `git log --oneline -- path/`, trace imports, check related Issues, grep for error handlers. They ask AI the right questions in the right order and get deep understanding.

Juniors ask *"what does this file do?"* and get shallow answers.

Same AI, wildly different results.

### The solution

`/codewiki` encodes senior-level investigation — ctags, grep, git log, gh issue view, dependency graphs — into a Claude Code skill. Whoever runs it gets the analysis a senior engineer would produce after hours of digging.

Every question you would have asked AI one-by-one, answered upfront:

- *"What's this directory?"* → directory map
- *"How does this function work?"* → explanation with code quotes
- *"Why is it written this way?"* → design rationale from git log, Issues, PRs
- *"How does data flow?"* → Mermaid flowchart
- *"What's the DB schema?"* → ER diagram
- *"Who depends on this module?"* → dependency graph
- *"How do I set it up?"* → setup guide from actual scripts
- *"Where do I look when it breaks?"* → error flow map

All in one command. Generated in your language. 100% local.

### What makes it different

1. **Democratization, not generation** — Other tools generate docs. codewiki encodes investigation skills.
2. **Anti-hallucination by design** — Uses real tools (ctags, grep, git log) for facts. AI only interprets. Every claim is traceable to a file:line or commit hash.
3. **Full rebuild, not incremental** — AI can't reliably diff-update docs. We regenerate from scratch. Zero stale content.
4. **100% local** — Runs on localhost. Your code never leaves your machine.
5. **Three modes**:
   - `/codewiki` — onboarding (architecture, flowcharts, ER diagrams)
   - `/codewiki --deep` — enhancement (implementation details, test coverage)
   - `/codewiki --debug` — incident (error flows, log locations, fail modes)

### How it works

```
npx skills add susumutomita/codewiki    # one-time install
/codewiki                                # in any project
```

Claude Code runs `git log`, `grep`, `ctags`, `gh issue view`, reads key files, and generates an interactive HTML wiki with live chat, right-click-to-ask, split-pane source viewer. Opens in your browser on localhost:8080.

---

## First Comment (post this after launch)

Hey PH! 👋

I built codewiki because I kept watching the same pattern: seniors get incredible insight from AI because they know what to ask. Juniors get surface-level answers to surface-level questions.

The gap isn't AI capability. The gap is **knowing the investigation technique.**

So I encoded senior-level code reading — `git log --oneline -- path/`, `grep error handling`, `gh issue view`, `ctags`, dependency graphs — into a single Claude Code skill. Type `/codewiki`, get the analysis a senior would produce after hours of digging.

**Key design decisions:**

- **Tools for facts, AI for interpretation.** Dependency graphs come from `madge`/`grep`. Commit history from `git log`. Design intent from actual PR discussions. AI only synthesizes what the tools found — cuts hallucination drastically.
- **Full rebuild every run.** AI is terrible at diff-updating docs. Regenerate from scratch. Docs are always current.
- **Right-click in the wiki to ask Claude.** The same AI that read your repo writes the wiki AND answers your follow-ups. Zero context-switching.

Try it:

```
npx skills add susumutomita/codewiki
```

Curious what you think. The thesis I'm testing: **AI leverage is actually a skill, and encoding that skill as reusable tooling is the 10x move.**

---

## Topics/Tags

- Developer Tools
- Artificial Intelligence
- Open Source
- Documentation
- Productivity

## Thumbnail text

Democratize AI-assisted code reading.

## Keywords

- Claude Code skill
- Code documentation
- Senior engineer investigation techniques
- git log, grep, ctags automation
- Anti-hallucination with static analysis
- Full rebuild (no stale docs)
- Right-click to ask
- 100% local
