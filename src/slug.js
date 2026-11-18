/**
 * GitHub-flavoured heading slugs.
 *
 * Rules applied, in order:
 *   1. strip HTML tags
 *   2. strip inline-code backticks
 *   3. lowercase
 *   4. remove punctuation and symbols (Unicode letters, digits and marks survive)
 *   5. collapse whitespace runs into single hyphens
 *   6. de-duplicate with `-1`, `-2`, ... suffixes
 */

const HTML_TAG = /<[^>]*>/g;
const NON_SLUG = /[^\p{L}\p{N}\p{M}\s_-]/gu;

/**
 * Turn a heading's text into a base GitHub-style slug (no de-duplication).
 *
 * @param {string} text Heading text.
 * @returns {string} Slug, or `"section"` when nothing printable remains.
 */
export function slugify(text) {
  let slug = String(text ?? '')
    .replace(HTML_TAG, '')
    .replace(/`/g, '')
    .toLowerCase()
    .replace(NON_SLUG, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (slug.length === 0) return 'section';
  return slug;
}

/**
 * Create a stateful slugger that appends `-1`, `-2`, ... to repeated headings,
 * mirroring GitHub's anchor generation across a single document.
 *
 * @returns {(text: string) => string} A slug function bound to its own seen-map.
 */
export function createSlugger() {
  const seen = new Map();

  return function nextSlug(text) {
    const base = slugify(text);
    if (!seen.has(base)) {
      seen.set(base, 0);
      return base;
    }

    let count = seen.get(base);
    let candidate;
    do {
      count += 1;
      candidate = `${base}-${count}`;
    } while (seen.has(candidate));

    seen.set(base, count);
    seen.set(candidate, 0);
    return candidate;
  };
}

/**
 * Convenience helper for one-off documents: slug every heading text in order.
 *
 * @param {string[]} texts Heading texts in document order.
 * @returns {string[]} Slugs aligned with the input array.
 */
export function slugAll(texts) {
  const nextSlug = createSlugger();
  return texts.map((text) => nextSlug(text));
}
