import { readdir, readFile, stat } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'package.json', 'README.md', 'LICENSE', 'index.js', 'client.js',
  'cordis.patch.yml', 'locale/en.json', 'locale/zh.json', 'icon.svg',
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

try {
  for (const name of required) {
    if (!(await stat(join(root, name))).isFile()) throw new Error(`Not a file: ${name}`);
  }
  for (const path of await walk(root)) {
    const name = relative(root, path);
    if (/\.json$/i.test(name)) {
      try { JSON.parse(await readFile(path, 'utf8')); }
      catch (error) { throw new Error(`Invalid JSON in ${name}: ${error.message}`); }
      console.log(`JSON OK: ${name}`);
    } else if (/\.(?:js|mjs|cjs)$/i.test(name)) {
      const result = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
      if (result.error) throw result.error;
      if (result.status !== 0) throw new Error(`Invalid JS in ${name}:\n${result.stderr || result.stdout}`);
      console.log(`JS OK: ${name}`);
    }
  }
  console.log('Required release files OK.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
