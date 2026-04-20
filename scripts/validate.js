const fs = require('fs');
const path = require('path');

const { buildExpectedSample } = require('./refresh-sample');

const ROOT = path.resolve(__dirname, '..');

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function validateRequiredFiles() {
  [
    'SKILL.md',
    'README.md',
    'SECURITY.md',
    'package.json',
    '.gitignore',
    '.codewiki/index.html',
    'agents/openai.yaml',
    'scripts/refresh-sample.js',
    '.github/workflows/validate.yml',
  ].forEach((relPath) => {
    assert(fs.existsSync(path.join(ROOT, relPath)), `Missing required file: ${relPath}`);
  });
}

function validateSkillFrontmatter() {
  const skill = read('SKILL.md');
  assert(skill.startsWith('---\n'), 'SKILL.md must start with YAML frontmatter');
  assert(/^name:\s*codewiki$/m.test(skill), 'SKILL.md frontmatter must declare name: codewiki');
  assert(/^description:\s*.+$/m.test(skill), 'SKILL.md frontmatter must declare a description');
  assert(/## Mission/.test(skill), 'SKILL.md must define a Mission section');
  assert(/## Important guidelines/.test(skill), 'SKILL.md must define Important guidelines');
}

function validatePackageMetadata() {
  const pkg = JSON.parse(read('package.json'));
  assert(pkg.name === 'codewiki', 'package.json name must be codewiki');
  assert(pkg.repository && /susumutomita\/codewiki/.test(pkg.repository.url), 'package.json repository.url must point to susumutomita/codewiki');
  assert(pkg.homepage === 'https://susumutomita.github.io/codewiki', 'package.json homepage must point to the GitHub Pages site');
  assert(pkg.scripts && pkg.scripts.validate === 'node scripts/validate.js', 'package.json must expose npm run validate');
  assert(pkg.scripts && pkg.scripts['refresh-sample'] === 'node scripts/refresh-sample.js', 'package.json must expose npm run refresh-sample');
}

function validateGitignore() {
  const gitignore = read('.gitignore');
  assert(/^\.codewiki\/$/m.test(gitignore), '.gitignore must ignore .codewiki/');
}

function validateReadme() {
  const readme = read('README.md');
  assert(/## Install/.test(readme), 'README.md must document installation');
  assert(/## Maintainer Quality Gates/.test(readme), 'README.md must document maintainer quality gates');
  assert(/npm run validate/.test(readme), 'README.md must mention npm run validate');
}

function validateOpenaiYaml() {
  const openaiYaml = read('agents/openai.yaml');
  assert(/display_name:\s*"codewiki"/.test(openaiYaml), 'agents/openai.yaml must set display_name');
  assert(/default_prompt:\s*"Use \$codewiki/.test(openaiYaml), 'agents/openai.yaml default_prompt must mention $codewiki');
  assert(/allow_implicit_invocation:\s*true/.test(openaiYaml), 'agents/openai.yaml must allow implicit invocation');
}

function validateWorkflow() {
  const workflow = read('.github/workflows/validate.yml');
  assert(/npm run validate/.test(workflow), 'CI workflow must run npm run validate');
  assert(/pull_request:/.test(workflow), 'CI workflow must run on pull_request');
  assert(/push:/.test(workflow), 'CI workflow must run on push');
}

function validateSampleSnapshot() {
  const sample = read('.codewiki/index.html');
  const expected = buildExpectedSample(sample);
  assert(sample === expected, 'Sample wiki is stale. Run npm run refresh-sample.');
}

function main() {
  validateRequiredFiles();
  validateSkillFrontmatter();
  validatePackageMetadata();
  validateGitignore();
  validateReadme();
  validateOpenaiYaml();
  validateWorkflow();
  validateSampleSnapshot();
  console.log('Validation passed');
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
