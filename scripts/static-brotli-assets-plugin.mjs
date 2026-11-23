import { brotliCompress, constants } from "node:zlib";
import { promisify } from "node:util";

const compress = promisify(brotliCompress);

/** Emit lossless siblings after deployment URLs reach their final bytes. */
export function staticBrotliAssetsPlugin() {
  return {
    name: "tldr-static-brotli-assets",
    apply: "build",
    enforce: "post",
    generateBundle: { order: "post", async handler(_options, bundle) {
      await Promise.all(Object.values(bundle).filter(item => /^assets\/.+\.(?:js|css)$/u.test(item.fileName)).map(async item => {
        const bytes = Buffer.from(item.type === "chunk" ? item.code : item.source);
        this.emitFile({ type: "asset", fileName: `${item.fileName}.br`, source: await compress(bytes, {
          params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT }
        }) });
      }));
    } }
  };
}
