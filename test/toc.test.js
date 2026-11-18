import test from 'node:test';
import assert from 'node:assert/strict';

import { parseHeadings } from '../src/parser.js';
import { buildToc, generateToc, insertToc, checkToc, TOC_START, TOC_END } from '../src/toc.js';

const sample = ['# Guide', '', '## Install', '### From npm', '## Usage', '### Options'].join('\n');

test('builds a nested list indented relative to the shallowest heading', () => {
  const toc = buildToc(parseHeadings(sample));

  assert.equal(
    toc,
    [
      '- [Guide](#guide)',
      '  - [Install](#install)',
      '    - [From npm](#from-npm)',
      '  - [Usage](#usage)',
      '    - [Options](#options)',
    ].join('\n'),
  );
});

test('max-depth filters deeper headings', () => {
  const toc = buildToc(parseHeadings(sample), { maxDepth: 2 });

  assert.equal(
    toc,
    ['- [Guide](#guide)', '  - [Install](#install)', '  - [Usage](#usage)'].join('\n'),
  );
});

test('supports an asterisk bullet', () => {
  const toc = buildToc(parseHeadings('# A\n## B\n'), { bullet: '*' });

  assert.equal(toc, ['* [A](#a)', '  * [B](#b)'].join('\n'));
});

test('numbers duplicate anchors across filtered headings', () => {
  const md = ['# Intro', '## Intro', '# Intro'].join('\n');
  const toc = buildToc(parseHeadings(md), { maxDepth: 1 });

  assert.equal(toc, ['- [Intro](#intro)', '- [Intro](#intro-2)'].join('\n'));
});

test('replaces an existing marker block in place', () => {
  const md = ['# Doc', '', TOC_START, '- [Old](#old)', TOC_END, '', '## New section'].join('\n');
  const result = insertToc(md);

  assert.equal(result.action, 'replaced');
  assert.ok(result.content.includes(`${TOC_START}\n- [Doc](#doc)\n  - [New section](#new-section)\n${TOC_END}`));
  assert.ok(!result.content.includes('[Old](#old)'));
});

test('inserts a marked block before the first heading when none exists', () => {
  const md = ['# Doc', '', 'Body text.'].join('\n');
  const result = insertToc(md);

  assert.equal(result.action, 'inserted');
  assert.equal(
    result.content,
    [TOC_START, '- [Doc](#doc)', TOC_END, '', '# Doc', '', 'Body text.'].join('\n'),
  );
});

test('inserts into an empty file without crashing', () => {
  const result = insertToc('');

  assert.equal(result.action, 'inserted');
  assert.equal(result.content, `${TOC_START}\n${TOC_END}\n`);
});

test('is idempotent: inserting twice produces the same file', () => {
  const first = insertToc('# Doc\n\n## Child\n');
  const second = insertToc(first.content);

  assert.equal(second.action, 'unchanged');
  assert.equal(second.content, first.content);
});

test('checkToc passes for an up-to-date block', () => {
  const md = ['# Doc', TOC_START, '- [Doc](#doc)', '  - [Child](#child)', TOC_END, '## Child'].join('\n');
  const result = checkToc(md);

  assert.equal(result.ok, true);
  assert.equal(result.diff, '');
});

test('checkToc fails with a diff for a stale block', () => {
  const md = ['# Doc', TOC_START, '- [Wrong](#wrong)', TOC_END].join('\n');
  const result = checkToc(md);

  assert.equal(result.ok, false);
  assert.match(result.diff, /^-- \[Wrong\]\(#wrong\)$/m);
  assert.match(result.diff, /^\+- \[Doc\]\(#doc\)$/m);
});

test('checkToc fails when markers are missing', () => {
  const result = checkToc('# Doc\n');

  assert.equal(result.ok, false);
  assert.equal(result.actual, null);
  assert.match(result.diff, /\+- \[Doc\]\(#doc\)/);
});

test('empty documents and documents without headings produce an empty TOC', () => {
  assert.equal(generateToc(''), '');
  assert.equal(generateToc('Just a paragraph.\n\nAnother one.\n'), '');
});

test('CRLF documents keep CRLF line endings on insert', () => {
  const md = '# Doc\r\n\r\n## Child\r\n';
  const result = insertToc(md);

  assert.ok(result.content.includes(`${TOC_START}\r\n- [Doc](#doc)\r\n  - [Child](#child)\r\n${TOC_END}`));
  assert.ok(!/[^\r]\n/.test(result.content.replace(`${TOC_START}\n`, '')));
});

test('ignores headings inside fenced code when generating the TOC', () => {
  const md = ['# Doc', '```', '# Fake', '```', '## Real'].join('\n');
  const toc = generateToc(md);

  assert.ok(!toc.includes('Fake'));
  assert.ok(toc.includes('[Real](#real)'));
});
