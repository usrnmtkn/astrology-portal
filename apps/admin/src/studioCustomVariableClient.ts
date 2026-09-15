import { useCallback, useEffect, useState } from "react";
import { adminCredentialHeaders } from "./adminSecret";

export type CustomVariableOverride = { scope: "planet" | "sign" | "placement"; planet: string; sign: string; value: string };
export type CustomVariable = { id: string; updatedAt: string; name: string; label: string; description: string; value: string; tags: string[]; overrides: CustomVariableOverride[] };
export type CustomVariableInput = Omit<CustomVariable, "id" | "updatedAt">;
const endpoint = "/api/admin/generated-content?variables=true";

export async function customVariableRequest(secret: string, method = "GET", body?: unknown, signal?: AbortSignal) {
  const response = await fetch(endpoint, { method, headers: { ...adminCredentialHeaders(secret), "content-type": "application/json" }, cache: "no-store", signal: signal ?? AbortSignal.timeout(15000), ...(body ? { body: JSON.stringify(body) } : {}) });
  let data;
  try { data = await response.json(); } catch { throw new Error("Variables returned an unreadable response. Reload before trying again."); }
  if (!response.ok || data?.ok !== true) throw new Error(data?.error ?? "Variables could not be saved. Your edits are still here.");
  if (method === "GET" && !Array.isArray(data.variables) || ["POST", "PATCH"].includes(method) && (!data.variable?.id || !data.variable?.updatedAt) || method === "DELETE" && !data.deletedId) throw new Error("The operation could not be confirmed. Reload the library before trying again.");
  return data;
}

export function useStudioCustomVariables(secret: string) {
  const [variables, setVariables] = useState<CustomVariable[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const reload = useCallback(() => setAttempt(value => value + 1), []);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError("");
    void customVariableRequest(secret, "GET", undefined, controller.signal).then(data => {
      if (!controller.signal.aborted) setVariables(data.variables);
    }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "Your variables could not load."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [secret, attempt]);
  return { variables, setVariables, error, loading, reload };
}
