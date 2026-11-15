import { appendFileSync, readFileSync } from 'node:fs';
import { classifyPullRequest } from './classify-pr.mjs';

const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
const token = process.env.GITHUB_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const prNumber = event.pull_request?.number;
if (!token || !repository || !prNumber) throw new Error('Missing GitHub token, repository, or pull request number.');

async function api(path) {
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  return response.json();
}

const files = [];
for (let page = 1; ; page++) {
  const batch = await api(`/pulls/${prNumber}/files?per_page=100&page=${page}`);
  files.push(...batch);
  if (batch.length < 100) break;
}
const result = classifyPullRequest(files);
const summary = [
  '# PR readiness',
  '',
  `**Decision:** ${result.eligible ? 'Low-risk candidate (dry-run only)' : 'Human review required'}`,
  `**Category:** ${result.category}`,
  `**Size:** ${result.changedFiles} files / ${result.changedLines} changed lines`,
  '',
  '## Reasons',
  ...result.reasons.map((reason) => `- ${reason}`),
  '',
  '> This check never authorizes a merge by itself. The privileged decision workflow re-fetches the PR and repeats every check from the default branch.'
].join('\n');
appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `eligible=${result.eligible}\ncategory=${result.category}\n`);
}
console.log(JSON.stringify(result));
