// Minimal REPL-ish driver for driving the KTW web app with Playwright/Chromium.
// Usage: node driver.mjs <script-file>   (or pipe a JSON-lines script via stdin)
//
// Each line of the script is one command:
//   nav <url>
//   wait-for <selector>            (CSS selector, Playwright semantics)
//   wait-for-text <text>
//   click <selector>
//   fill <selector> <value...>
//   press <key>
//   screenshot <name>
//   console-errors
//   eval <js-expression>           (runs in page context, result printed)
//
// Screenshots are written to ./screenshots/<name>.png (relative to this file).

import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = process.argv[2];
if (!scriptPath) {
  console.error('Usage: node driver.mjs <script-file>');
  process.exit(1);
}
const lines = readFileSync(scriptPath, 'utf8')
  .split('\n')
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith('#'));

const consoleErrors = [];

const run = async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(String(err)));

  for (const line of lines) {
    const [cmd, ...rest] = line.split(' ');
    const arg = rest.join(' ');
    console.log(`> ${line}`);
    switch (cmd) {
      case 'nav': {
        const url = arg.startsWith('http') ? arg : `${process.env.BASE_URL || 'http://localhost:5173'}${arg}`;
        await page.goto(url, { waitUntil: 'domcontentloaded' });
        break;
      }
      case 'wait-for':
        await page.waitForSelector(arg, { timeout: 15000 });
        break;
      case 'wait-for-text':
        await page.getByText(arg).first().waitFor({ timeout: 15000 });
        break;
      case 'click':
        await page.click(arg, { timeout: 15000 });
        break;
      case 'fill': {
        const sp = rest.join(' ');
        const idx = sp.indexOf(' ');
        const selector = sp.slice(0, idx);
        const value = sp.slice(idx + 1);
        await page.fill(selector, value, { timeout: 15000 });
        break;
      }
      case 'press':
        await page.keyboard.press(arg);
        break;
      case 'screenshot': {
        const name = arg || 'screenshot';
        const path = join(__dirname, 'screenshots', `${name}.png`);
        await page.screenshot({ path, fullPage: true });
        console.log(`  saved ${path}`);
        break;
      }
      case 'console-errors':
        console.log('  console errors so far:', JSON.stringify(consoleErrors, null, 2));
        break;
      case 'eval': {
        const result = await page.evaluate(arg);
        console.log('  eval ->', result);
        break;
      }
      default:
        console.warn(`  unknown command: ${cmd}`);
    }
  }

  await browser.close();
  if (consoleErrors.length) {
    console.log('\nConsole errors captured during run:');
    for (const e of consoleErrors) console.log(' -', e);
  }
};

run().catch((err) => {
  console.error('Driver failed:', err);
  process.exit(1);
});
