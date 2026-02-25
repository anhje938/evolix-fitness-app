import { API_BASE_URL } from "./baseUrl";

const USER_ME_PATH = "user/me";

function buildError(status: number, body: string) {
  return new Error(body || `Delete user failed with status ${status}`);
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
