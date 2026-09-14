// Opt-in Node test harness only. Browser tests and Vite still load real CSS.
// Some Studio components import their styles; Node-only contract tests exercise
// their pure exports and need a module stub rather than a CSS parser.
import { registerHooks } from 'node:module';
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith('.css')) return { format: 'module', source: 'export default {};', shortCircuit: true };
    return nextLoad(url, context);
  }
});
