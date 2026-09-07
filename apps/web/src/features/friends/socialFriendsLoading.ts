// Bound the visible loading state even if the transport never settles. A late
// response cannot publish through the caller after this promise has rejected.
export async function withFriendsLoadingTimeout<T>(request: Promise<T>, timeoutMs = 10_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Friends request timed out.")), timeoutMs);
      })
    ]);
  } finally {
    clearTimeout(timer);
  }
}
