import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { motion } from './tokens';

/*
 * Keeps design values in the tokens (tokens.ts and globals.css) instead of scattered through
 * components. Layout values such as grid templates or a one-off max width are allowed; colours,
 * type, radii, shadows, layers and timing are not.
 */

const SRC = resolve(process.cwd(), 'src');

/** Not checked: the token files themselves, tests, and the landscape illustration (artwork, not UI). */
const EXCLUDED = [/^styles\//, /\.test\.tsx?$/, /^test\//, /^components\/brand\/landscape-art\.tsx$/];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const files = sourceFiles(SRC)
  .map((path) => ({ path, name: relative(SRC, path).replaceAll('\\', '/') }))
  .filter(({ name }) => !EXCLUDED.some((pattern) => pattern.test(name)));

function findAll(pattern: RegExp, keep: (match: RegExpMatchArray) => boolean = () => true): string[] {
  return files.flatMap(({ path, name }) =>
    readFileSync(path, 'utf8')
      .split('\n')
      .flatMap((line, index) =>
        [...line.matchAll(pattern)].filter(keep).map((match) => `${name}:${index + 1}  ${match[0]}`),
      ),
  );
}

describe('design system', () => {
  it('scans the source tree', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it('uses colour tokens instead of hex colours', () => {
    expect(findAll(/#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/gi)).toEqual([]);
  });

  it('uses theme tokens instead of arbitrary colour, type, radius, shadow, layer and timing values', () => {
    const arbitrary =
      /\b(?:text|leading|tracking|font|rounded(?:-[trblse]{1,2})?|shadow|inset-shadow|bg|from|via|to|border(?:-[trblxy])?|ring|outline|fill|stroke|opacity|z|scale|duration|delay|ease|animate)-\[[^\]]*\]/g;
    expect(findAll(arbitrary)).toEqual([]);
  });

  it('uses only the motion token durations', () => {
    const allowed = new Set(Object.values(motion.duration).map((seconds) => Math.round(seconds * 1000)));
    expect(findAll(/\bduration-(\d+)\b/g, (match) => !allowed.has(Number(match[1])))).toEqual([]);
  });
});
