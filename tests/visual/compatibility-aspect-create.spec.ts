import { test, expect } from "@playwright/test";
import { studioApiStore } from "../helpers/studio-api-store";
import { routeStudioInventoryApi } from "../helpers/studio-inventory-route";

const key = "fallback-hook/synastry-pair/ascendant/midheaven/trine";
const you = "Synthetic {{holder2}} opening.\n\nComplete synthetic You ending.";
const they = "Synthetic {{holder1}} reverse opening.\n\nComplete synthetic Friend ending.";
const groupedKey = "fallback-hook/synastry-pair/moon/midheaven/hard";
const grouped = { id:"fixture-grouped", content_key:groupedKey, status:"DRAFT", surface:"synastry", mode:"in_depth", block_type:"fallback_hook",
  headline:"Moon + Midheaven · Hard", body:"Synthetic shared passage.", summary:"", lane:"reference", review_state:"needs-review",
  source_snapshot:{}, facts:{}, sections:{packageRecord:{contentKey:groupedKey,content_role:"fallback_hook",body_you:"Synthetic shared passage.",body_they:"Synthetic reverse passage.",review_status:"needs_review"}},updated_at:"2026-10-02T12:00:00Z" };

for (const width of [390, 1440]) for (const theme of ["light", "dark"]) {
  test(`Compatibility missing aspect create save reopen publish ${theme} ${width}`, async ({ page }) => {
    test.setTimeout(90_000);
    const store = await studioApiStore([grouped], { uuidIds: true });
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    let failLookup = false;
    let hideSavedRows = false;
    try {
      await page.setViewportSize({width,height:1000});
      await page.addInitScript(theme => {
        localStorage.setItem("tldrastro:contentAdminSecret","calendar-api-fixture");
        localStorage.setItem("tldrastro:studio-theme",theme);
      },theme);
      await routeStudioInventoryApi(page,{call:store.call,listRows:rows=>hideSavedRows?[]:rows, answer:async(route,url)=>{
        if (url.pathname!=="/api/admin/content-live-status") return false;
        await route.fulfill({json:{ok:true,statuses:await store.call({method:"statuses",body:route.request().postDataJSON()})}});
        return true;
      }});
      await page.route("**/api/admin/generated-content-inventory?**",async route=>{
        if (failLookup && new URL(route.request().url()).searchParams.has("contentKeys")) {
          return route.fulfill({status:503,json:{ok:false,error:"Synthetic lookup unavailable"}});
        }
        await route.fallback();
      });
      await page.goto("/admin/content#compatibility");
      await page.getByRole("searchbox",{name:"Search compatibility"}).fill("Moon square Midheaven");
      await expect(page.getByRole("row").filter({hasText:groupedKey})).toHaveCount(1);
      await page.getByRole("searchbox",{name:"Search compatibility"}).fill("Ascendant trine Midheaven");
      await page.locator(".admin-compatibility-empty").getByRole("button",{name:"Add aspect content",exact:true}).click();
      const creator=page.getByRole("region",{name:"Add compatibility aspect content",exact:true});
      await expect(creator.getByLabel("Your planet or point",{exact:true})).toHaveValue("ascendant");
      await expect(creator.getByLabel("Friend’s planet or point",{exact:true})).toHaveValue("midheaven");
      await expect(creator.getByLabel("Compatibility aspect",{exact:true})).toHaveValue("trine");
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
      await page.screenshot({path:`test-results/compatibility-aspect-create-${theme}-${width}.png`});
      failLookup=true;
      await creator.getByRole("button",{name:"Open aspect editor",exact:true}).click();
      await expect(page.getByRole("status").filter({hasText:"Synthetic lookup unavailable"})).toBeVisible();
      expect(await store.call({method:"rows"})).toEqual([grouped]);
      failLookup=false;
      await creator.getByRole("button",{name:"Open aspect editor",exact:true}).click();
      const editor=page.locator(".admin-editor-panel");
      const footer=editor.locator(".admin-editor-savebar");
      await expect(editor.getByRole("heading")).toContainText("Ascendant");
      await expect(editor.getByRole("heading",{level:2})).toHaveCount(1);
      const titleStyle = (element: Element) => {
        const s=getComputedStyle(element);
        return [s.fontFamily,s.fontSize,s.fontWeight,s.lineHeight,s.letterSpacing,s.marginTop,s.marginBottom,s.textTransform,s.textAlign];
      };
      const createTitleStyle=await editor.getByRole("heading").evaluate(titleStyle);
      await expect(editor).toContainText("Write both perspectives for this aspect.");
      await page.screenshot({path:`test-results/compatibility-aspect-empty-editor-${theme}-${width}.png`});
      await editor.getByRole("textbox",{name:"You",exact:true}).fill(you);
      await expect(footer.getByRole("button",{name:"Save & publish",exact:true})).toBeDisabled();
      await footer.getByRole("button",{name:"Save draft",exact:true}).click();
      await expect(footer).toContainText("Draft saved");
      await editor.getByRole("textbox",{name:"Friend / They",exact:true}).fill(they);
      await footer.getByRole("button",{name:"Save draft",exact:true}).click();
      await expect.poll(async()=> (await store.call({method:"rows"})).find((row:any)=>row.content_key===key)?.sections?.packageDraft?.body_they).toBe(they);
      await editor.getByRole("button",{name:"Close",exact:true}).click();
      await page.reload();
      await page.getByRole("searchbox",{name:"Search compatibility"}).fill("Ascendant trine Midheaven");
      await page.getByRole("row").filter({hasText:key}).getByRole("button",{name:"Edit",exact:true}).click();
      await expect(editor.getByRole("textbox",{name:"You",exact:true})).toHaveValue(you);
      await expect(editor.getByRole("textbox",{name:"Friend / They",exact:true})).toHaveValue(they);
      expect(await editor.getByRole("heading").evaluate(titleStyle)).toEqual(createTitleStyle);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
      await page.screenshot({path:`test-results/compatibility-aspect-editor-${theme}-${width}.png`});
      await footer.getByRole("button",{name:"Save & publish",exact:true}).click();
      await expect.poll(async()=> (await store.call({method:"rows"})).find((row:any)=>row.content_key===key && row.status==="LIVE")?.sections?.packageRecord?.body_they).toBe(they);
      await expect(editor.getByRole("textbox",{name:"You",exact:true})).toHaveValue(you);
      await editor.getByRole("button",{name:"Close",exact:true}).click();
      const before=await store.call({method:"rows"});
      // Reverse lookup uses the existing two-direction document, even if absent from the list.
      hideSavedRows=true;
      await page.reload();
      await page.getByRole("searchbox",{name:"Search compatibility"}).fill("Midheaven trine Ascendant");
      await page.getByRole("button",{name:"Create",exact:true}).click();
      await page.getByRole("menuitem",{name:/Add aspect content/}).click();
      await creator.getByRole("button",{name:"Open aspect editor",exact:true}).click();
      await expect(editor.getByRole("textbox",{name:"You",exact:true})).toHaveValue(you);
      expect(await store.call({method:"rows"})).toEqual(before);
      expect(errors).toEqual([]);
    } finally {
      await page.context().route("**/api/**",route=>route.abort());
      await page.unrouteAll({behavior:"wait"});
      await page.close();
      store.close();
    }
  });
}
