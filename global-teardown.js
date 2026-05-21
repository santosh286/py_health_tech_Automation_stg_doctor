import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config as loadEnv } from 'dotenv';
import { sendSlackFailureAlert } from './utils/slackNotifier.js';

loadEnv(); // load .env so SLACK_* vars are available

export default async function globalTeardown() {
  // ── 1. Parse allure-results to count pass / fail / skipped ──────────────
  let passed = 0, failed = 0, skipped = 0;
  const startTime = globalThis.__playwrightStartTime || Date.now();
  const durationMs = Date.now() - startTime;
  const durationStr = durationMs >= 60000
    ? `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`
    : `${Math.round(durationMs / 1000)}s`;

  const resultsDir = path.resolve('allure-results');
  if (fs.existsSync(resultsDir)) {
    const files = fs.readdirSync(resultsDir).filter(f => f.endsWith('-result.json'));
    for (const file of files) {
      try {
        const result = JSON.parse(fs.readFileSync(path.join(resultsDir, file), 'utf8'));
        if (result.status === 'passed')       passed++;
        else if (result.status === 'failed' || result.status === 'broken') failed++;
        else if (result.status === 'skipped') skipped++;
      } catch { /* ignore malformed files */ }
    }
  }

  const total = passed + failed + skipped;
  console.log(`\n📊 Results — ✅ ${passed} passed | ❌ ${failed} failed | ⏭ ${skipped} skipped | total ${total}`);

  // ── 2. Send Slack alert only if there are failures ───────────────────────
  if (failed > 0) {
    // Derive a human-readable suite name from the npm script or cwd
    const suiteName = process.env.npm_lifecycle_event
      ? process.env.npm_lifecycle_event.replace('test:', '').toUpperCase()
      : 'Playwright';

    await sendSlackFailureAlert({
      suiteName,
      passed,
      failed,
      skipped,
      duration: durationStr,
    }).catch(() => {}); // never block teardown on Slack errors
  }

  // ── 3. Generate & open Allure report ────────────────────────────────────
  console.log('\n📊 Generating Allure report...');
  execSync('npx allure generate allure-results --clean -o allure-report', { stdio: 'inherit' });
  console.log('✅ Allure report generated');

  console.log('🌐 Opening Allure report...');
  const child = spawn('npx', ['allure', 'open', 'allure-report'], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log('✅ Allure report opened in browser');
}
