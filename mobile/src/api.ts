type TokenGetter = () => Promise<string | null>;

type ApiErrorBody = {
  error?: string;
};

const API_URL = (
  process.env.EXPO_PUBLIC_ORBIT_API_URL ?? "https://orbitspace.space"
).replace(/\/$/, "");

export async function orbitRequest<T>(
  getToken: TokenGetter,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = await getToken();
  if (!token) {
    throw new Error("Your Orbit session expired. Please sign in again.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    const body = (await response
      .json()
      .catch(() => null)) as ApiErrorBody | null;
    throw new Error(body?.error ?? `Orbit request failed (${response.status}).`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function inviteUrl(invitePath: string) {
  return `${API_URL}${invitePath.startsWith("/") ? invitePath : `/${invitePath}`}`;
}
