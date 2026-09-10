import { expect, type Page } from "@playwright/test";

export async function observeArticleTransitions(page: Page) {
  await page.addInitScript(() => {
    const start = document.startViewTransition.bind(document);
    const records: Array<{ title: string | null; ready: boolean; animations: string[] }> = [];
    (window as any).__articleTransitions = records;
    document.startViewTransition = (update: any) => {
      const record = {
        title: document.querySelector("#sky-detail-title, #you-transit-article-title")?.textContent ?? null,
        ready: false,
        animations: [] as string[]
      };
      records.push(record);
      const transition = start(update);
      void transition.ready.then(() => {
        record.ready = true;
        record.animations = document.getAnimations().map(animation => (animation as CSSAnimation).animationName);
      }, () => {});
      return transition;
    };
  });
}

export async function expectAnimatedArticleNavigation(page: Page, navigate: () => Promise<unknown>, fromTitle: string) {
  await expect(page.locator("html")).not.toHaveAttribute("data-page-transition", "active");
  await page.evaluate(() => { (window as any).__articleTransitions.length = 0; });
  await navigate();
  await expect.poll(() => page.evaluate(() => (window as any).__articleTransitions.filter((record: any) => record.ready).length)).toBe(1);
  const records = await page.evaluate(() => (window as any).__articleTransitions);
  expect(records).toHaveLength(1);
  expect(records[0].title).toBe(fromTitle);
  expect(records[0].animations).toContain("page-nav-in");
  expect(records[0].animations).toContain("page-fade-in");
}
