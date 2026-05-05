import fs from 'fs';
import path from 'path';

export default async function globalSetup() {
  // Preserve history from previous report before wiping folders
  const historyDest = path.resolve('allure-results-history');
  if (fs.existsSync('allure-report/history')) {
    if (fs.existsSync(historyDest)) fs.rmSync(historyDest, { recursive: true, force: true });
    fs.cpSync('allure-report/history', historyDest, { recursive: true });
    console.log('📜 Saved Allure history for next run');
  }

  if (fs.existsSync('allure-results')) {
    fs.rmSync('allure-results', { recursive: true, force: true });
    console.log('🗑 Deleted old allure-results');
  }
  if (fs.existsSync('allure-report')) {
    fs.rmSync('allure-report', { recursive: true, force: true });
    console.log('🗑 Deleted old allure-report');
  }

  // Re-create allure-results and restore history so Allure tracks trends
  fs.mkdirSync('allure-results', { recursive: true });
  if (fs.existsSync(historyDest)) {
    fs.cpSync(historyDest, path.resolve('allure-results', 'history'), { recursive: true });
    console.log('📜 Restored Allure history into allure-results');
  }
  console.log('📁 Created fresh allure-results folder');

  // Write environment info for Allure report
  const envProps = [
    'Environment=Staging',
    'Base_URL=https://stg-hts.kapiva.tech/',
    'Browser=Chromium',
    'Framework=Playwright',
    'Playwright_Version=1.58.2',
    `Node_Version=${process.version}`,
    `OS=${process.platform}`,
    'Headless=true',
  ].join('\n');
  fs.writeFileSync(path.resolve('allure-results', 'environment.properties'), envProps);
  console.log('🌍 Allure environment.properties written');
}
