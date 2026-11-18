import type { SkyReaderPreviewRequest, SkyReaderPreviewResult } from './skyReaderPreview';

/** The embedded Studio can borrow its host reader without starting a child frame. */
export type SkyReaderCapture = (input: SkyReaderPreviewRequest, signal: AbortSignal) => Promise<SkyReaderPreviewResult>;
let capture: SkyReaderCapture | undefined;
export function registerSkyReaderCapture(reader: SkyReaderCapture) { capture = reader; }
export function skyReaderCapture() { return capture; }
