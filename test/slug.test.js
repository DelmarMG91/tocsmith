import test from 'node:test';
import assert from 'node:assert/strict';

import { slugify, createSlugger, slugAll } from '../src/slug.js';

test('lowercases, strips punctuation and turns spaces into hyphens', () => {
  assert.equal(slugify('Hello, World!'), 'hello-world');
  assert.equal(slugify('  Multiple   Spaces  '), 'multiple-spaces');
  assert.equal(slugify('C++ & Rust: A Comparison'), 'c-rust-a-comparison');
});

test('removes HTML tags but keeps their text', () => {
  assert.equal(slugify('Hello <em>World</em>'), 'hello-world');
  assert.equal(slugify('<code>parse()</code>'), 'parse');
});

test('strips inline-code backticks', () => {
  assert.equal(slugify('Use `parseHeadings()` here'), 'use-parseheadings-here');
});

test('appends -1 and -2 to duplicate headings', () => {
  const next = createSlugger();
  assert.equal(next('Overview'), 'overview');
  assert.equal(next('Overview'), 'overview-1');
  assert.equal(next('Overview'), 'overview-2');
});

test('avoids collisions with natural numbered headings', () => {
  const next = createSlugger();
  assert.equal(next('Fix'), 'fix');
  assert.equal(next('Fix 1'), 'fix-1');
  assert.equal(next('Fix'), 'fix-2');
});

test('keeps Unicode letters so Chinese headings produce usable anchors', () => {
  assert.equal(slugify('快速开始'), '快速开始');
  assert.equal(slugify('安装与使用 指南'), '安装与使用-指南');
  assert.equal(slugify('你好，世界！'), '你好世界');
});

test('falls back to "section" when nothing printable remains', () => {
  assert.equal(slugify('***'), 'section');
  assert.equal(slugify(''), 'section');
  assert.equal(slugify('😀😀'), 'section');
});

test('slugAll numbers duplicates in document order', () => {
  assert.deepEqual(slugAll(['Intro', 'Intro', 'Usage', 'Intro']), [
    'intro',
    'intro-1',
    'usage',
    'intro-2',
  ]);
});
