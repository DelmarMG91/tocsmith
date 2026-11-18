import test from 'node:test';
import assert from 'node:assert/strict';

import { parseHeadings, extractTocBlock } from '../src/parser.js';

test('parses nested ATX headings with levels and line numbers', () => {
  const md = ['# Title', '', 'Some text', '## Section A', '### Detail', '## Section B'].join('\n');
  const headings = parseHeadings(md);

  assert.equal(headings.length, 4);
  assert.deepEqual(
    headings.map((h) => [h.level, h.text, h.line]),
    [
      [1, 'Title', 1],
      [2, 'Section A', 4],
      [3, 'Detail', 5],
      [2, 'Section B', 6],
    ],
  );
});

test('skips hash lines inside backtick fenced code blocks', () => {
  const md = [
    '# Real',
    '```bash',
    '# not a heading',
    '## also not a heading',
    '```',
    '## Real too',
  ].join('\n');

  assert.deepEqual(
    parseHeadings(md).map((h) => h.text),
    ['Real', 'Real too'],
  );
});

test('skips hash lines inside tilde fences, including longer closing fences', () => {
  const md = ['# Top', '~~~markdown', '# nope', '~~~~~', '## Kept'].join('\n');

  assert.deepEqual(
    parseHeadings(md).map((h) => h.text),
    ['Top', 'Kept'],
  );
});

test('does not treat inline-code lines as headings', () => {
  const md = ['# Real', '`# code, not a heading`', '  `## still code`'].join('\n');

  assert.deepEqual(
    parseHeadings(md).map((h) => h.text),
    ['Real'],
  );
});

test('ignores existing content between toc markers', () => {
  const md = [
    '# Doc',
    '<!-- toc -->',
    '# Stale entry',
    '<!-- /toc -->',
    '## After',
  ].join('\n');

  assert.deepEqual(
    parseHeadings(md).map((h) => h.text),
    ['Doc', 'After'],
  );
});

test('strips closing hashes and rejects malformed heading lines', () => {
  const md = ['## Closed ##', '#NoSpace', '####### seven', '   ### Indented ###   '].join('\n');
  const headings = parseHeadings(md);

  assert.deepEqual(
    headings.map((h) => [h.level, h.text]),
    [
      [2, 'Closed'],
      [3, 'Indented'],
    ],
  );
});

test('extractTocBlock returns the content between markers', () => {
  const md = ['# A', '<!-- toc -->', '- [A](#a)', '', '<!-- /toc -->', 'text'].join('\n');
  const block = extractTocBlock(md);

  assert.equal(block.found, true);
  assert.equal(block.startLine, 1);
  assert.equal(block.endLine, 4);
  assert.equal(block.content.trim(), '- [A](#a)');
});

test('extractTocBlock reports a missing block', () => {
  const block = extractTocBlock('# A\n\nbody\n');

  assert.equal(block.found, false);
  assert.equal(block.content, '');
});
