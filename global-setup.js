import fs from 'fs';

export default async function globalSetup() {
  // 🗑 Delete old allure data before test run
  if (fs.existsSync('allure-results')) {
    fs.rmSync('allure-results', { recursive: true, force: true });
    console.log('🗑 Deleted old allure-results');
  }
  if (fs.existsSync('allure-report')) {
    fs.rmSync('allure-report', { recursive: true, force: true });
    console.log('🗑 Deleted old allure-report');
  }
}
