import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

async function showApplication(page) {
  await page.goto('/');
  await page.evaluate(() => {
    document.querySelector('#permissionScreen').hidden = true;
    document.querySelector('#app').hidden = false;
  });
}

test('permission screen has no serious automated accessibility violations', async ({ page }) => {
  await page.goto('/');
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async () => globalThis.axe.run(document, {
    resultTypes: ['violations'],
    rules: { 'color-contrast': { enabled: true } }
  }));
  expect(result.violations.filter((item) => ['critical', 'serious'].includes(item.impact))).toEqual([]);
});

test('all interactive controls are keyboard reachable with visible focus', async ({ page }) => {
  await showApplication(page);
  const interactive = page.locator('button:visible, select:visible, input:visible, [role="button"]:visible:not([tabindex="-1"])');
  const count = await interactive.count();
  expect(count).toBeGreaterThan(10);
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let index = 0; index < count; index++) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe('none');
  }
});

test('reduced motion removes transitions and animations', async ({ page }) => {
  await showApplication(page);
  const values = await page.locator('#quickSelect').evaluate((element) => {
    const style = getComputedStyle(element);
    return { animation: style.animationDuration, transition: style.transitionDuration };
  });
  expect(values.animation).toBe('0s');
  expect(values.transition).toBe('0s');
});

test('application layout matches reviewed desktop and mobile baselines', async ({ page }, testInfo) => {
  await showApplication(page);
  await expect(page).toHaveScreenshot(`eye-voice-${testInfo.project.name}.png`, { fullPage: true, animations: 'disabled' });
});
