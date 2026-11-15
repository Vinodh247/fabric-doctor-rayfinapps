// Verifies every Microsoft Learn reference in the assessment still resolves.
// Run after `npm run build` (reads the compiled shared package):  npm run check:links
import { QUESTIONS } from '../packages/shared/dist/index.js';

const urls = [...new Set(QUESTIONS.flatMap((q) => q.references.map((r) => r.url)))];
let failures = 0;

for (const url of urls) {
  try {
    const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (link check)' } });
    const ok = response.ok && !/\/404\b/.test(response.url);
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${response.status} ${url}`);
  } catch (error) {
    failures++;
    console.log(`FAIL ---- ${url} (${error instanceof Error ? error.message : error})`);
  }
}

console.log(`\n${urls.length - failures}/${urls.length} links resolved.`);
process.exit(failures > 0 ? 1 : 0);
