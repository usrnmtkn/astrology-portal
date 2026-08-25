#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function argument(name) {
  return process.argv.find((value) => value.startsWith(`${name}=`))?.slice(name.length + 1) ?? null;
}

const queuePath = argument("--queue");
const outputPath = argument("--out");
if (!queuePath || !outputPath) {
  throw new Error("Usage: node scripts/build-content-approval-desk.mjs --queue=<approval-queue.json> --out=<approval-desk.html>");
}

const queue = JSON.parse(fs.readFileSync(path.resolve(queuePath), "utf8"));
if (queue.schema !== "approval-queue/v1" || !Array.isArray(queue.items)) {
  throw new Error("Approval desk requires an approval-queue/v1 document.");
}

const embeddedQueue = JSON.stringify(queue).replaceAll("<", "\\u003c");
const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>TLDR Astro approval desk</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, sans-serif; background: #f4f3f0; color: #191919; }
    body { margin: 0; }
    header { position: sticky; top: 0; z-index: 2; padding: 18px 24px; background: #191919; color: white; display: flex; justify-content: space-between; gap: 16px; align-items: center; }
    header p { margin: 4px 0 0; color: #c9c9c9; }
    button { border: 1px solid #191919; border-radius: 999px; padding: 9px 14px; background: white; cursor: pointer; }
    button[aria-pressed="true"] { background: #191919; color: white; }
    main { width: min(980px, calc(100% - 32px)); margin: 24px auto 80px; display: grid; gap: 18px; }
    article { background: white; border: 1px solid #d9d7d1; border-radius: 16px; padding: 20px; }
    .meta { color: #6e6c67; font: 13px ui-monospace, monospace; }
    .context { white-space: pre-wrap; line-height: 1.5; }
    .span { padding: 14px; border-left: 4px solid #191919; background: #f7f6f3; white-space: pre-wrap; }
    .options { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 16px; }
    textarea { box-sizing: border-box; width: 100%; min-height: 100px; margin-top: 12px; padding: 10px; }
  </style>
</head>
<body>
  <header>
    <div><strong>TLDR Astro approval desk</strong><p id="progress"></p></div>
    <button id="export">Export approvals.json</button>
  </header>
  <main id="items"></main>
  <script>
    const queue = ${embeddedQueue};
    const decisions = new Map();
    const items = document.querySelector('#items');
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
    const optionValue = (option) => typeof option === 'string' ? option : option.value;
    const optionLabel = (option) => typeof option === 'string' ? option : (option.label || option.value);
    function updateProgress() {
      document.querySelector('#progress').textContent = decisions.size + ' of ' + queue.items.length + ' decided';
    }
    for (const item of queue.items) {
      const article = document.createElement('article');
      article.innerHTML = '<div class="meta">' + escapeHtml(item.type) + ' · ' + escapeHtml(item.id) + (item.contentKey ? ' · ' + escapeHtml(item.contentKey) : '') + '</div>'
        + '<h2>' + escapeHtml(item.title) + '</h2>'
        + (item.before ? '<p class="context">' + escapeHtml(item.before) + '</p>' : '')
        + (item.span ? '<div class="span">' + escapeHtml(item.span) + '</div>' : '')
        + (item.after ? '<p class="context">' + escapeHtml(item.after) + '</p>' : '')
        + '<div class="options"></div><textarea hidden placeholder="Exact owner wording"></textarea>';
      const options = article.querySelector('.options');
      const textarea = article.querySelector('textarea');
      for (const option of item.options) {
        const button = document.createElement('button');
        button.textContent = optionLabel(option);
        button.type = 'button';
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => {
          for (const sibling of options.querySelectorAll('button')) sibling.setAttribute('aria-pressed', 'false');
          button.setAttribute('aria-pressed', 'true');
          const choice = optionValue(option);
          textarea.hidden = !['rewrite', 'write one'].includes(choice);
          decisions.set(item.id, { choice, text: textarea.value });
          updateProgress();
        });
        options.append(button);
      }
      textarea.addEventListener('input', () => {
        const current = decisions.get(item.id);
        if (current) decisions.set(item.id, { ...current, text: textarea.value });
      });
      items.append(article);
    }
    updateProgress();
    document.querySelector('#export').addEventListener('click', () => {
      const approvedAt = new Date().toISOString();
      const exported = queue.items.filter((item) => decisions.has(item.id)).map((item) => {
        const selected = decisions.get(item.id);
        const decision = { id: item.id, type: item.type, choice: selected.choice, approvedAt };
        if (item.contentKey) decision.contentKey = item.contentKey;
        if (item.sha256) decision.sourceSha256 = item.sha256;
        if (item.type === 'span' && selected.choice === 'edit') decision.omitText = item.span;
        if (['rewrite', 'write one'].includes(selected.choice)) decision.text = selected.text;
        return decision;
      });
      const payload = { schema: 'approval-set/v1', decidedAt: approvedAt, total: queue.items.length, decided: exported.length, complete: exported.length === queue.items.length, decisions: exported };
      const blob = new Blob([JSON.stringify(payload, null, 2) + '\\n'], { type: 'application/json' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = 'approvals.json';
      link.click();
      URL.revokeObjectURL(link.href);
    });
  </script>
</body>
</html>\n`;

fs.mkdirSync(path.dirname(path.resolve(outputPath)), { recursive: true });
fs.writeFileSync(path.resolve(outputPath), html);
console.log(`Wrote ${path.resolve(outputPath)} (${queue.items.length} decisions).`);
