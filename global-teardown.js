import { execSync, spawn } from 'child_process';

export default async function globalTeardown() {
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
