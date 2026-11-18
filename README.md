# tocsmith

> Generate, insert, and validate Markdown tables of contents — fast, dependency-free, and GitHub-accurate.

[![CI](https://github.com/DelmarMG91/tocsmith/actions/workflows/ci.yml/badge.svg)](https://github.com/DelmarMG91/tocsmith/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/tocsmith.svg)](https://www.npmjs.com/package/tocsmith)
[![license: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node >= 18](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

`tocsmith` reads a Markdown file, finds its ATX headings (`#`…`######`), and builds a
nested table of contents with anchors that match GitHub's slug algorithm — including
Unicode headings such as Chinese. It can print the TOC, write it back into the file
between `<!-- toc -->` / `<!-- /toc -->` markers, or fail CI when the committed TOC has
drifted.

It is plain ESM JavaScript with **zero runtime dependencies** and ships a complete
`node:test` suite.

## Features

- **Correct parsing** — skips `#` lines inside fenced code blocks (``` and `~~~`) and
  inline-code spans, and ignores any stale TOC already sitting between the markers.
- **GitHub-compatible slugs** — lowercasing, HTML-tag stripping, punctuation removal,
  space-to-hyphen conversion, Unicode-aware (中文标题可用), and `-1` / `-2` de-duplication
  for repeated headings.
- **Three modes** — print to stdout (default), `--insert` to update the file in place,
  `--check` to verify it (exit `1` on drift, perfect for CI).
- **Configurable** — limit depth with `--max-depth`, choose the bullet with `--bullet`.
- **Idempotent** — running `--insert` twice produces byte-identical output.
- **No dependencies** — nothing to audit, nothing to break.

## Install

```bash
# Global install
npm install -g tocsmith

# Or run without installing
npx tocsmith README.md
```

Requires Node.js 18 or newer.

## Quick Start

Given a `README.md` like this:

```markdown
# tocsmith

A small tool.

## Features

### Fast

### Tiny

## Install

## Usage
```

Print the generated table of contents:

```bash
tocsmith README.md
```

```markdown
- [tocsmith](#tocsmith)
  - [Features](#features)
    - [Fast](#fast)
    - [Tiny](#tiny)
  - [Install](#install)
  - [Usage](#usage)
```

Write it into the document instead — a marked block is inserted before the first
heading:

```bash
tocsmith README.md --insert
# README.md: TOC inserted (6 entries)
```

The file now begins with:

```markdown
<!-- toc -->
- [tocsmith](#tocsmith)
  - [Features](#features)
    - [Fast](#fast)
    - [Tiny](#tiny)
  - [Install](#install)
  - [Usage](#usage)
<!-- /toc -->

# tocsmith
...
```

Verify it stays in sync (useful locally and in CI):

```bash
tocsmith README.md --check
# README.md: TOC is up to date   (exit 0)
```

When the document changes and the TOC is stale, `--check` prints a diff and exits `1`:

```diff
--- existing TOC
+++ generated TOC
-- [old](#old)
+- [tocsmith](#tocsmith)
+  - [Features](#features)
```

## Usage

```
tocsmith <file> [options]
```

### Options

| Option            | Default | Description                                                             |
| ----------------- | ------- | ----------------------------------------------------------------------- |
| `--max-depth <n>` | `6`     | Deepest heading level to include. Valid range is `1`–`6`.               |
| `--bullet <char>` | `-`     | Bullet character for each entry. Must be `-` or `*`.                    |
| `--insert`        | off     | Insert or replace the TOC block in the file, in place.                  |
| `--check`         | off     | Compare the stored TOC with a fresh one; exit `1` if it is out of date. |
| `--stdout`        | off     | Print the generated TOC even when `--insert` is used.                   |
| `-h`, `--help`    | —       | Show help and exit.                                                     |
| `-v`, `--version` | —       | Print the version and exit.                                             |

`--insert` and `--check` cannot be combined.

### Exit codes

| Code | Meaning                                                        |
| ---- | -------------------------------------------------------------- |
| `0`  | Success (and, for `--check`, the TOC is up to date).           |
| `1`  | `--check` found a stale or missing TOC.                        |
| `2`  | Usage error, unreadable file, or invalid option value.         |

### Behavior notes

- **Slug rules** follow GitHub: lowercase, strip HTML tags and punctuation, turn spaces
  into hyphens, and append `-1`, `-2`, … to repeated headings. Letters from any script
  are preserved, so `## 快速开始` becomes `#快速开始`.
- **Indentation** is relative to the shallowest included heading, two spaces per level.
  With `--max-depth 2` a document that starts at `##` will not be indented under an
  invisible level.
- **Markers** are the literal lines `<!-- toc -->` and `<!-- /toc -->`. If both exist,
  only the content between them is replaced; everything else is left untouched.

## GitHub Actions

Keep your README's table of contents honest on every pull request:

```yaml
name: Check TOC

on:
  pull_request:
  push:
    branches: [main]

jobs:
  toc:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npx tocsmith README.md --check
```

If a contributor edits headings without regenerating the TOC, the job fails with a diff
showing exactly what is missing.

## Development

```bash
git clone https://github.com/DelmarMG91/tocsmith.git
cd tocsmith
npm install          # no runtime deps; this only wires up local tooling
npm test             # runs the node:test suite
npm run test:watch   # re-run on change
```

The test suite covers the parser (heading levels, code-fence and inline-code skipping,
TOC-block handling), the slugger (punctuation, duplicates, Unicode, HTML), TOC
generation (nesting, depth limits, bullets, insertion, idempotency), and the CLI
end-to-end (help, version, stdout, insert, check).

## Contributing

Issues and pull requests are welcome. Please run `npm test` before opening a PR and keep
the suite green. Bug reports that include a minimal Markdown repro are especially
helpful.

## License

[MIT](LICENSE) © 2025 DelmarMG91
