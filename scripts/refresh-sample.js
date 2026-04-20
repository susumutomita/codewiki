const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SAMPLE_PATH = path.join(ROOT, '.codewiki', 'index.html');
const SKILL_PATH = path.join(ROOT, 'SKILL.md');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function countLines(filePath) {
  const text = read(filePath);
  if (text.length === 0) return 0;
  const newlineCount = (text.match(/\n/g) || []).length;
  return text.endsWith('\n') ? newlineCount : newlineCount + 1;
}

function runGit(args) {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

function gitCommitCount(relPath) {
  const output = runGit(['log', '--follow', '--oneline', '--', relPath]);
  return output ? output.split('\n').filter(Boolean).length : 0;
}

function latestCommitDate() {
  return runGit(['log', '-1', '--format=%cs']) || 'unknown';
}

function escapeHtml(value) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getHeadingRanges() {
  const lines = read(SKILL_PATH).split('\n');
  const findLine = (pattern) => {
    const index = lines.findIndex((line) => pattern.test(line));
    if (index === -1) {
      throw new Error(`Missing heading: ${pattern}`);
    }
    return index + 1;
  };

  const mission = findLine(/^## Mission$/);
  const modes = findLine(/^## Modes$/);
  const process = findLine(/^## Process$/);
  const step1 = findLine(/^### Step 1: Scan the project$/);
  const step15 = findLine(/^### Step 1\.5: Static analysis/);
  const step25 = findLine(/^### Step 2\.5: Detect GitHub remote$/);
  const step3 = findLine(/^### Step 3: Generate the static site$/);
  const step4 = findLine(/^### Step 4: Start the server$/);
  const designSystem = findLine(/^## Design System for Generated Wiki$/);
  const htmlStructure = findLine(/^### HTML structure to follow$/);
  const guidelines = findLine(/^## Important guidelines$/);
  const total = countLines(SKILL_PATH);

  return [
    ['frontmatter', '1-4', 'スキル名と description'],
    ['Mission', `${mission}-${modes - 1}`, 'プロダクトの存在理由とゴール'],
    ['Modes', `${modes}-${process - 1}`, 'default / --deep / --debug の3モード'],
    ['Step 1', `${step1}-${step15 - 1}`, '構造把握'],
    ['Step 1.5', `${step15}-${step25 - 1}`, 'fact 抽出、analyzer、Design History の入力収集'],
    ['Step 2.5', `${step25}-${step3 - 1}`, 'GitHub remote 検出'],
    ['Step 3', `${step3}-${step4 - 1}`, 'HTML 生成'],
    ['Step 4', `${step4}-${designSystem - 1}`, 'ローカルサーバーと hardening'],
    ['Design System', `${designSystem}-${htmlStructure - 1}`, 'デザイントークン'],
    ['HTML Template', `${htmlStructure}-${guidelines - 1}`, 'split-pane と interactive UI'],
    ['Important guidelines', `${guidelines}-${total}`, '品質基準'],
  ];
}

function buildOverviewRows() {
  const files = [
    ['SKILL.md', `スキル本体。${countLines(path.join(ROOT, 'SKILL.md'))}行`],
    ['README.md', `公開ドキュメント。${countLines(path.join(ROOT, 'README.md'))}行`],
    ['SECURITY.md', `脅威モデルと hardening 方針。${countLines(path.join(ROOT, 'SECURITY.md'))}行`],
    ['agents/openai.yaml', 'UI 向けメタデータ'],
    ['scripts/refresh-sample.js', `sample wiki を repo 状態から完全再生成。${countLines(path.join(ROOT, 'scripts', 'refresh-sample.js'))}行`],
    ['scripts/validate.js', `必須ファイルと同期状態を検証。${countLines(path.join(ROOT, 'scripts', 'validate.js'))}行`],
    ['.github/workflows/validate.yml', 'push / pull_request で npm run validate を実行'],
    ['docs/index.html', `ランディングページ。${countLines(path.join(ROOT, 'docs', 'index.html'))}行`],
    ['PRODUCT_HUNT.md', `ローンチ文面。${countLines(path.join(ROOT, 'PRODUCT_HUNT.md'))}行`],
    ['package.json', 'npm メタデータと maintainer scripts'],
  ];

  return files
    .map(
      ([file, description]) =>
        `<tr><td><span class="file-link" data-path="${escapeHtml(file)}">${escapeHtml(file)}</span></td><td>${description}</td></tr>`
    )
    .join('\n');
}

function buildSkillStructureRows() {
  return getHeadingRanges()
    .map(
      ([section, lines, role]) =>
        `<tr><td>${escapeHtml(section)}</td><td>${escapeHtml(lines)}</td><td>${escapeHtml(role)}</td></tr>`
    )
    .join('\n');
}

function buildMetricsRows() {
  const rows = [
    ['SKILL.md', gitCommitCount('SKILL.md'), 'High', 'プロダクトの仕様そのものなので churn が高い'],
    ['README.md', gitCommitCount('README.md'), 'Med', 'ポジショニングと保守導線の変更に追従'],
    ['docs/index.html', gitCommitCount('docs/index.html'), 'Low', '見せ方の調整が中心'],
    ['package.json', gitCommitCount('package.json'), 'Low', 'メタデータと scripts の更新が中心'],
  ];

  return rows
    .map(([file, commits, risk, note]) => {
      const riskClass = risk === 'High' ? 'risk-high' : risk === 'Med' ? 'risk-med' : 'risk-low';
      return `<tr><td><span class="file-link" data-path="${escapeHtml(file)}">${escapeHtml(file)}</span></td><td>${commits}</td><td><span class="risk-badge ${riskClass}">${risk}</span></td><td>${escapeHtml(note)}</td></tr>`;
    })
    .join('\n');
}

function buildFileSizeRows() {
  const rows = [
    ['SKILL.md', countLines(path.join(ROOT, 'SKILL.md')), '知識が 1 ファイルに集中している'],
    ['docs/index.html', countLines(path.join(ROOT, 'docs', 'index.html')), '自己完結の landing page'],
    ['README.md', countLines(path.join(ROOT, 'README.md')), '公開説明として十分に簡潔'],
    ['PRODUCT_HUNT.md', countLines(path.join(ROOT, 'PRODUCT_HUNT.md')), '投稿用コピー'],
  ];

  return rows
    .map(
      ([file, lines, note]) =>
        `<tr><td><span class="file-link" data-path="${escapeHtml(file)}">${escapeHtml(file)}</span></td><td>${lines}</td><td>${escapeHtml(note)}</td></tr>`
    )
    .join('\n');
}

function buildFileTree() {
  const skillLines = countLines(path.join(ROOT, 'SKILL.md'));
  const readmeLines = countLines(path.join(ROOT, 'README.md'));
  const securityLines = countLines(path.join(ROOT, 'SECURITY.md'));
  const docsLines = countLines(path.join(ROOT, 'docs', 'index.html'));
  const refreshLines = countLines(path.join(ROOT, 'scripts', 'refresh-sample.js'));
  const validateLines = countLines(path.join(ROOT, 'scripts', 'validate.js'));

  return `
<ul class="file-tree">
  <li><span class="dir">codewiki/</span>
    <ul>
      <li><span class="file-link" data-path="SKILL.md">SKILL.md</span> <span class="meta">— ${skillLines} lines</span></li>
      <li><span class="file-link" data-path="README.md">README.md</span> <span class="meta">— ${readmeLines} lines</span></li>
      <li><span class="file-link" data-path="SECURITY.md">SECURITY.md</span> <span class="meta">— ${securityLines} lines</span></li>
      <li><span class="file-link" data-path="PRODUCT_HUNT.md">PRODUCT_HUNT.md</span></li>
      <li><span class="file-link" data-path="package.json">package.json</span></li>
      <li><span class="dir">agents/</span>
        <ul>
          <li><span class="file-link" data-path="agents/openai.yaml">openai.yaml</span></li>
        </ul>
      </li>
      <li><span class="dir">scripts/</span>
        <ul>
          <li><span class="file-link" data-path="scripts/refresh-sample.js">refresh-sample.js</span> <span class="meta">— ${refreshLines} lines</span></li>
          <li><span class="file-link" data-path="scripts/validate.js">validate.js</span> <span class="meta">— ${validateLines} lines</span></li>
        </ul>
      </li>
      <li><span class="dir">.github/</span>
        <ul>
          <li><span class="dir">workflows/</span>
            <ul>
              <li><span class="file-link" data-path=".github/workflows/validate.yml">validate.yml</span></li>
            </ul>
          </li>
        </ul>
      </li>
      <li><span class="dir">docs/</span>
        <ul>
          <li><span class="file-link" data-path="docs/index.html">index.html</span> <span class="meta">— ${docsLines} lines</span></li>
          <li><span class="file-link" data-path="docs/og.svg">og.svg</span></li>
        </ul>
      </li>
    </ul>
  </li>
</ul>`;
}

function buildExpectedSample() {
  const commitDate = latestCommitDate();
  const skillLines = countLines(path.join(ROOT, 'SKILL.md'));

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>codewiki sample</title>
  <style>
    :root {
      --bg: #ECE8DE;
      --bg-2: #E4DFD3;
      --ink: #0B0B0B;
      --mute: #6E6A5E;
      --accent: #5E4AE3;
      --rule: #0B0B0B;
      --ok: #15803D;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: var(--bg);
      color: var(--ink);
      line-height: 1.6;
    }
    .layout {
      display: grid;
      grid-template-columns: 240px minmax(0, 1fr);
      min-height: 100vh;
    }
    .sidebar {
      border-right: 1px solid var(--rule);
      padding: 24px 16px;
      position: sticky;
      top: 0;
      height: 100vh;
      background: var(--bg);
    }
    .sidebar h1 {
      margin: 0 0 16px;
      font-size: 24px;
    }
    .sidebar a {
      display: block;
      color: var(--mute);
      text-decoration: none;
      margin: 8px 0;
    }
    .sidebar a:hover { color: var(--ink); }
    main {
      padding: 32px;
      max-width: 1100px;
    }
    .hero, .card, .note, .source-panel {
      border: 1px solid var(--rule);
      background: var(--bg-2);
    }
    .hero {
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 4px 4px 0 var(--rule);
    }
    .hero p { margin: 8px 0; }
    section { margin-bottom: 28px; }
    h2 {
      margin: 0 0 12px;
      font-size: 22px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      border: 1px solid var(--rule);
      padding: 10px 12px;
      vertical-align: top;
    }
    th {
      text-align: left;
      color: var(--mute);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: .08em;
    }
    .card { padding: 20px; }
    .note { padding: 14px 16px; margin-top: 12px; }
    .file-link {
      color: var(--accent);
      cursor: pointer;
      border-bottom: 1px dashed var(--accent);
    }
    .file-tree { list-style: none; padding-left: 0; }
    .file-tree ul { list-style: none; padding-left: 20px; }
    .dir { color: var(--accent); font-weight: 700; }
    .meta { color: var(--mute); font-size: 12px; }
    .risk-badge {
      display: inline-block;
      padding: 2px 8px;
      border: 1px solid var(--rule);
      font-size: 11px;
      text-transform: uppercase;
    }
    .risk-high { background: rgba(194,65,12,.12); color: #C2410C; }
    .risk-med { background: rgba(180,83,9,.12); color: #B45309; }
    .risk-low { background: rgba(21,128,61,.12); color: var(--ok); }
    .source-panel {
      margin-top: 16px;
      padding: 0;
      overflow: hidden;
    }
    .source-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 14px;
      border-bottom: 1px solid var(--rule);
    }
    .source-body {
      padding: 16px;
      min-height: 180px;
      white-space: pre-wrap;
      overflow: auto;
      background: var(--bg);
    }
    code.inline { background: var(--bg); border: 1px solid var(--rule); padding: 1px 5px; }
    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .sidebar {
        position: static;
        height: auto;
        border-right: none;
        border-bottom: 1px solid var(--rule);
      }
      main { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="layout">
    <nav class="sidebar">
      <h1>codewiki</h1>
      <a href="#overview">Overview</a>
      <a href="#skill-structure">Skill Structure</a>
      <a href="#quality-gates">Quality Gates</a>
      <a href="#metrics">Metrics</a>
      <a href="#file-tree">File Tree</a>
    </nav>
    <main>
      <div class="hero">
        <strong>Maintainer sample</strong>
        <p>この <code class="inline">.codewiki/index.html</code> は repo 自身の状態を説明するためのサンプルです。</p>
        <p><span class="file-link" data-path="SKILL.md">SKILL.md</span> は現在 ${skillLines} 行。sample は <code class="inline">scripts/refresh-sample.js</code> で毎回 full rebuild されます。</p>
        <p>Last synced commit date: ${escapeHtml(commitDate)}</p>
      </div>

      <section id="overview" class="card">
        <h2>Overview</h2>
        <p>この repo の完成度を上げるために、スキル本体だけでなく <strong>検証</strong> と <strong>配布メタデータ</strong> も追加しました。今は <code class="inline">npm run refresh-sample</code> と <code class="inline">npm run validate</code> で sample と設定の整合性を保てます。</p>
        <table>
          <tr><th>Path</th><th>Role</th></tr>
          ${buildOverviewRows()}
        </table>
      </section>

      <section id="skill-structure" class="card">
        <h2>Skill Structure</h2>
        <p>スキルは依然として 1 ファイル中心ですが、どの領域がどこまで肥大化しているかを line range で追えるようにしています。</p>
        <table>
          <tr><th>Section</th><th>Lines</th><th>Purpose</th></tr>
          ${buildSkillStructureRows()}
        </table>
        <div class="note">観察: <code class="inline">SKILL.md</code> はすでに大きく、次の改善余地は <code class="inline">references/</code> への分割です。</div>
      </section>

      <section id="quality-gates" class="card">
        <h2>Quality Gates</h2>
        <table>
          <tr><th>Command</th><th>What it guarantees</th></tr>
          <tr><td><code class="inline">npm run refresh-sample</code></td><td>sample wiki を現在の repo 状態から再生成</td></tr>
          <tr><td><code class="inline">npm run validate</code></td><td>frontmatter、package metadata、openai.yaml、CI、sample sync を検証</td></tr>
          <tr><td><code class="inline">.github/workflows/validate.yml</code></td><td>push / pull_request で同じ検証を実行</td></tr>
        </table>
        <div class="note">90/100 に必要な残作業は repo 内よりも運用面です。実 repo での smoke test、<code class="inline">references/</code> 分割、明示的な release checklist が次の優先です。</div>
      </section>

      <section id="metrics" class="card">
        <h2>Metrics</h2>
        <table>
          <tr><th>File</th><th>Commits</th><th>Risk</th><th>Interpretation</th></tr>
          ${buildMetricsRows()}
        </table>
        <table>
          <tr><th>File</th><th>Lines</th><th>Observation</th></tr>
          ${buildFileSizeRows()}
        </table>
      </section>

      <section id="file-tree" class="card">
        <h2>File Tree</h2>
        ${buildFileTree()}
      </section>

      <section class="source-panel">
        <div class="source-head">
          <strong id="sourcePath">source preview</strong>
          <span>click a file path above</span>
        </div>
        <div class="source-body" id="sourceBody">ローカルサーバー経由で開くと、ここにファイル内容が表示されます。</div>
      </section>
    </main>
  </div>

  <script>
    const sourcePath = document.getElementById('sourcePath');
    const sourceBody = document.getElementById('sourceBody');
    document.querySelectorAll('.file-link').forEach((el) => {
      el.addEventListener('click', async () => {
        const file = el.dataset.path;
        sourcePath.textContent = file;
        sourceBody.textContent = 'loading...';
        try {
          const response = await fetch('/api/file?path=' + encodeURIComponent(file));
          if (!response.ok) throw new Error('request failed');
          const data = await response.json();
          sourceBody.textContent = data.content;
        } catch (error) {
          sourceBody.textContent = 'ローカルの codewiki server 経由で開くと source preview が有効になります。\\n\\npath: ' + file;
        }
      });
    });
  </script>
</body>
</html>
`;
}

function writeSample() {
  const next = buildExpectedSample();
  fs.mkdirSync(path.dirname(SAMPLE_PATH), { recursive: true });
  const current = fs.existsSync(SAMPLE_PATH) ? read(SAMPLE_PATH) : '';
  if (current !== next) {
    fs.writeFileSync(SAMPLE_PATH, next);
    console.log('Updated .codewiki/index.html');
    return true;
  }
  console.log('Sample wiki already up to date');
  return false;
}

if (require.main === module) {
  writeSample();
}

module.exports = {
  buildExpectedSample,
  writeSample,
};
