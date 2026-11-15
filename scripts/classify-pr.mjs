const DOC_ALLOWLIST = [
  /^README\.md$/,
  /^ROADMAP\.md$/,
  /^docs\/.+\.md$/
];
const CSS_ALLOWLIST = [/^css\/(style|accessibility)\.css$/];
const JS_ALLOWLIST = [/^js\/suggestions\.js$/];

const ALWAYS_MANUAL = [
  /^\.github\//,
  /^CODEOWNERS$/,
  /^CONTRIBUTING\.md$/,
  /^SECURITY\.md$/,
  /^GOVERNANCE\.md$/,
  /^package(-lock)?\.json$/,
  /^playwright\.config\.js$/,
  /^tests\//,
  /^scripts\//,
  /^index\.html$/,
  /^js\/(app|blinkDetector|calibration|camera|dwellSelection|eyeTracking|gazeEstimator|geminiConfig|geminiSuggestions|scanningMode|settings|speechRecognition|textToSpeech)\.js$/
];

const FORBIDDEN_DIFF = {
  documentation: [/<script\b/i, /<iframe\b/i, /javascript:/i, /BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY/i],
  css: [/@import\b/i, /url\s*\(\s*['"]?https?:/i, /expression\s*\(/i, /javascript:/i, /outline\s*:\s*(0|none)/i, /display\s*:\s*none/i, /visibility\s*:\s*hidden/i],
  javascript: [/\b(fetch|XMLHttpRequest|WebSocket|eval|Function)\b/, /\b(document|window|navigator|localStorage|sessionStorage|speechSynthesis)\b/, /innerHTML|outerHTML|insertAdjacentHTML/]
};

const LIMITS = {
  documentation: { files: 8, lines: 400 },
  css: { files: 3, lines: 250 },
  javascript: { files: 1, lines: 120 }
};

function matchesAny(path, patterns) {
  return patterns.some((pattern) => pattern.test(path));
}

function categoryFor(path) {
  if (matchesAny(path, DOC_ALLOWLIST)) return 'documentation';
  if (matchesAny(path, CSS_ALLOWLIST)) return 'css';
  if (matchesAny(path, JS_ALLOWLIST)) return 'javascript';
  return null;
}

export function classifyPullRequest(files) {
  const reasons = [];
  if (!Array.isArray(files) || files.length === 0) {
    return { eligible: false, risk: 'high', category: 'unknown', reasons: ['No changed files were available for verification.'] };
  }

  const categories = new Set();
  for (const file of files) {
    const path = file.filename || '';
    if (matchesAny(path, ALWAYS_MANUAL)) reasons.push(`${path}: protected or security-sensitive path.`);
    const category = categoryFor(path);
    if (!category) reasons.push(`${path}: not on the automatic-merge allowlist.`);
    else categories.add(category);
    if (!['added', 'modified'].includes(file.status)) reasons.push(`${path}: ${file.status || 'unknown'} changes require review.`);
    if (file.patch == null) reasons.push(`${path}: diff unavailable or binary/too large.`);
  }

  if (categories.size !== 1) reasons.push('Mixed or ambiguous change categories require review.');
  const category = categories.size === 1 ? [...categories][0] : 'mixed';
  const totalLines = files.reduce((sum, file) => sum + (file.additions || 0) + (file.deletions || 0), 0);
  const limit = LIMITS[category];
  if (!limit) reasons.push('No automatic-merge policy exists for this category.');
  else {
    if (files.length > limit.files) reasons.push(`Too many files (${files.length} > ${limit.files}).`);
    if (totalLines > limit.lines) reasons.push(`Change is too large (${totalLines} > ${limit.lines} lines).`);
    const combinedPatch = files.map((file) => file.patch || '').join('\n');
    for (const pattern of FORBIDDEN_DIFF[category]) {
      if (pattern.test(combinedPatch)) reasons.push(`Diff contains a high-risk pattern: ${pattern}.`);
    }
  }

  const eligible = reasons.length === 0;
  return {
    eligible,
    risk: eligible ? 'low' : 'high',
    category,
    changedFiles: files.length,
    changedLines: totalLines,
    requiredChecks: category === 'documentation'
      ? ['Quality checks', 'PR readiness']
      : ['Quality checks', 'PR readiness', 'Browser accessibility and visual regression'],
    reasons: eligible ? [`Strict ${category} allowlist matched and size limits passed.`] : [...new Set(reasons)]
  };
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href) {
  const input = JSON.parse(process.argv[2] || '[]');
  console.log(JSON.stringify(classifyPullRequest(input), null, 2));
}
