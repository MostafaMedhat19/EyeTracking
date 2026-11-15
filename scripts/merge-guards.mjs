export function evaluateMergeGuards({
  classification,
  headShaMatches,
  draft,
  state,
  mergeable,
  mergeableState,
  requiredWorkflows,
  unresolvedThreads,
  allThreadsVerified
}) {
  const reasons = [];
  if (!classification?.eligible) reasons.push(...(classification?.reasons || ['Risk classification did not pass.']));
  if (!headShaMatches) reasons.push('PR head SHA changed after checks started; rerun checks on the new commit.');
  if (draft) reasons.push('Pull request is still a draft.');
  if (state !== 'open') reasons.push(`Pull request is ${state || 'unknown'}, not open.`);
  if (mergeable !== true || ['dirty', 'blocked'].includes(mergeableState)) {
    reasons.push(`GitHub does not currently report the PR as safely mergeable (${mergeableState || 'unknown'}).`);
  }
  for (const [name, passed] of Object.entries(requiredWorkflows || {})) {
    if (!passed) reasons.push(`Required workflow has not succeeded for this exact SHA: ${name}.`);
  }
  if (!allThreadsVerified) reasons.push('Could not verify every review conversation.');
  if ((unresolvedThreads || 0) > 0) reasons.push('At least one review conversation is unresolved.');
  return [...new Set(reasons)];
}
