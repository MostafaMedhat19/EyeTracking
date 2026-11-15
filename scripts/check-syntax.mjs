import { readdirSync, readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { extname, join, relative } from 'node:path';

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const files = ['js', 'scripts', 'tests']
  .filter((path) => { try { return statSync(path).isDirectory(); } catch { return false; } })
  .flatMap(walk)
  .filter((path) => ['.js', '.mjs'].includes(extname(path)));

let failed = false;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const result = spawnSync(process.execPath, ['--input-type=module', '--check'], {
    input: source,
    encoding: 'utf8'
  });
  if (result.status !== 0) {
    failed = true;
    console.error(`Syntax check failed: ${relative(process.cwd(), file)}`);
    console.error(result.stderr);
  }
}

if (failed) process.exit(1);
console.log(`Syntax check passed for ${files.length} JavaScript files.`);
