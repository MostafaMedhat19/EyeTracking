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
  const visited = new Set();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let index = 0; index < count; index++) {
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible();
    const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe('none');
    const focusedIndex = await focused.evaluate((element) => {
      const controls = [...document.querySelectorAll('button, select, input, [role="button"]')]
        .filter((candidate) => candidate.getClientRects().length && candidate.getAttribute('tabindex') !== '-1');
      return controls.indexOf(element);
    });
    expect(focusedIndex).toBeGreaterThanOrEqual(0);
    visited.add(focusedIndex);
  }
  expect(visited.size).toBe(count);
});

test('reduced motion removes transitions and animations', async ({ page }) => {
  await showApplication(page);
  const moving = await page.locator('body').evaluate(() => {
    const durations = (value) => value.split(',').map((part) => Number.parseFloat(part) || 0);
    return [...document.querySelectorAll('body *')].flatMap((element) => ['', '::before', '::after'].map((pseudo) => {
      const style = getComputedStyle(element, pseudo || null);
      const active = [...durations(style.animationDuration), ...durations(style.transitionDuration)].some((duration) => duration > 0);
      return active ? `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${pseudo}` : null;
    })).filter(Boolean);
  });
  expect(moving).toEqual([]);
});

test('layout has no horizontal overflow at the reviewed viewport', async ({ page }) => {
  await showApplication(page);
  const layout = await page.evaluate(() => ({
    viewport: innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    appWidth: document.querySelector('#app').getBoundingClientRect().width
  }));
  expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.appWidth).toBeLessThanOrEqual(layout.viewport);
});

test('application layout matches reviewed desktop and mobile baselines', async ({ page }, testInfo) => {
  await showApplication(page);
  await expect(page).toHaveScreenshot(`eye-voice-${testInfo.project.name}.png`, { fullPage: true, animations: 'disabled' });
});
