import { brotliCompressSync, constants } from "node:zlib";

/** Emit lossless siblings after deployment URLs reach their final bytes. */
export function staticBrotliAssetsPlugin() {
  return {
    name: "tldr-static-brotli-assets",
    apply: "build",
    enforce: "post",
    generateBundle: { order: "post", handler(_options, bundle) {
      for (const item of Object.values(bundle)) {
        if (!/^assets\/.+\.(?:js|css)$/u.test(item.fileName)) continue;
        const bytes = Buffer.from(item.type === "chunk" ? item.code : item.source);
        this.emitFile({ type: "asset", fileName: `${item.fileName}.br`, source: brotliCompressSync(bytes, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT }
        }) });
      }
    } }
  };
}
