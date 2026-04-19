---
name: codewiki
description: Generate a DeepWiki-style interactive code documentation site for the current project. Scans the entire codebase, analyzes every major component, and generates a self-contained HTML wiki with live Claude Code chat integration (right-click → ask, chat widget, file reader). Every run is a full rebuild — no stale docs. Supports modes - /codewiki (onboarding), /codewiki --deep (enhancement), /codewiki --debug (incident).
---

## Mission

ソースコードリーディングで人がAIに毎回聞くことを、全部まとめて一発で出す。

```
「このディレクトリ何？」         → 構成表
「この関数どう動く？」           → コード引用付き解説
「なんでこう書いてある？」       → git履歴・Issue・PRから設計根拠
「データどう流れる？」           → フローチャート
「DB構造は？」                  → ER図
「誰がこのモジュール使ってる？」 → 依存グラフ
「セットアップどうする？」       → 手順
「壊れたらどこ見る？」          → エラーフロー
```

これを `/codewiki` 一発で生成する。生成後もwiki上で右クリックして追加質問できる。

あなたはこのwikiを生成するエージェントである。「それっぽいドキュメント」を作るのではなく、**人が毎回AIに聞く質問に先回りして全部答えた状態**を作ることがゴール。

## Modes

Check the user's input for mode flags. The mode changes what content to emphasize:

### Default (no flag) — Onboarding mode
Focus: **新しくプロジェクトに入った人が全体を理解すること**
- プロジェクトの目的・背景を丁寧に
- **ディレクトリ構成**: 全ディレクトリの役割を表で一覧化。「ここに何がある」が即わかること
- **アーキテクチャ図** (Mermaid): システム全体の構成。コンポーネント間の矢印で関係を示す
- **主要機能のフローチャート** (Mermaid flowchart): 「ユーザーがこれをすると何が起きるか」を主要な操作3つ以上で図示
- **ER図** (Mermaid erDiagram): データベースやデータモデルの構造。テーブル/コレクション/型の関係
- **クラス図 / モジュール関係図** (Mermaid classDiagram): 主要なクラスやモジュールの依存関係
- 「なぜこう作られているか」の設計判断
- セットアップ手順を詳細に
- 用語集 (プロジェクト固有の用語があれば)

### `--deep` flag — Enhancement mode
Focus: **機能追加・改修する人が実装詳細を把握すること**
- 各モジュールの内部実装を深掘り
- 関数・クラスのシグネチャとロジックを詳細に解説
- データモデル・スキーマを網羅
- API リファレンスを完全に
- モジュール間の依存関係・呼び出しフローを詳細に
- テスト構成とカバレッジ
- 拡張ポイント・プラグイン機構があれば解説

### `--debug` flag — Incident / Debug mode
Focus: **障害対応・デバッグする人が問題箇所を特定すること**
- エラーハンドリングのフロー (どこで catch して何が起きるか)
- ログ出力箇所の一覧 (ファイル:行番号, ログレベル, 出力内容)
- リトライ・タイムアウト・サーキットブレーカーの設定
- 外部依存 (DB, API, キュー) の接続設定と障害時の挙動
- 環境変数・設定値が実行時にどう影響するか
- ヘルスチェック・監視ポイント
- 「ここが壊れたらこうなる」のフェイルモード分析
- デバッグに使えるコマンド・エンドポイント

## Process

Follow these steps exactly:

### Step 1: Scan the project

Use Glob and Read tools to understand the project:

1. List the top-level directory structure
2. Identify the tech stack (package.json, requirements.txt, go.mod, cdk.json, Dockerfile, etc.)
3. Find all major directories containing source code
4. Read README, CLAUDE.md, and key config files

Collect this information before proceeding.

### Step 1.5: Static analysis (推論ではなくツールで取る)

依存関係・構造の分析はAIの推論ではなく、**実際のツールやコマンドで取得する**。Bash ツールで以下を実行し、結果をそのまま使う:

```bash
# ── JavaScript / TypeScript ──
# import/require の依存グラフ
npx madge --json src/ 2>/dev/null || grep -r "from ['\"]" --include="*.ts" --include="*.tsx" --include="*.js" -h | sed "s/.*from ['\"]//;s/['\"].*//" | sort -u

# ── Python ──
# import の依存グラフ
grep -r "^import \|^from " --include="*.py" -h | sort -u
# pip の依存ツリー
pip list --format=json 2>/dev/null || cat requirements.txt 2>/dev/null || cat pyproject.toml 2>/dev/null

# ── Go ──
go mod graph 2>/dev/null

# ── Rust ──
cargo tree --depth 2 2>/dev/null

# ── 共通: ディレクトリ構造 ──
find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/__pycache__/*' -not -path '*/venv/*' | head -300

# ── 共通: git の活発なファイル (最近変更が多い = 重要) ──
git log --since="3 months ago" --name-only --pretty=format: | sort | uniq -c | sort -rn | head -30 2>/dev/null

# ── 共通: コード行数 ──
find . -type f \( -name "*.ts" -o -name "*.py" -o -name "*.go" -o -name "*.rs" -o -name "*.java" \) -not -path '*/node_modules/*' -not -path '*/.git/*' | xargs wc -l 2>/dev/null | sort -rn | head -20
```

**これらの結果を元に**図や説明を書く。ツールが使えない環境でも `grep` ベースのフォールバックで import 関係は取れる。AIの推論で依存矢印を引くのは最終手段。

#### 設計思想の抽出 (git / GitHub)

コードの「なぜ」はコードの中ではなく、**コミット履歴・Issue・PR** にある。以下で抽出する:

```bash
# ── コミット履歴: 設計判断が記録されている ──
# 直近100コミットのメッセージ (設計変更の経緯がわかる)
git log --oneline -100 2>/dev/null

# 大きな変更があったコミット (リファクタ・設計変更の特定)
git log --shortstat -30 --pretty=format:"%h %s" 2>/dev/null

# 特定ファイルの変更履歴 (なぜこのファイルが今の形になったか)
# → 重要ファイルごとに実行する
# git log --oneline -10 -- path/to/important/file.ts

# ── GitHub Issues: 要件・バグ・議論 ──
gh issue list --state all --limit 50 --json number,title,labels,state 2>/dev/null

# 重要そうなIssueの本文を読む (design, architecture, breaking ラベル等)
# → タイトルから重要なものを選んで:
# gh issue view NUMBER --json title,body,comments

# ── GitHub PRs: 実装判断・レビューコメント ──
gh pr list --state merged --limit 30 --json number,title,labels 2>/dev/null

# 重要なPRの説明とレビューを読む
# → タイトルから重要なものを選んで:
# gh pr view NUMBER --json title,body,reviews,comments
```

これらの結果を使って、wiki に **§ Design History (設計経緯)** セクションを追加する:
- プロジェクトの主要な設計判断とその背景 (Issue/PRから)
- 大きなリファクタリングの経緯 (コミット履歴から)
- 既知の技術的負債や今後の方針 (open Issueから)
- 「なぜこうなっているか」をコミットメッセージやPR説明から引用

**AIの推測ではなく、開発者自身の言葉を引用する。** "コミット abc123 で「パフォーマンス改善のためキャッシュ層を追加」とある" のように、ソースを明示する。

#### コードロジックの事実抽出

ロジックの「意図」はAIの仕事だが、**事実部分はツールで取れる**。以下を実行してからAIが解釈する:

```bash
# ── 関数シグネチャ一覧 (ctags が使えれば) ──
ctags -R --fields=+S --output-format=json -f - . 2>/dev/null | head -200 || \
  grep -rn "^def \|^class \|^async def \|^export function\|^export const\|^func \|^pub fn\|^pub async fn" \
    --include="*.py" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.go" --include="*.rs" \
    . | grep -v node_modules | grep -v __pycache__ | head -100

# ── エラーハンドリング箇所 ──
grep -rn "catch\|except\|rescue\|recover\|\.catch(\|on_error\|handle_error" \
  --include="*.py" --include="*.ts" --include="*.js" --include="*.go" --include="*.rs" \
  . | grep -v node_modules | head -50

# ── ログ出力箇所 ──
grep -rn "console\.\|logger\.\|log\.\|logging\.\|slog\.\|tracing::" \
  --include="*.py" --include="*.ts" --include="*.js" --include="*.go" --include="*.rs" \
  . | grep -v node_modules | head -50

# ── 環境変数の使用箇所 ──
grep -rn "process\.env\|os\.environ\|os\.Getenv\|env::var\|ENV\[" \
  --include="*.py" --include="*.ts" --include="*.js" --include="*.go" --include="*.rs" \
  . | grep -v node_modules | head -50

# ── TypeScript: 型定義の抽出 ──
grep -rn "^export \(interface\|type\|enum\)" --include="*.ts" --include="*.tsx" . | grep -v node_modules | head -50

# ── Python: クラスとデコレータ ──
grep -rn "^class \|^@" --include="*.py" . | grep -v __pycache__ | head -50
```

#### ハルシネーション防止ルール

AIがコードロジックを説明するとき、以下のルールを**厳守**する:

1. **引用必須**: ロジックの説明には必ず該当コードを `<pre>` で引用し、`ファイル名:行番号` を付ける。引用なしの説明は禁止
2. **Read してから書く**: 説明対象のファイルを必ず Read ツールで開いてから書く。ファイル名やgrep結果だけ見て中身を推測して書くな
3. **分離**: 事実 (コードがこう書かれている) と解釈 (おそらくこういう意図) を明確に分ける。解釈には「設計意図:」というラベルを付ける
4. **不明は不明と書く**: コードの意図が読み取れない場合「このロジックの意図は明確ではない。コードは以下の通り:」と書いて原文を示す。推測で穴を埋めない
5. **検証可能性**: 読者がクリックして該当コードを確認できるよう、ファイルパスは `<span class="file-link" data-path="...">` でリンクにする

### Step 2: Analyze — DeepWiki-style structured output

Generate the wiki content in **Japanese**. Follow this exact section structure. Each section must be thorough — read actual source files, quote specific code, and explain the *why* not just the *what*.

#### § 01 — Overview (プロジェクト概要)
- プロジェクトの目的・背景 (2-3段落)
- 技術スタックの一覧 (言語、フレームワーク、インフラ)
- **システムアーキテクチャ図**: Mermaid記法で全体構成図を生成し `<pre class="mermaid">` で埋め込む。主要コンポーネントとその接続を示す
- リポジトリのディレクトリ構成と各ディレクトリの役割一覧表

#### § 02 — Architecture (アーキテクチャ詳細)
- **データフロー図**: Mermaid記法でリクエスト/データの流れを図示
- レイヤー構成 (プレゼンテーション / ビジネスロジック / データアクセス等)
- コンポーネント間の依存関係
- 使われているデザインパターン (Factory, Strategy, Observer等) を具体的なコード引用付きで

#### § 03〜§ N — Component Deep Dives (コンポーネント詳細)
主要ディレクトリ/モジュールごとに1セクション作成。各セクションに含めること:
- **目的**: このモジュールが何を担当しているか (1-2文)
- **主要ファイル一覧**: ファイル名と1行説明の表
- **重要な関数・クラス**: シグネチャとコード引用付きで解説。`<pre>` でコードブロックを表示
- **データモデル**: 扱うデータ構造やスキーマ。あればMermaid ER図
- **他モジュールとの関係**: どこから呼ばれ、何に依存しているか
- **設計根拠 (per-module)**: 以下のコマンドで取得した情報を元に、このモジュールがなぜこう設計されたかを書く:

```bash
# このモジュール/ディレクトリの変更履歴
git log --oneline -20 -- path/to/module/

# このモジュールに関連するIssue (ディレクトリ名やモジュール名で検索)
gh search issues "module_name" --repo owner/repo --limit 10 --json number,title 2>/dev/null

# このモジュールに関連するPR
gh search prs "module_name" --repo owner/repo --limit 10 --json number,title --state merged 2>/dev/null

# 主要ファイル個別の履歴 (git blame で最も変更されたセクション)
git log --oneline -10 -- path/to/module/key_file.ts
```

各ファイルの説明にも設計根拠を添える。「コミット `abc123` で追加。PRの説明: "認証フローをリファクタリングして..." 」のように、開発者の言葉を引用する。意図が履歴から読み取れない場合はコードの構造から推測し、推測であることを明記する。

#### § (N+1) — Design History (設計経緯) ※git/GitHub が使える場合
コミット履歴・Issue・PRから抽出した設計判断の経緯。AIの推測ではなく開発者の言葉を引用:
- 主要な設計判断のタイムライン (いつ、誰が、なぜ)
- 大きなリファクタリングや方針転換の背景 (PRの説明やIssueの議論から引用)
- 既知の技術的負債 (open Issue から)
- 今後の方針・ロードマップ (Issue/PR のラベルやマイルストーンから)
- 各引用には `コミット hash` `Issue #番号` `PR #番号` を明記してリンクする

#### § (N+2) — API Reference (APIリファレンス) ※APIがある場合
- エンドポイント一覧表 (メソッド / パス / 説明 / 認証)
- リクエスト/レスポンスのスキーマ
- 認証・認可の仕組み

#### § (N+3) — Configuration & Environment (設定)
- 環境変数一覧表 (変数名 / 説明 / デフォルト値)
- 設定ファイルの構造と各項目の説明
- デプロイ構成 (CI/CD, Dockerfile等)

#### § (N+4) — Developer Guide (開発ガイド)
- セットアップ手順 (実際のコマンドをREADMEやスクリプトから引用)
- ビルド・テスト・デプロイの方法
- よくあるトラブルシューティング

#### Mermaid図の埋め込み方法
Mermaid図は以下の形式で埋め込む。CDNからMermaidを読み込むscriptタグをHTMLのheadに追加すること:
```html
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true,theme:'base',themeVariables:{primaryColor:'#E4DFD3',primaryBorderColor:'#0B0B0B',primaryTextColor:'#0B0B0B',lineColor:'#6E6A5E',secondaryColor:'#EEFF57',tertiaryColor:'#ECE8DE'}});</script>
```
図は `<pre class="mermaid">` タグで囲む:
```html
<pre class="mermaid">
graph TD
    A[Client] --> B[API Gateway]
    B --> C[Auth Service]
    B --> D[Business Logic]
    D --> E[(Database)]
</pre>
```
最低でも以下の図を含めること:
1. **システムアーキテクチャ図** (§ 01)
2. **データフロー図** (§ 02)
3. 各コンポーネントの関係図 (§ 02)

#### 品質基準 — これが最も重要

あなたはトップレベルのシニアエンジニアとテクニカルライターの両方の視点で書く。「AIが書いたそれっぽいドキュメント」ではなく、**実際にコードを全部読んだ人間が書いた本物のドキュメント**を目指す。

**調査の深さ:**
- ファイル名やディレクトリ名だけ見て推測で書くな。**必ず Read ツールで実際のコードを読んでから書く**
- 関数の説明は、実装を読んで「何をしているか」「なぜそうしているか」「どこから呼ばれているか」を書く
- import/require を追って依存関係を実際に確認する。推測で矢印を引かない
- 設定値やデフォルト値はコードから引用する。「おそらく」「〜と思われます」は禁止

**書き方:**
- 各セクションは具体的なコード引用を最低2箇所含める。引用は `<pre>` でファイル名付きで表示
- 表 (table) を積極的に使う。ファイル一覧、API一覧、設定一覧は必ず表にする
- 「このファイルは〜を担当しています」のような薄い説明で終わらない。**具体的にどの関数がどう動くか**まで書く
- コードの意図が不明な場合は「実装を見る限り〜だが、明示的なコメントはない」のように正直に書く
- 各セクションの末尾に `.ask-block` で深掘り質問を配置する

### Step 2.5: Detect GitHub remote

Run `git remote get-url origin` to detect the GitHub URL. Extract the owner/repo (e.g. `susumutomita/codewiki`) and default branch. Store this — the generated HTML will use it for GitHub links.

### Step 3: Generate the static site

Create the file `.codewiki/index.html` using the Write tool. The HTML must:

1. Include ALL analysis content rendered as styled HTML
2. Include the interactive features (see HTML template below)
3. Be completely self-contained (except Google Fonts and Mermaid CDN)
4. Include a **split-pane view**: documentation on the left, source code panel on the right
5. Every file path mentioned in the docs should be a clickable link that opens that file in the right pane
6. If a GitHub remote was detected, show a "View on GitHub" link for each file

### Step 4: Start the server

Run this command to start the server and open the browser:

```bash
python3 -c "
import http.server, json, subprocess, os, sys
from pathlib import Path
from urllib.parse import urlparse, parse_qs

ROOT = os.getcwd()
WIKI = os.path.join(ROOT, '.codewiki')

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=WIKI, **k)
    def do_POST(s):
        if s.path=='/api/ask':
            d=json.loads(s.rfile.read(int(s.headers.get('Content-Length',0))))
            q=d.get('question','')
            try:
                r=subprocess.run(['claude','-p','--output-format','text',q],capture_output=True,text=True,timeout=120,cwd=ROOT)
                s._j(200,{'answer':r.stdout.strip() or r.stderr.strip() or '(empty)'})
            except: s._j(500,{'error':'claude error'})
        else: s._j(404,{})
    def do_GET(s):
        if s.path.startswith('/api/file'):
            qs=parse_qs(urlparse(s.path).query);rel=qs.get('path',[''])[0]
            t=Path(ROOT,rel).resolve()
            if not str(t).startswith(ROOT): return s._j(403,{'error':'denied'})
            if not t.is_file(): return s._j(404,{'error':'not found'})
            try:
                c=t.read_text(errors='replace')
                s._j(200,{'content':c,'path':rel,'lines':c.count(chr(10))+1})
            except Exception as e: s._j(500,{'error':str(e)})
        else: super().do_GET()
    def _j(s,st,d):
        b=json.dumps(d,ensure_ascii=False).encode()
        s.send_response(st);s.send_header('Content-Type','application/json');s.send_header('Content-Length',str(len(b)));s.end_headers();s.wfile.write(b)
    def log_message(s,f,*a):
        if '/api/' in (a[0] if a else ''): super().log_message(f,*a)

print('Code Wiki: http://localhost:8080');
import webbrowser; webbrowser.open('http://localhost:8080')
http.server.HTTPServer(('',8080),H).serve_forever()
" &
```

Tell the user the wiki is ready at http://localhost:8080.

## Design System for Generated Wiki

The generated `.codewiki/index.html` MUST use the **mono-brutalist** design system. This is critical — the wiki should look as polished as the landing page.

### Design tokens (use these exactly)

- **Fonts**: `'Geist Mono'` for body/code, `'Geist'` for headings, `'Instrument Serif'` for italic accents
- **Load fonts**: `<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600&family=Geist:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">`
- **Background**: `#ECE8DE` (warm paper)
- **Ink**: `#0B0B0B` (near-black)
- **Muted text**: `#6E6A5E`
- **Accent**: `#5E4AE3` (deep indigo)
- **Rules/borders**: `1px solid #0B0B0B`
- **Code blocks**: background `#E4DFD3`, border `1px solid #0B0B0B`
- **No border-radius** on major containers (0px or 0). Only subtle radius on small UI elements.
- **No emoji icons**. Use typographic elements, section numbers (§ 01, § 02), and dashes.
- **Section headers**: small uppercase mono labels like `§ 01 — OVERVIEW / architecture`
- **Headings**: large Geist Sans bold with tight letter-spacing (-0.035em)
- **Box shadows**: `4px 4px 0 #0B0B0B` (hard offset, not blurred)
- **Highlight**: `background: #EEFF57` for important terms, not colored badges

### HTML structure to follow

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>PROJECT_NAME — codewiki</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@300;400;500;600&family=Geist:wght@300;400;500;600;700;800;900&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
<style>
:root{--bg:#ECE8DE;--bg-2:#E4DFD3;--ink:#0B0B0B;--ink-soft:#2A2A28;--mute:#6E6A5E;--rule:#0B0B0B;--rule-soft:#BEB8A8;--accent:#5E4AE3;--accent-ink:#fff;--hl:#EEFF57;--ok:#15803D;--sans:'Geist',system-ui,sans-serif;--mono:'Geist Mono','SF Mono',monospace;--serif:'Instrument Serif',serif;--sidebar-w:260px;--gutter:32px}
*{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--mono);font-size:14px;line-height:1.65;background:var(--bg);color:var(--ink);-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
::selection{background:var(--accent);color:var(--accent-ink)}

/* grid overlay */
body::before{content:"";position:fixed;inset:0;background-image:linear-gradient(to right,var(--rule-soft) 1px,transparent 1px);background-size:calc(100%/12) 100%;opacity:.25;pointer-events:none;z-index:0;mix-blend-mode:multiply}

/* nav */
.nav{display:flex;align-items:center;justify-content:space-between;padding:14px var(--gutter);border-bottom:1px solid var(--rule);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);background:var(--bg);position:sticky;top:0;z-index:50}
.nav .brand{font-family:var(--sans);font-weight:800;font-size:18px;letter-spacing:-.03em;text-transform:none;color:var(--ink)}
.nav .brand .sl{color:var(--accent);font-family:var(--mono);font-weight:500;margin:0 4px}

/* sidebar */
.sidebar{position:fixed;top:52px;left:0;bottom:0;width:var(--sidebar-w);border-right:1px solid var(--rule);overflow-y:auto;z-index:40;padding:20px 0;background:var(--bg)}
.sidebar .sec-label{padding:14px 20px 6px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.12em;color:var(--mute)}
.sidebar .nav-link{display:block;padding:5px 20px 5px 24px;font-size:13px;color:var(--mute);border-left:2px solid transparent;transition:all .12s}
.sidebar .nav-link:hover,.sidebar .nav-link.active{color:var(--ink);border-left-color:var(--accent)}

/* main */
.main{margin-left:var(--sidebar-w);padding:40px var(--gutter) 100px;max-width:900px;position:relative;z-index:1}

/* typography */
h1{font-family:var(--sans);font-weight:800;letter-spacing:-.04em;font-size:clamp(36px,5vw,56px);line-height:.95;margin-bottom:20px}
h1 em{font-family:var(--serif);font-style:italic;font-weight:400}
h2{font-family:var(--sans);font-weight:700;letter-spacing:-.03em;font-size:28px;line-height:1;margin:56px 0 8px;padding-top:24px;border-top:1px solid var(--rule)}
h3{font-family:var(--sans);font-weight:600;font-size:18px;letter-spacing:-.015em;margin:28px 0 8px}
h4{font-family:var(--mono);font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);margin:20px 0 8px}
p{margin-bottom:10px;color:var(--ink-soft)}
strong{color:var(--ink)}
li{margin:3px 0 3px 20px;color:var(--ink-soft)}

/* section header bar */
.sec-head{display:grid;grid-template-columns:60px 1fr auto;gap:16px;align-items:baseline;padding:14px 0 8px;font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);border-bottom:1px solid var(--rule);margin-bottom:24px}
.sec-head .idx{color:var(--ink)}
.sec-head .title{color:var(--ink)}

/* content blocks */
.section-content{border:1px solid var(--rule);background:var(--bg-2);padding:28px;margin:16px 0}
.section-content h2{border:none;margin:28px 0 8px;padding:0;font-size:22px}
.section-content h3{margin:20px 0 6px}

/* code */
pre{background:var(--bg-2);border:1px solid var(--rule);padding:16px;overflow-x:auto;font-size:12.5px;line-height:1.5;margin:12px 0;font-family:var(--mono)}
code{font-family:var(--mono);font-size:12.5px}
.inline-code{background:var(--bg-2);border:1px solid var(--rule-soft);padding:1px 5px;font-size:12px}

/* tables */
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:13px;font-family:var(--mono)}
th,td{padding:10px 14px;border:1px solid var(--rule);text-align:left}
th{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);font-weight:500}

/* highlight */
.hl{background:var(--hl);padding:0 .1em;color:var(--ink)}

/* file tree */
.file-tree{font-family:var(--mono);font-size:12.5px;line-height:1.8}
.file-tree .dir{color:var(--accent);font-weight:600}
.file-tree .file{color:var(--ink);cursor:pointer}
.file-tree .file:hover{color:var(--accent);text-decoration:underline}
.file-tree li{list-style:none;padding-left:20px;border-left:1px solid var(--rule-soft)}
.file-tree>li{border-left:none;padding-left:0}

/* ask prompt blocks */
.ask-block{border:1px solid var(--rule);background:var(--bg-2);padding:12px 16px;margin:12px 0;display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;transition:background .12s}
.ask-block:hover{background:var(--ink);color:var(--bg)}
.ask-block .prompt-text{font-size:13px;color:var(--ink-soft)}
.ask-block:hover .prompt-text{color:var(--bg)}
.ask-block .ask-label{font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:var(--accent);white-space:nowrap;font-weight:500}
.ask-block:hover .ask-label{color:var(--hl)}

/* split pane: source panel (right side) */
.source-panel{position:fixed;top:52px;right:0;bottom:0;width:0;background:var(--bg);border-left:1px solid var(--rule);z-index:45;transition:width .2s;overflow:hidden;display:flex;flex-direction:column}
.source-panel.open{width:50%}
.source-panel .sp-head{display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid var(--rule);background:var(--bg-2);font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--mute);gap:8px;flex-shrink:0}
.source-panel .sp-head .sp-path{color:var(--ink);font-weight:500;text-transform:none;letter-spacing:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.source-panel .sp-head a{color:var(--accent);font-size:10px;white-space:nowrap}
.source-panel .sp-head a:hover{text-decoration:underline}
.source-panel .sp-close{cursor:pointer;color:var(--mute);font-size:14px;padding:0 4px}
.source-panel .sp-close:hover{color:var(--ink)}
.source-panel .sp-body{flex:1;overflow:auto;padding:0}
.source-panel .sp-body pre{margin:0;border:none;padding:16px;font-size:12.5px;line-height:1.6;counter-reset:line}
.source-panel .sp-body pre .ln{display:inline-block;width:40px;text-align:right;padding-right:12px;color:var(--mute);opacity:.5;user-select:none;border-right:1px solid var(--rule-soft);margin-right:12px}
body.split .main{max-width:calc(50vw - var(--sidebar-w) - 20px)}
body.split .sidebar{width:200px}
body.split .chat-panel{right:52%}

/* file link (clickable paths in docs) */
.file-link{color:var(--accent);cursor:pointer;border-bottom:1px dashed var(--accent);font-family:var(--mono);font-size:12.5px}
.file-link:hover{color:var(--ink);border-color:var(--ink)}

/* file reader (fallback for bottom section) */
.file-reader{border:1px solid var(--rule);margin:16px 0;overflow:hidden}
.file-reader-bar{display:flex;gap:8px;padding:10px 16px;border-bottom:1px solid var(--rule);background:var(--bg-2)}
.file-reader-bar input{flex:1;background:var(--bg);border:1px solid var(--rule);padding:6px 10px;color:var(--ink);font-size:12px;font-family:var(--mono);outline:none}
.file-reader-bar input:focus{border-color:var(--accent)}
.file-reader-bar button{background:var(--ink);color:var(--bg);border:none;padding:6px 14px;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.08em;cursor:pointer}
.file-reader-bar button:hover{background:var(--accent);color:var(--accent-ink)}
.file-reader-content{overflow:auto}
.file-reader-content pre{margin:0;border:none}

/* context menu */
.ctx{display:none;position:fixed;z-index:9999;background:var(--bg);border:1px solid var(--ink);min-width:220px;box-shadow:4px 4px 0 var(--ink);font-size:12px}
.ctx .row{padding:8px 12px;display:flex;justify-content:space-between;gap:20px;color:var(--ink-soft);border-bottom:1px dashed var(--rule-soft);cursor:pointer;white-space:nowrap}
.ctx .row:last-child{border-bottom:none}
.ctx .row:hover,.ctx .row.hot{background:var(--accent);color:var(--accent-ink)}
.ctx .row .k{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--mute)}
.ctx .row:hover .k,.ctx .row.hot .k{color:var(--accent-ink);opacity:.8}

/* chat */
.chat-fab{position:fixed;bottom:20px;right:20px;z-index:1000;width:48px;height:48px;border:1px solid var(--ink);background:var(--bg);box-shadow:4px 4px 0 var(--ink);display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:var(--mono);font-size:16px;transition:background .12s}
.chat-fab:hover{background:var(--accent);color:var(--accent-ink);border-color:var(--accent)}
.chat-panel{display:none;position:fixed;bottom:80px;right:20px;z-index:1000;width:420px;max-height:65vh;border:1px solid var(--ink);background:var(--bg);box-shadow:4px 4px 0 var(--ink);flex-direction:column}
.chat-panel .ch-head{padding:10px 14px;border-bottom:1px solid var(--rule);font-size:11px;text-transform:uppercase;letter-spacing:.1em;display:flex;justify-content:space-between;align-items:center;color:var(--mute)}
.chat-panel .ch-head b{color:var(--ink)}
.chat-panel .ch-close{cursor:pointer}
.chat-msgs{flex:1;overflow-y:auto;padding:14px;max-height:calc(65vh - 100px);min-height:160px}
.chat-msg{margin-bottom:10px;display:flex}
.chat-msg.user{justify-content:flex-end}
.chat-msg .bubble{max-width:85%;padding:8px 12px;font-size:13px;line-height:1.5;word-break:break-word}
.chat-msg.user .bubble{background:var(--ink);color:var(--bg)}
.chat-msg.bot .bubble{background:var(--bg-2);border:1px solid var(--rule);color:var(--ink)}
.chat-msg.bot .bubble pre{margin:6px 0;padding:8px;background:var(--bg);border:1px solid var(--rule);overflow-x:auto;font-size:12px}
.chat-input-row{display:flex;gap:8px;padding:10px;border-top:1px solid var(--rule)}
.chat-input-row input{flex:1;background:var(--bg);border:1px solid var(--rule);padding:8px 10px;color:var(--ink);font-family:var(--mono);font-size:13px;outline:none}
.chat-input-row input:focus{border-color:var(--accent)}
.chat-input-row button{background:var(--ink);color:var(--bg);border:none;padding:8px 14px;font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.08em;cursor:pointer}
.chat-input-row button:hover{background:var(--accent);color:var(--accent-ink)}
.typing-ind{display:inline-flex;gap:3px;padding:4px 0}
.typing-ind span{width:5px;height:5px;background:var(--mute);animation:tblink 1.2s infinite}
.typing-ind span:nth-child(2){animation-delay:.2s}
.typing-ind span:nth-child(3){animation-delay:.4s}
@keyframes tblink{0%,60%,100%{opacity:.3}30%{opacity:1}}

.toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%) translateY(60px);background:var(--ink);color:var(--bg);padding:8px 18px;font-family:var(--mono);font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:0;transition:all .25s;z-index:2000}
.toast.show{transform:translateX(-50%) translateY(0);opacity:1}

@media(max-width:900px){.sidebar{display:none}.main{margin-left:0;padding:20px}}
</style>
</head>
<body>

<!-- NAV -->
<header class="nav">
  <span class="brand">PROJECT_NAME<span class="sl">/</span></span>
  <span>codewiki</span>
</header>

<!-- SIDEBAR: Generate nav links for each section -->
<nav class="sidebar">
  <div class="sec-label">Documentation</div>
  <!-- Add .nav-link entries for each h2 section -->
  <div class="sec-label" style="margin-top:16px">Explore</div>
  <a class="nav-link" href="#file-tree">File Tree</a>
  <a class="nav-link" href="#file-reader">File Reader</a>
</nav>

<div class="main">
<h1>PROJECT_NAME</h1>
<p style="font-size:11px;text-transform:uppercase;letter-spacing:.1em;color:var(--mute);margin-bottom:32px">
  codewiki · generated TIMESTAMP · full rebuild
</p>

<div style="border:1px solid var(--rule);padding:14px 18px;margin-bottom:40px;font-size:13px;color:var(--ink-soft)">
  <strong>Right-click</strong> any text to ask Claude Code.
  Use the <strong>chat</strong> (bottom-right) for free-form questions.
  Click <strong>Ask</strong> on prompts below each section to deep-dive.
</div>

<!-- ANALYSIS CONTENT HERE -->
<!--
  For each section use this structure:
  
  <div class="sec-head">
    <span class="idx">§ 01</span>
    <span class="title">SECTION NAME</span>
    <span>/ label</span>
  </div>
  
  <div class="section-content">
    YOUR ANALYSIS HTML HERE
  </div>
  
  <div class="ask-block" onclick="sendChat('follow-up question text')">
    <span class="prompt-text">A suggested follow-up question about this section</span>
    <span class="ask-label">Ask →</span>
  </div>
-->

<!-- FILE TREE and FILE READER sections go here -->

<!-- IMPORTANT: For file paths in docs, use <span class="file-link" data-path="path/to/file.ts">path/to/file.ts</span>
     This makes them clickable → opens in the split source panel on the right.
     If a GitHub remote was detected, also set data-github="https://github.com/owner/repo/blob/main/path/to/file.ts"
     on each file-link so the panel shows a "View on GitHub" link. -->

</div>

<!-- Source Panel (split view — right side) -->
<div class="source-panel" id="sourcePanel">
  <div class="sp-head">
    <span class="sp-path" id="spPath">—</span>
    <a id="spGithub" href="#" target="_blank" rel="noopener" style="display:none">GitHub →</a>
    <span class="sp-close" id="spClose">close ✕</span>
  </div>
  <div class="sp-body" id="spBody">
    <pre style="color:var(--mute);padding:20px;text-align:center">ファイルを選択してください</pre>
  </div>
</div>

<!-- Context Menu -->
<div class="ctx" id="contextMenu">
  <div class="row hot" id="ctxAsk"><span>Ask Claude Code</span><span class="k">⌘K</span></div>
  <div class="row" id="ctxExplain"><span>Explain this</span><span class="k">⌘E</span></div>
  <div class="row" id="ctxDeep"><span>Find in source</span><span class="k">⌘F</span></div>
  <div class="row" id="ctxCopy"><span>Copy</span><span class="k">⌘C</span></div>
</div>

<!-- Chat Widget -->
<div class="chat-fab" id="chatFab" onclick="toggleChat()">?</div>
<div class="chat-panel" id="chatPanel">
  <div class="ch-head"><b>Claude Code</b><span class="ch-close" onclick="toggleChat()">close ✕</span></div>
  <div class="chat-msgs" id="chatMessages">
    <div class="chat-msg bot"><div class="bubble">Ask anything about this codebase.</div></div>
  </div>
  <div class="chat-input-row">
    <input id="chatInput" type="text" placeholder="Ask a question..." onkeydown="if(event.key==='Enter')sendChat()">
    <button onclick="sendChat()">Send</button>
  </div>
</div>
<div class="toast" id="toast"></div>

<script>
let chatOpen=false;
function toggleChat(){chatOpen=!chatOpen;document.getElementById('chatPanel').style.display=chatOpen?'flex':'none';document.getElementById('chatFab').style.display=chatOpen?'none':'flex';if(chatOpen)document.getElementById('chatInput').focus()}
function escH(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function renderMd(t){return t.replace(/```(\w*)\n([\s\S]*?)```/g,'<pre><code>$2</code></pre>').replace(/`([^`]+)`/g,'<code class="inline-code">$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\n/g,'<br>')}
function addMsg(t,r){const m=document.getElementById('chatMessages'),d=document.createElement('div');d.className='chat-msg '+r;const b=document.createElement('div');b.className='bubble';b.innerHTML=r==='bot'?renderMd(t):escH(t);d.appendChild(b);m.appendChild(d);m.scrollTop=m.scrollHeight}
function addTyping(){const m=document.getElementById('chatMessages'),d=document.createElement('div');d.className='chat-msg bot';d.id='typingMsg';d.innerHTML='<div class="bubble"><div class="typing-ind"><span></span><span></span><span></span></div></div>';m.appendChild(d);m.scrollTop=m.scrollHeight}
function rmTyping(){const e=document.getElementById('typingMsg');if(e)e.remove()}
async function sendChat(pre){const i=document.getElementById('chatInput'),q=pre||i.value.trim();if(!q)return;i.value='';if(!chatOpen)toggleChat();addMsg(q,'user');addTyping();try{const r=await fetch('/api/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question:q})});rmTyping();if(r.ok){const d=await r.json();addMsg(d.answer||'(empty)','bot')}else{addMsg('Error','bot')}}catch(e){rmTyping();addMsg('Server not reachable.','bot')}}
let sel='';
document.addEventListener('contextmenu',e=>{const s=window.getSelection().toString().trim();if(!s)return;e.preventDefault();sel=s;const m=document.getElementById('contextMenu');m.style.display='block';let x=e.clientX,y=e.clientY;if(x+m.offsetWidth>innerWidth)x=innerWidth-m.offsetWidth-8;if(y+m.offsetHeight>innerHeight)y=innerHeight-m.offsetHeight-8;m.style.left=x+'px';m.style.top=y+'px'});
document.addEventListener('click',()=>{document.getElementById('contextMenu').style.display='none'});
document.getElementById('ctxAsk').onclick=()=>sendChat('"'+sel+'" — explain this in detail');
document.getElementById('ctxExplain').onclick=()=>sendChat('Explain: '+sel);
document.getElementById('ctxDeep').onclick=()=>sendChat('Find "'+sel+'" in the source code and explain the implementation');
document.getElementById('ctxCopy').onclick=()=>{navigator.clipboard.writeText(sel);showToast('copied')};

/* ── source panel (split view) ── */
const spPanel=document.getElementById('sourcePanel');
const spPath=document.getElementById('spPath');
const spBody=document.getElementById('spBody');
const spGithub=document.getElementById('spGithub');
document.getElementById('spClose').onclick=closeSource;
function closeSource(){spPanel.classList.remove('open');document.body.classList.remove('split')}
async function openSource(path,ghUrl){
  spPath.textContent=path;
  if(ghUrl){spGithub.href=ghUrl;spGithub.style.display=''}else{spGithub.style.display='none'}
  spPanel.classList.add('open');document.body.classList.add('split');
  spBody.innerHTML='<pre style="color:var(--mute);padding:20px">loading...</pre>';
  try{
    const r=await fetch('/api/file?path='+encodeURIComponent(path));
    if(r.ok){const d=await r.json();const lines=d.content.split(String.fromCharCode(10));
      spBody.innerHTML='<pre>'+lines.map(function(l,i){return'<span class="ln">'+(i+1)+'</span>'+escH(l)}).join(String.fromCharCode(10))+'</pre>';
    }else{spBody.innerHTML='<pre style="color:var(--ink);padding:20px">not found</pre>'}
  }catch(e){spBody.innerHTML='<pre style="padding:20px">cannot connect</pre>'}
}
/* clickable file-links in docs */
document.querySelectorAll('.file-link').forEach(function(el){el.addEventListener('click',function(){openSource(el.dataset.path,el.dataset.github||'')})});
/* clickable file tree */
document.querySelectorAll('.file-tree .file').forEach(function(el){el.addEventListener('click',function(){var parts=[el.textContent],node=el.closest('li');while(node.parentElement&&node.parentElement.closest('li')){node=node.parentElement.closest('li');var d=node.querySelector(':scope > .dir');if(d)parts.unshift(d.textContent.replace('/',''))}openSource(parts.join('/'),'')})});
/* also update the bottom file reader */
async function loadFile(){var p=document.getElementById('filePathInput').value.trim();if(!p)return;openSource(p,'')};
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1500)}
const navLinks=document.querySelectorAll('.sidebar .nav-link');
const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){navLinks.forEach(l=>l.classList.remove('active'));const l=document.querySelector('.nav-link[href="#'+e.target.id+'"]');if(l)l.classList.add('active')}})},{rootMargin:'-20% 0px -70% 0px'});
document.querySelectorAll('h2[id]').forEach(s=>obs.observe(s));
</script>
</body>
</html>
```

## Important guidelines

- **出力言語はユーザーの言語に自動で合わせる。** ユーザーのプロンプトやシステムコンテキストの言語を検出し、その言語でセクション・見出し・説明文を生成する。コード引用・コマンド・変数名のみ原文のまま。言語の明示指定がある場合 (例: `--lang en`) はそれに従う。
- Generate THOROUGH analysis. Read actual source files. Don't just list file names.
- Each section MUST have specific code quotes (minimum 2 per section) inside `<pre>` blocks.
- Use **tables** aggressively: file listings, API endpoints, env vars, configs → always a table.
- Add `.ask-block` prompt blocks after each section for follow-up questions.
- Include **Mermaid diagrams** (minimum 3): architecture, data flow, component relationships.
- Include a File Tree section at the end with clickable file names.
- Include a File Reader section at the end.
- The HTML MUST be self-contained (except for Google Fonts and Mermaid CDN).
- Do NOT do incremental updates. Always generate the complete HTML from scratch.
- Follow the section numbering: § 01, § 02, § 03... using `.sec-head` markup.
