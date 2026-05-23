import { API_BASE_URL } from "./baseUrl";
import { authFetch } from "./authSession";

const USER_ME_PATH = "user/me";
const USER_DELETE_TIMEOUT_MS = 60000;

function buildError(status: number, body: string) {
  return new Error(body || `User request failed with status ${status}`);
}

function isAlreadyDeletedStatus(status: number) {
  return status === 404 || status === 410;
}

type DeleteMyUserOptions = {
  authorizationCode?: string | null;
};

export async function deleteMyUser(
  token: string,
  options?: DeleteMyUserOptions
): Promise<void> {
  if (!token) throw new Error("Missing token");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), USER_DELETE_TIMEOUT_MS);

  let res: Response;
  try {
    res = await authFetch(
      `${API_BASE_URL}/${USER_ME_PATH}`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorizationCode: options?.authorizationCode?.trim() || null,
        }),
        signal: controller.signal,
      },
      { token }
    );
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Sletting av konto tok for lang tid. Prøv igjen.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  if (res.ok || isAlreadyDeletedStatus(res.status)) return;

  const text = await res.text().catch(() => "");
  throw buildError(res.status, text);
}

export type UserMe = {
  userId: string;
  email?: string | null;
  username?: string | null;
  authProvider?: string | null;
  displayName?: string | null;
  isAdmin?: boolean;
};

export async function fetchMyUser(token: string): Promise<UserMe | null> {
  if (!token) throw new Error("Missing token");

  const res = await authFetch(
    `${API_BASE_URL}/${USER_ME_PATH}`,
    {
      method: "GET",
      headers: {},
    },
    { token }
  );

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    // Older backend can have DELETE /user/me but not GET /user/me yet.
    if (res.status === 404 || res.status === 405) return null;
    throw buildError(res.status, text);
  }

  if (!text) {
    throw new Error("User profile response was empty");
  }

  return JSON.parse(text) as UserMe;
}
