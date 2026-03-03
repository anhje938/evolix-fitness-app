import { API_BASE_URL } from "./baseUrl";

const USER_ME_PATH = "user/me";

function buildError(status: number, body: string) {
  return new Error(body || `User request failed with status ${status}`);
}

export async function deleteMyUser(token: string): Promise<void> {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE_URL}/${USER_ME_PATH}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.ok) return;

  const text = await res.text().catch(() => "");
  throw buildError(res.status, text);
}

export type UserMe = {
  userId: string;
  email?: string | null;
  displayName?: string | null;
};

export async function fetchMyUser(token: string): Promise<UserMe | null> {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE_URL}/${USER_ME_PATH}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

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
