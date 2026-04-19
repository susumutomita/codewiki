<p align="center">
  <br>
  <strong style="font-size:48px">codewiki</strong>
  <br>
  <em>DeepWiki, but you can talk to it.</em>
  <br><br>
  <a href="https://github.com/susumutomita/codewiki/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License"></a>
  <a href="https://github.com/susumutomita/codewiki"><img src="https://img.shields.io/github/stars/susumutomita/codewiki?style=social" alt="Stars"></a>
</p>

<p align="center">
  Any codebase &rarr; interactive wiki with live AI chat.<br>
  Right-click any code to ask Claude. Full rebuild every run, zero stale docs.
</p>

<p align="center">
  <a href="https://susumutomita.github.io/codewiki">Website</a> &middot;
  <a href="#install">Install</a> &middot;
  <a href="#how-it-works">How it works</a> &middot;
  <a href="#vs-deepwiki">vs DeepWiki</a>
</p>

---

## Install

```bash
npx skills add susumutomita/codewiki
```

Then in any project, open Claude Code and type:

```
/codewiki
```

That's it.

## What happens

1. **Scans** your project — detects structure, tech stack, key files
2. **Analyzes** every major component — Claude Code reads and understands your actual source code
3. **Generates** a self-contained HTML wiki at `.codewiki/index.html`
4. **Serves** it locally with interactive AI features

### Interactive Features

| Feature | How |
| --- | --- |
| **Chat** | Click the purple button (bottom-right) and ask anything |
| **Right-click** | Select any text, right-click, choose "Ask Claude Code" |
| **Ask button** | Click "Ask" on suggested prompts for instant deep-dive |
| **File Reader** | Browse source code in-browser, select and right-click to ask |

## How it works

```
You type: /codewiki

Claude Code:
  ├── Scans project structure (Glob)
  ├── Reads key files deeply (Read)
  ├── Analyzes each component (native AI)
  ├── Generates .codewiki/index.html (Write)
  └── Starts local server + opens browser (Bash)

You get:
  ├── Complete architecture documentation
  ├── Per-component deep analysis
  ├── Live chat widget → Claude Code
  ├── Right-click → Ask on any text
  └── Built-in source code browser
```

The key difference from other doc generators: **Claude Code itself is doing the analysis**. Not a subprocess, not an API call — the same AI that understands your codebase generates the documentation and answers your follow-up questions.

## Re-generate

Run `/codewiki` again. It rebuilds **everything from scratch**.

No incremental diffs. No stale sections. No ghost references to renamed files. The wiki always matches the current state of your code.

> *"AI is not good at incremental doc updates — sections get stale, renames leave ghost references, and context drifts. Full rebuild eliminates all of that."*

## vs DeepWiki

| | DeepWiki | codewiki |
| --- | --- | --- |
| AI-generated docs | Yes | Yes |
| Live AI chat | No | **Yes** |
| Right-click → ask | No | **Yes** |
| File browser | No | **Yes** |
| Update strategy | Unknown | **Full rebuild** |
| Integration | Standalone web app | **Claude Code skill** |
| Runs locally | No | **Yes** |
| Your code stays local | No (cloud) | **Yes** |

## Works with any stack

Tested on:

- **TypeScript / Node.js** — Next.js, Angular, Express
- **Python** — Django, Flask, Lambda
- **Go** — gin, standard library projects
- **Rust** — axum, tokio ecosystem
- **AWS CDK / Terraform** — infrastructure as code
- **Monorepos** — multi-package projects

## Requirements

- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) CLI
- Python 3.8+ (for the local wiki server)

## Output

Generated docs go to `.codewiki/index.html`. Add `.codewiki/` to your `.gitignore`.

## License

MIT
