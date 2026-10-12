import { readFileSync } from "node:fs";

/** Keep recovery independent of the JS chunk whose download can fail. */
export function appStartupHtmlPlugin() {
  const script = readFileSync(new URL("../apps/web/src/startup.js", import.meta.url), "utf8");
  const poster = readFileSync(new URL("../apps/web/src/assets/startup-celestial.svg", import.meta.url), "utf8");
  const moon = readFileSync(new URL("../apps/web/src/assets/startup-moon.svg", import.meta.url), "utf8");
  return {
    name: "tldr-app-startup-shell",
    transformIndexHtml(html) {
      return html
        .replace("<!-- app-startup-poster -->", poster)
        .replace("<!-- app-startup-moon -->", moon)
        .replace("<!-- app-startup-script -->", `<script>(() => {\n${script}\n})();</script>`);
    }
  };
}
