type YouModule = typeof import("./YouPage");

let module: YouModule | undefined;
let pending: Promise<YouModule> | undefined;
let failure: unknown;

export function loadYouPage() {
  return pending ??= import("./YouPage").then(
    loaded => (module = loaded),
    error => { failure = error; throw error; }
  );
}

// Intent preloading and rendering share the same resource. A ready module can
// render synchronously instead of entering another lazy/Suspense reveal cycle.
export function readYouPage() {
  if (failure) throw failure;
  if (!module) throw loadYouPage();
  return module.YouPage;
}
