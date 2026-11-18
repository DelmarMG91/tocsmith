/**
 * TOC generation, insertion and validation.
 */

import { parseHeadings, extractTocBlock } from './parser.js';
import { createSlugger } from './slug.js';

export const TOC_START = '<!-- toc -->';
export const TOC_END = '<!-- /toc -->';
export const DEFAULT_BULLET = '-';
export const DEFAULT_MAX_DEPTH = 6;
export const MIN_HEADING_LEVEL = 1;
export const MAX_HEADING_LEVEL = 6;

/**
 * Render a list of headings as a nested Markdown bullet list.
 *
 * @param {{ level: number, text: string, line: number }[]} headings
 * @param {{ maxDepth?: number, bullet?: string }} [options]
 * @returns {string} TOC body without marker lines; empty string when nothing qualifies.
 */
export function buildToc(headings, options = {}) {
  const { maxDepth = DEFAULT_MAX_DEPTH, bullet = DEFAULT_BULLET } = options;

  // Slugs are computed across every heading so numbering matches GitHub anchors,
  // even when deeper headings are filtered out of the rendered list.
  const nextSlug = createSlugger();
  const withSlugs = headings.map((heading) => ({
    ...heading,
    slug: nextSlug(heading.text),
  }));

  const included = withSlugs.filter((heading) => heading.level <= maxDepth);
  if (included.length === 0) return '';

  const baseLevel = Math.min(...included.map((heading) => heading.level));

  return included
    .map((heading) => {
      const indent = '  '.repeat(heading.level - baseLevel);
      const label = heading.text.replace(/[[\]]/g, '\\$&');
      return `${indent}${bullet} [${label}](#${heading.slug})`;
    })
    .join('\n');
}

/**
 * Parse `markdown` and build its TOC body.
 *
 * @param {string} markdown
 * @param {{ maxDepth?: number, bullet?: string }} [options]
 * @returns {string}
 */
export function generateToc(markdown, options = {}) {
  return buildToc(parseHeadings(markdown), options);
}

/**
 * Insert or replace the TOC block inside `markdown`.
 *
 * - When `<!-- toc -->` / `<!-- /toc -->` exist, the space between them is replaced.
 * - Otherwise a fresh marked block is inserted before the first heading (or at the
 *   very top when the document has no headings).
 *
 * @param {string} markdown
 * @param {{ maxDepth?: number, bullet?: string }} [options]
 * @returns {{ content: string, action: 'inserted' | 'replaced' | 'unchanged', toc: string }}
 */
export function insertToc(markdown, options = {}) {
  const source = String(markdown ?? '');
  const eol = source.includes('\r\n') ? '\r\n' : '\n';
  const toc = generateToc(source, options);
  const tocLines = toc === '' ? [] : toc.split('\n');
  const blockLines = [TOC_START, ...tocLines, TOC_END];

  const existing = extractTocBlock(source);
  const lines = source === '' ? [] : source.split(/\r?\n/);

  if (existing.found) {
    const next = [
      ...lines.slice(0, existing.startLine + 1),
      ...tocLines,
      ...lines.slice(existing.endLine),
    ].join(eol);
    return {
      content: next,
      action: next === source ? 'unchanged' : 'replaced',
      toc,
    };
  }

  const insertAt = lines.length > 0 ? (parseHeadings(source)[0]?.line ?? 1) - 1 : 0;
  const before = lines.slice(0, insertAt);
  const after = lines.slice(insertAt);
  const nextLines =
    before.length > 0
      ? [...before, '', ...blockLines, '', ...after]
      : [...blockLines, '', ...after];

  return {
    content: nextLines.join(eol),
    action: 'inserted',
    toc,
  };
}

const normalizeToc = (text) =>
  String(text ?? '')
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .join('\n')
    .trim();

/**
 * Compare the TOC stored in `markdown` with a freshly generated one.
 *
 * @param {string} markdown
 * @param {{ maxDepth?: number, bullet?: string }} [options]
 * @returns {{ ok: boolean, expected: string, actual: string | null, diff: string }}
 */
export function checkToc(markdown, options = {}) {
  const expected = generateToc(markdown, options);
  const existing = extractTocBlock(markdown);
  const actual = existing.found ? normalizeToc(existing.content) : null;
  const ok = actual !== null && actual === normalizeToc(expected);
  return {
    ok,
    expected,
    actual,
    diff: ok ? '' : formatDiff(normalizeToc(expected), actual ?? ''),
  };
}

/**
 * Minimal LCS-based line diff used by `--check`.
 *
 * @param {string} expected
 * @param {string} actual
 * @returns {string} Diff text with `-`/`+` markers.
 */
export function formatDiff(expected, actual) {
  // `-` lines are what the file currently contains, `+` lines are what it should contain.
  const a = actual === '' ? [] : actual.split('\n');
  const b = expected === '' ? [] : expected.split('\n');
  const rows = a.length;
  const cols = b.length;

  const table = Array.from({ length: rows + 1 }, () => new Uint32Array(cols + 1));
  for (let i = rows - 1; i >= 0; i -= 1) {
    for (let j = cols - 1; j >= 0; j -= 1) {
      table[i][j] =
        a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }

  const out = ['--- existing TOC', '+++ generated TOC'];
  let i = 0;
  let j = 0;
  while (i < rows && j < cols) {
    if (a[i] === b[j]) {
      out.push(` ${a[i]}`);
      i += 1;
      j += 1;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      out.push(`-${a[i]}`);
      i += 1;
    } else {
      out.push(`+${b[j]}`);
      j += 1;
    }
  }
  while (i < rows) {
    out.push(`-${a[i]}`);
    i += 1;
  }
  while (j < cols) {
    out.push(`+${b[j]}`);
    j += 1;
  }
  return out.join('\n');
}
