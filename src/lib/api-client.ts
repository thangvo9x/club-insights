export async function fetchJson<T>(
  url: string,
  signal: AbortSignal,
): Promise<T> {
  const response = await fetch(url, { signal });
  const body = await response.json().catch(() => {
    throw new Error('The server returned invalid JSON. Please retry.');
  });
  if (!response.ok) {
    throw new Error(body?.error ?? 'Something went wrong. Please retry.');
  }
  return body as T;
}
