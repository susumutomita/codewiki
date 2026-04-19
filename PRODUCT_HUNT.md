# Product Hunt Submission

## Tagline (60 chars max)
DeepWiki, but you can talk to it.

## Description

**codewiki** turns any codebase into an interactive documentation wiki — with live AI chat built in.

### The problem
Code documentation goes stale the moment you write it. DeepWiki generates docs from code, but you can't ask follow-up questions. You're stuck reading static pages when what you really want is to *understand*.

### The solution
Type `/codewiki` in Claude Code. It reads your entire codebase, generates a rich documentation site, and lets you **talk to it**:

- **Right-click any text** → "Ask Claude Code" — get instant answers
- **Chat widget** — ask anything about the codebase from the browser
- **File reader** — browse source code and ask questions inline
- **Full rebuild every run** — no stale docs, ever

### What makes it different

1. **AI-native integration** — not a bolt-on chatbot, it's Claude Code itself powering the wiki
2. **Full rebuild, not incremental** — AI is bad at diff-updating docs. We regenerate from scratch every time. Zero drift.
3. **100% local** — your code never leaves your machine
4. **Works on any stack** — TypeScript, Python, Go, Rust, Java, CDK, Terraform...

### How it works
1. `npx skills add susumutomita/codewiki` (one-time install)
2. Open any project in Claude Code
3. Type `/codewiki`
4. Browse the generated wiki at localhost:8080

Built as a Claude Code skill — it runs inside your existing AI coding workflow, not as a separate tool.

---

## First Comment (post this after launch)

Hey PH! 👋

I built codewiki because I was frustrated with code documentation that goes stale.

**The backstory:** I was using Claude Code to understand a complex AWS SaaS reference architecture. I asked it to explain the codebase, and the analysis was incredible — but it disappeared when I closed the terminal. So I thought: what if Claude Code could generate a *persistent, browsable* documentation site that you can still talk to?

**Why "full rebuild"?** After months of using AI for docs, I learned one thing: AI is terrible at incremental updates. It fixes section A but forgets to update section B. Renamed files leave ghost references. The solution is dead simple — regenerate everything from scratch. Yes, it costs more tokens. But the docs are always correct.

**Why a Claude Code skill?** Because the AI that *generates* the docs is the same AI that *answers your questions*. No API middleman, no separate chatbot. Select text, right-click, ask. It just works.

Try it:
```
npx skills add susumutomita/codewiki
```

Would love your feedback! 🙏

---

## Topics/Tags
- Developer Tools
- Artificial Intelligence
- Open Source
- Documentation
- Productivity

## Thumbnail text
Any codebase → AI wiki you can talk to

## Maker comment keywords
- Claude Code skill
- DeepWiki alternative
- Code documentation
- AI-powered
- Full rebuild
- Right-click to ask
- 100% local
