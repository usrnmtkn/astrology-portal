import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Run after the web build. This comparison page is only generated locally;
// a normal production build clears it from dist.
const dist = new URL("../apps/web/dist/", import.meta.url);
const player = readdirSync(new URL("assets/", dist)).find(name => /^lottie_light\.min-.*\.js$/u.test(name));
if (!player) throw new Error("Build @tldr/web before creating the startup preview.");
// Keep the playground's player in the document: an old open preview must not
// depend on a second asset request before the approved motion can start.
const playerSource = readFileSync(new URL(`assets/${player}`, dist), "utf8").replace(/<\/script/giu, "<\\/script");
const data = readFileSync(new URL("../apps/web/src/assets/startup-celestial.json", import.meta.url), "utf8").replaceAll("<", "\\u003c");
const html = readFileSync(new URL("index.html", dist), "utf8")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gu, "")
  .replace(/<link\b[^>]*rel="modulepreload"[^>]*>/gu, "")
  .replace("<title>tldrastro</title>", "<title>TLDR Astro · startup animation preview</title>")
  .replace('id="app-startup"', 'id="app-startup" data-loader="celestial"')
  .replace("</head>", `<style>
    :root[data-preview-palette="teal"] { --startup-ink: var(--startup-brand-ink); }
    .preview-controls {
      position: fixed; bottom: var(--space-6); left: 50%; transform: translateX(-50%);
      display: flex; flex-direction: column; align-items: center; gap: var(--space-2); padding: var(--space-2);
      border: var(--border-width-thin) solid var(--line); border-radius: var(--radius-card);
      background: var(--surface); color: var(--ink); font-family: var(--font-body);
    }
    .preview-controls [role="group"] { display: flex; gap: var(--space-1); }
    .preview-options { display: flex; gap: var(--space-3); }
    .preview-controls [hidden] { display: none; }
    .preview-controls button {
      border: 0; border-radius: var(--radius-pill); padding: var(--space-3) var(--space-4);
      background: transparent; color: inherit; font: inherit; cursor: pointer;
    }
    .preview-controls button[aria-pressed="true"] { background: var(--surface-2); }
    .preview-controls [data-toggle-playback] { background: var(--surface-2); }
    .preview-controls button:focus-visible { outline: var(--border-width-medium) solid var(--ink); }
    /* An explicit preview choice can play the moon even with reduced motion.
       The production loader's accessibility behavior stays in startup.css. */
    :root[data-preview-motion] .app-startup[data-loader="moon"][aria-busy="true"] .startup-moon__shadow {
      animation: startup-moon-phase var(--startup-moon-duration) var(--startup-moon-ease)
        var(--startup-moon-start-delay) infinite alternate;
    }
  </style></head>`)
  .replace("</body>", () => `
  <aside class="preview-controls" aria-label="Animation appearance">
    <div role="group" aria-label="Loader">
      <button type="button" data-loader-choice="moon">Moon</button>
      <button type="button" data-loader-choice="celestial">Four icons</button>
    </div>
    <div class="preview-options">
      <div role="group" aria-label="Palette" hidden>
        <button type="button" data-palette="teal">Teal</button>
        <button type="button" data-palette="graphite">Graphite</button>
      </div>
      <div role="group" aria-label="Theme">
        <button type="button" data-theme-choice="light">Light</button>
        <button type="button" data-theme-choice="dark">Dark</button>
      </div>
    </div>
    <button type="button" data-toggle-playback>Play animation</button>
  </aside>
  <script data-preview-player>${playerSource}</script>
  <script>
    const root = document.documentElement;
    const startup = document.getElementById('app-startup');
    const params = new URLSearchParams(location.search);
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const playbackButton = document.querySelector('[data-toggle-playback]');
    let motionOverride = ['play', 'pause'].includes(params.get('motion')) ? params.get('motion') : null;
    const isPlaying = () => motionOverride ? motionOverride === 'play' : !motion.matches;
    let animation;
    let animationReady = false;
    const sync = () => {
      const playing = isPlaying();
      if (motionOverride) root.dataset.previewMotion = motionOverride;
      else delete root.dataset.previewMotion;
      playbackButton.textContent = playing ? 'Pause animation' : 'Play animation';
      document.querySelector('.startup-moon__shadow').style.animationPlayState = document.hidden || !playing ? 'paused' : 'running';
      if (!animation || !animationReady) return;
      if (motion.matches && !motionOverride) animation.goToAndStop(0, true);
      else if (!playing || document.hidden || startup.dataset.loader === 'moon') animation.pause();
      else animation.play();
    };
    function loadCelestial() {
      if (animation) return;
      animation = lottie.loadAnimation({
        container: document.querySelector('.startup-artwork__animation'),
        renderer: 'svg', loop: true, autoplay: false, animationData: ${data}
      });
      const onAnimationReady = () => {
        if (animationReady) return;
        animationReady = true;
        document.querySelector('.startup-artwork').setAttribute('data-animation-ready', '');
        sync();
      };
      animation.addEventListener('DOMLoaded', onAnimationReady);
      if (animation.isLoaded) onAnimationReady();
    }
    function select(key, value) {
      root.dataset[key] = value;
      const attribute = { theme: 'data-theme-choice', previewPalette: 'data-palette', loader: 'data-loader-choice' }[key];
      document.querySelectorAll('[' + attribute + ']').forEach(button => {
        button.setAttribute('aria-pressed', String(button.getAttribute(attribute) === value));
      });
      if (key === 'loader') {
        startup.dataset.loader = value;
        document.querySelector('[aria-label="Palette"]').hidden = value === 'moon';
        if (value === 'celestial') loadCelestial();
      }
      sync();
    }
    select('theme', params.get('theme') === 'dark' ? 'dark' : 'light');
    select('previewPalette', params.get('palette') === 'teal' ? 'teal' : 'graphite');
    select('loader', params.get('loader') === 'moon' ? 'moon' : 'celestial');
    document.querySelectorAll('[data-palette]').forEach(button => button.addEventListener('click', () => select('previewPalette', button.dataset.palette)));
    document.querySelectorAll('[data-theme-choice]').forEach(button => button.addEventListener('click', () => select('theme', button.dataset.themeChoice)));
    document.querySelectorAll('[data-loader-choice]').forEach(button => button.addEventListener('click', () => select('loader', button.dataset.loaderChoice)));
    playbackButton.addEventListener('click', () => {
      motionOverride = isPlaying() ? 'pause' : 'play';
      const url = new URL(location.href);
      url.searchParams.set('motion', motionOverride);
      history.replaceState(null, '', url);
      sync();
    });
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
  </script>
  </body>`);
const output = new URL("loading-preview.html", dist);
writeFileSync(output, html);
console.log(`Local animation preview written to ${fileURLToPath(output)}`);
