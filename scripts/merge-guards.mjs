export function evaluateMergeGuards({
  classification,
  headShaMatches,
  sourceRepositoryMatches,
  draft,
  state,
  mergeable,
  mergeableState,
  requiredWorkflows,
  requiredCheckNames = ['PR readiness', 'validate'],
  unresolvedThreads,
  allThreadsVerified
}) {
  const reasons = [];
  if (!classification?.eligible) reasons.push(...(classification?.reasons || ['Risk classification did not pass.']));
  if (!headShaMatches) reasons.push('PR head SHA changed after checks started; rerun checks on the new commit.');
  if (!sourceRepositoryMatches) reasons.push('Workflow source repository does not match the pull request head repository.');
  if (draft) reasons.push('Pull request is still a draft.');
  if (state !== 'open') reasons.push(`Pull request is ${state || 'unknown'}, not open.`);
  if (mergeable !== true || ['dirty', 'blocked'].includes(mergeableState)) {
    reasons.push(`GitHub does not currently report the PR as safely mergeable (${mergeableState || 'unknown'}).`);
  }
  for (const name of requiredCheckNames) {
    const passed = requiredWorkflows?.[name] === true;
    if (!passed) reasons.push(`Required workflow has not succeeded for this exact SHA: ${name}.`);
  }
  if (!allThreadsVerified) reasons.push('Could not verify every review conversation.');
  if ((unresolvedThreads || 0) > 0) reasons.push('At least one review conversation is unresolved.');
  return [...new Set(reasons)];
}
