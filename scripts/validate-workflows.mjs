import { readdirSync, readFileSync } from 'node:fs';
import { parseDocument } from 'yaml';

const directory = '.github/workflows';
const files = readdirSync(directory).filter((name) => /\.ya?ml$/i.test(name));
for (const file of files) {
  const document = parseDocument(readFileSync(`${directory}/${file}`, 'utf8'), { prettyErrors: true });
  if (document.errors.length) {
    console.error(`${file}:`);
    for (const error of document.errors) console.error(error.message);
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log(`Workflow YAML parsed successfully: ${files.join(', ')}`);
