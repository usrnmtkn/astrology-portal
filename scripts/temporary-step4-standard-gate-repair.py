from pathlib import Path

path = Path("tests/visual/content-dashboard-admin-user-flows.spec.ts")
source = path.read_text()

old_cursor = '''          ...(url.searchParams.get("scope") === "compatibility"
            ? { nextCursor: pageRows.length === limit ? String(pageRows.at(-1)?.id ?? "") : null }
            : {})'''
new_cursor = '''          nextCursor: offset + pageRows.length < servedRows.length
            ? String(pageRows.at(-1)?.id ?? "")
            : null'''
if old_cursor not in source:
    raise SystemExit("expected legacy generated-content cursor mock was not found")
source = source.replace(old_cursor, new_cursor, 1)

old_scale = '''    await expect(page.locator(".admin-content-row")).toHaveCount(50);
    await expect(page.getByRole("navigation", { name: "Content rows pagination" })).toContainText("Showing 1–50 of 7200");'''
new_scale = '''    await expect(page.getByRole("region", { name: "Admin status" })).toContainText("7200 saved rows loaded", {
      timeout: routeReadyTimeoutMs
    });
    await expect(page.locator(".admin-content-row")).toHaveCount(50);
    await expect(page.getByRole("navigation", { name: "Content rows pagination" })).toContainText("Showing 1–50 of 7200");'''
if old_scale not in source:
    raise SystemExit("expected production-scale pagination assertion was not found")
source = source.replace(old_scale, new_scale, 1)

old_publish = '''    expect(writes[0]?.payload).toEqual({ id: pendingRevision.id, ownerAction: "approve-package-revision" });'''
new_publish = '''    expect(writes[0]?.payload).toEqual({
      id: pendingRevision.id,
      ownerAction: "approve-package-revision",
      expectedUpdatedAt: pendingRevision.updated_at
    });'''
if old_publish not in source:
    raise SystemExit("expected legacy package-revision payload assertion was not found")
source = source.replace(old_publish, new_publish, 1)

path.write_text(source)
