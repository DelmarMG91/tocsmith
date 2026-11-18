/**
 * Command-line interface for tocsmith.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { buildToc, checkToc, insertToc, DEFAULT_BULLET, MAX_HEADING_LEVEL } from './toc.js';
import { parseHeadings } from './parser.js';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

export const VERSION = pkg.version;

const USAGE = `tocsmith ${VERSION} — generate and validate Markdown tables of contents

Usage:
  tocsmith <file> [options]

Options:
  --max-depth <n>   Deepest heading level to include (1-6)          [default: 6]
  --bullet <char>   Bullet for TOC entries: "-" or "*"             [default: "-"]
  --insert          Insert or replace the TOC in <file> (in place)
  --check           Exit 1 when the TOC in <file> is out of date
  --stdout          Print the generated TOC even with --insert
  -h, --help        Show this help
  -v, --version     Print the version

Examples:
  tocsmith README.md
  tocsmith README.md --max-depth 3
  tocsmith README.md --insert
  tocsmith README.md --check
`;

/** An error caused by invalid CLI input (reported without a stack trace). */
export class UsageError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(message);
    this.name = 'UsageError';
  }
}

function parseDepth(value) {
  const depth = Number(value);
  if (!Number.isInteger(depth) || depth < 1 || depth > MAX_HEADING_LEVEL) {
    throw new UsageError(`--max-depth must be an integer between 1 and ${MAX_HEADING_LEVEL}`);
  }
  return depth;
}

function parseBullet(value) {
  if (value !== '-' && value !== '*') {
    throw new UsageError('--bullet must be "-" or "*"');
  }
  return value;
}

/**
 * Parse CLI arguments.
 *
 * @param {string[]} argv Arguments after the executable (no node/script entries).
 * @returns {{
 *   file: string | null,
 *   maxDepth: number,
 *   bullet: string,
 *   insert: boolean,
 *   check: boolean,
 *   stdout: boolean,
 *   help: boolean,
 *   version: boolean,
 * }}
 */
export function parseArgs(argv) {
  const options = {
    file: null,
    maxDepth: 6,
    bullet: DEFAULT_BULLET,
    insert: false,
    check: false,
    stdout: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (arg === '-v' || arg === '--version') {
      options.version = true;
    } else if (arg === '--insert') {
      options.insert = true;
    } else if (arg === '--check') {
      options.check = true;
    } else if (arg === '--stdout') {
      options.stdout = true;
    } else if (arg === '--max-depth') {
      options.maxDepth = parseDepth(argv[++i]);
    } else if (arg.startsWith('--max-depth=')) {
      options.maxDepth = parseDepth(arg.slice('--max-depth='.length));
    } else if (arg === '--bullet') {
      options.bullet = parseBullet(argv[++i]);
    } else if (arg.startsWith('--bullet=')) {
      options.bullet = parseBullet(arg.slice('--bullet='.length));
    } else if (arg.startsWith('-') && arg !== '-') {
      throw new UsageError(`Unknown option: ${arg}`);
    } else if (options.file === null) {
      options.file = arg;
    } else {
      throw new UsageError(`Unexpected argument: ${arg}`);
    }
  }

  if (options.insert && options.check) {
    throw new UsageError('--insert and --check cannot be used together');
  }

  return options;
}

/**
 * Run the CLI.
 *
 * @param {string[]} argv Arguments after the executable.
 * @param {{ stdout: (text: string) => void, stderr: (text: string) => void }} io
 * @returns {number} Process exit code.
 */
export function run(argv, io) {
  const out = (text) => io.stdout(`${text}\n`);
  const err = (text) => io.stderr(`${text}\n`);

  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      err(`tocsmith: ${error.message}`);
      err('Run "tocsmith --help" for usage.');
      return 2;
    }
    throw error;
  }

  if (options.help) {
    out(USAGE);
    return 0;
  }
  if (options.version) {
    out(VERSION);
    return 0;
  }
  if (options.file === null) {
    err('tocsmith: missing <file> argument');
    err('Run "tocsmith --help" for usage.');
    return 2;
  }

  let markdown;
  try {
    markdown = readFileSync(options.file, 'utf8');
  } catch (error) {
    err(`tocsmith: cannot read ${options.file}: ${error.message}`);
    return 2;
  }

  const name = basename(options.file);
  const tocOptions = { maxDepth: options.maxDepth, bullet: options.bullet };

  if (options.check) {
    const result = checkToc(markdown, tocOptions);
    if (result.ok) {
      out(`${name}: TOC is up to date`);
      return 0;
    }
    if (result.actual === null) {
      err(`${name}: no <!-- toc --> / <!-- /toc --> block found`);
    } else {
      out(result.diff);
    }
    err(`${name}: TOC is out of date`);
    return 1;
  }

  if (options.insert) {
    const result = insertToc(markdown, tocOptions);
    if (result.action !== 'unchanged') {
      writeFileSync(options.file, result.content);
    }
    const entries = result.toc === '' ? 0 : result.toc.split('\n').length;
    const verb =
      result.action === 'unchanged'
        ? 'no changes'
        : result.action === 'replaced'
          ? 'TOC replaced'
          : 'TOC inserted';
    out(`${name}: ${verb} (${entries} ${entries === 1 ? 'entry' : 'entries'})`);
    if (options.stdout) out(result.toc);
    return 0;
  }

  const headings = parseHeadings(markdown);
  const toc = buildToc(headings, tocOptions);
  if (toc !== '') out(toc);
  return 0;
}
