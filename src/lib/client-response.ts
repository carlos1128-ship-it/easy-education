export async function readApiJson<T extends Record<string, unknown>>(
  response: Response,
  fallbackError: string,
): Promise<T & { error?: string }> {
  const text = await response.text();

  if (!text.trim()) {
    return { error: response.ok ? undefined : fallbackError } as T & { error?: string };
  }

  try {
    return JSON.parse(text) as T & { error?: string };
  } catch {
    return {
      error: response.ok ? fallbackError : text.slice(0, 300) || fallbackError,
    } as T & { error?: string };
  }
}
