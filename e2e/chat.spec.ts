// One end-to-end test of the whole chat flow, in a real browser:
// type a question, wait for the streamed reply, check the chart was drawn.
import { expect, test } from '@playwright/test';

test('asking for the highest lift draws the ranked bar chart', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('Your question').fill('Which test has the highest lift?');
  await page.getByRole('button', { name: 'Ask' }).click();

  // The chart comes from the lookup result the server streamed.
  const chart = page.getByTestId('lift-chart');
  await expect(chart).toBeVisible();

  // Six experiments, ranked in code: the best first, the worst last.
  const bars = chart.getByTestId('lift-bar');
  await expect(bars).toHaveCount(6);
  await expect(bars.first()).toContainText('Pricing page layout');
  await expect(bars.first()).toContainText('+25.0%');
  await expect(bars.last()).toContainText('Signup form length');
  await expect(bars.last()).toContainText('-10.0%');

  // The text fallback for screen readers carries the same ranking.
  await expect(chart.getByRole('listitem').first()).toContainText('Pricing page layout: +25.0% lift');

  // The model's written answer streamed in alongside it.
  await expect(page.getByTestId('assistant-turn')).toContainText('ranked by lift');
});
