/**
 * Markdown ATX heading parser.
 *
 * Extracts `#`-style headings while correctly ignoring:
 *   - lines inside fenced code blocks (``` or ~~~)
 *   - lines that are a single inline-code span (e.g. `` `# not a heading` ``)
 *   - anything between an existing `<!-- toc -->` / `<!-- /toc -->` block
 */

/** Fence opener: up to 3 leading spaces, 3+ backticks or tildes, optional info string. */
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})(.*)$/;
/** Fence closer: up to 3 leading spaces, 3+ of the same char, nothing else. */
const FENCE_CLOSE = /^ {0,3}(`{3,}|~{3,})[ \t]*$/;
/** ATX heading: up to 3 leading spaces, 1-6 hashes, then whitespace + text. */
const ATX = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
/** Optional closing sequence of hashes on a heading. */
const CLOSING = /[ \t]+#+$/;

export const TOC_START_RE = /^[ \t]*<!--\s*toc\s*-->[ \t]*$/;
export const TOC_END_RE = /^[ \t]*<!--\s*\/toc\s*-->[ \t]*$/;

/**
 * Parse ATX headings from a Markdown document.
 *
 * @param {string} markdown Raw Markdown source.
 * @param {{ ignoreTocBlock?: boolean }} [options]
 * @returns {{ level: number, text: string, line: number }[]} Headings in document order.
 */
export function parseHeadings(markdown, options = {}) {
  const { ignoreTocBlock = true } = options;
  const lines = String(markdown ?? '').split(/\r?\n/);
  const headings = [];

  /** @type {{ char: string, len: number } | null} */
  let fence = null;
  let inToc = false;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];

    if (inToc) {
      if (TOC_END_RE.test(raw)) inToc = false;
      continue;
    }

    if (ignoreTocBlock && TOC_START_RE.test(raw)) {
      inToc = true;
      continue;
    }

    if (fence) {
      const close = FENCE_CLOSE.exec(raw);
      if (close && close[1][0] === fence.char && close[1].length >= fence.len) {
        fence = null;
      }
      continue;
    }

    const open = FENCE_OPEN.exec(raw);
    // A backtick fence may not contain a backtick in its info string.
    if (open && !(open[1][0] === '`' && open[2].includes('`'))) {
      fence = { char: open[1][0], len: open[1].length };
      continue;
    }

    // A line that begins with an inline-code span is not a heading.
    if (/^ {0,3}`/.test(raw)) continue;

    const match = ATX.exec(raw);
    if (!match) continue;

    const text = (match[2] ?? '').replace(CLOSING, '').trim();
    headings.push({ level: match[1].length, text, line: i + 1 });
  }

  return headings;
}

/**
 * Locate the existing TOC block delimited by `<!-- toc -->` / `<!-- /toc -->`.
 *
 * @param {string} markdown Raw Markdown source.
 * @returns {{ found: boolean, startLine: number, endLine: number, content: string }}
 *   Line numbers are zero-based; `content` is the text strictly between the markers.
 */
export function extractTocBlock(markdown) {
  const lines = String(markdown ?? '').split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (TOC_START_RE.test(lines[i])) {
      start = i;
      break;
    }
  }
  if (start === -1) {
    return { found: false, startLine: -1, endLine: -1, content: '' };
  }
  for (let j = start + 1; j < lines.length; j++) {
    if (TOC_END_RE.test(lines[j])) {
      return {
        found: true,
        startLine: start,
        endLine: j,
        content: lines.slice(start + 1, j).join('\n'),
      };
    }
  }
  return { found: false, startLine: start, endLine: -1, content: '' };
}
