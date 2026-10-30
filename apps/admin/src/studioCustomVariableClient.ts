import { useCallback, useEffect, useRef, useState } from "react";
import { requestStudioJson } from "./generatedContentClient";
import { announceContentUpdate, subscribeToContentUpdates } from '../../web/src/services/contentUpdateSignal';

export type CustomVariableOverride = { scope: "planet" | "sign" | "placement"; planet: string; sign: string; value: string };
export type CustomVariable = { id: string; updatedAt: string; name: string; label: string; description: string; value: string; tags: string[]; overrides: CustomVariableOverride[] };
export type CustomVariableInput = Omit<CustomVariable, "id" | "updatedAt">;
const endpoint = "/api/admin/generated-content?variables=true";
export const studioVariableEditorHref = (name: string) => `/admin/content#variables?editVariable=${encodeURIComponent(name)}`;

export async function customVariableRequest(secret: string, method = "GET", body?: unknown, signal?: AbortSignal) {
  const data = await requestStudioJson(endpoint, secret, { method, signal, ...(body ? { body: JSON.stringify(body) } : {}) }) as { variables: CustomVariable[]; variable: CustomVariable; deletedId: string };
  if (method === "GET" && !Array.isArray(data.variables) || ["POST", "PATCH"].includes(method) && (!data.variable?.id || !data.variable?.updatedAt) || method === "DELETE" && !data.deletedId) throw new Error("The operation could not be confirmed. Reload the library before trying again.");
  if (['POST', 'PATCH', 'DELETE'].includes(method)) announceContentUpdate({contentKey:`studio-variable/${data.variable?.name ?? data.deletedId}`,published:false,updatedAt:data.variable?.updatedAt ?? new Date().toISOString()});
  return data;
}

export function useStudioCustomVariables(secret: string, enabled: boolean) {
  const [variables, setVariables] = useState<CustomVariable[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const confirmedCredential = useRef<string | null>(null);
  const reload = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => enabled ? subscribeToContentUpdates(notice => { if (notice.contentKey.startsWith('studio-variable/')) reload(); }) : undefined, [enabled, reload]);
  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    if (confirmedCredential.current !== secret) setLoaded(false);
    setLoading(confirmedCredential.current !== secret); setError("");
    void customVariableRequest(secret, "GET", undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) { confirmedCredential.current = secret; setVariables(data.variables); setLoaded(true); }
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Your variables could not load."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [secret, attempt, enabled]);
  return { variables, setVariables, error, loading, loaded, reload };
}
