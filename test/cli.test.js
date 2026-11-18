import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BIN = fileURLToPath(new URL('../bin/tocsmith.js', import.meta.url));
const ROOT = fileURLToPath(new URL('..', import.meta.url));

function runCli(args, options = {}) {
  return spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    ...options,
  });
}

function withTempFile(content, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'tocsmith-'));
  const file = join(dir, 'notes.md');
  writeFileSync(file, content);
  try {
    return fn(file);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('--help prints usage and exits 0', () => {
  const result = runCli(['--help']);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:/);
  assert.match(result.stdout, /--max-depth/);
  assert.match(result.stdout, /--insert/);
  assert.match(result.stdout, /--check/);
});

test('--version prints the package version', () => {
  const result = runCli(['--version']);
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));

  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), pkg.version);
  assert.equal(pkg.version, '0.1.0');
});

test('default mode prints the generated TOC to stdout', () => {
  withTempFile('# Guide\n\n## Install\n\n### npm\n', (file) => {
    const result = runCli([file]);

    assert.equal(result.status, 0);
    assert.equal(
      result.stdout.trimEnd(),
      ['- [Guide](#guide)', '  - [Install](#install)', '    - [npm](#npm)'].join('\n'),
    );
  });
});

test('--max-depth and --bullet are applied', () => {
  withTempFile('# A\n## B\n### C\n', (file) => {
    const result = runCli([file, '--max-depth', '2', '--bullet', '*']);

    assert.equal(result.status, 0);
    assert.equal(result.stdout.trimEnd(), ['* [A](#a)', '  * [B](#b)'].join('\n'));
  });
});

test('--insert writes a marked block into the file and reports the change', () => {
  withTempFile('# Doc\n\n## Child\n', (file) => {
    const result = runCli([file, '--insert']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /TOC inserted \(2 entries\)/);

    const content = readFileSync(file, 'utf8');
    assert.ok(
      content.startsWith('<!-- toc -->\n- [Doc](#doc)\n  - [Child](#child)\n<!-- /toc -->'),
    );
    assert.ok(content.includes('# Doc\n\n## Child'));
  });
});

test('--insert is idempotent and reports no changes the second time', () => {
  withTempFile('# Doc\n\n## Child\n', (file) => {
    runCli([file, '--insert']);
    const first = readFileSync(file, 'utf8');
    const second = runCli([file, '--insert']);

    assert.equal(second.status, 0);
    assert.match(second.stdout, /no changes/);
    assert.equal(readFileSync(file, 'utf8'), first);
  });
});

test('--check exits 0 for an up-to-date TOC', () => {
  withTempFile('# Doc\n\n## Child\n', (file) => {
    runCli([file, '--insert']);
    const result = runCli([file, '--check']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /TOC is up to date/);
  });
});

test('--check exits 1 and prints a diff for a stale TOC', () => {
  withTempFile('<!-- toc -->\n- [Wrong](#wrong)\n<!-- /toc -->\n\n# Doc\n', (file) => {
    const result = runCli([file, '--check']);

    assert.equal(result.status, 1);
    assert.match(result.stdout, /^--- existing TOC$/m);
    assert.match(result.stdout, /^-- \[Wrong\]\(#wrong\)$/m);
    assert.match(result.stdout, /^\+- \[Doc\]\(#doc\)$/m);
    assert.match(result.stderr, /TOC is out of date/);
  });
});

test('missing file exits with code 2 and a clear message', () => {
  const result = runCli(['this-file-does-not-exist.md']);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /cannot read/);
});

test('invalid --bullet exits with code 2', () => {
  withTempFile('# Doc\n', (file) => {
    const result = runCli([file, '--bullet', '+']);

    assert.equal(result.status, 2);
    assert.match(result.stderr, /--bullet must be/);
  });
});

test('--insert --stdout also prints the generated TOC', () => {
  withTempFile('# Doc\n', (file) => {
    const result = runCli([file, '--insert', '--stdout']);

    assert.equal(result.status, 0);
    assert.match(result.stdout, /TOC inserted/);
    assert.match(result.stdout, /- \[Doc\]\(#doc\)/);
  });
});
