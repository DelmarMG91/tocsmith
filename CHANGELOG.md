# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Nothing yet.

### Changed

- Nothing yet.

## [0.1.0] - 2025-01-01

### Added

- Markdown ATX heading parser that skips fenced code blocks, inline code spans, and
  existing TOC blocks.
- GitHub-compatible slug generation with Unicode support and `-1` / `-2` de-duplication
  for repeated headings.
- `tocsmith` CLI with `--max-depth`, `--bullet`, `--insert`, `--check`, `--stdout`,
  `--help`, and `--version`.
- In-place TOC insertion between `<!-- toc -->` / `<!-- /toc -->` markers, with
  automatic block creation when the markers are absent.
- CI-friendly `--check` mode that prints a diff and exits `1` when the stored TOC is
  out of date.
- Test suite built on `node:test` covering the parser, slugger, generator, and CLI.

[Unreleased]: https://github.com/DelmarMG91/tocsmith/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/DelmarMG91/tocsmith/releases/tag/v0.1.0
