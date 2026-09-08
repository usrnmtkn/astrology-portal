import { readFileSync } from "node:fs";

/** Keep recovery independent of the JS chunk whose download can fail. */
export function appStartupHtmlPlugin() {
  const script = readFileSync(new URL("../apps/web/src/startup.js", import.meta.url), "utf8");
  return {
    name: "tldr-app-startup-shell",
    transformIndexHtml(html) {
      return html.replace("<!-- app-startup-script -->", `<script>(() => {\n${script}\n})();</script>`);
    }
  };
}
