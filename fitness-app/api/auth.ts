import { API_BASE_URL } from "./baseUrl";

//LOGINRESPONSE FROM API
type LoginResponse = {
    jwt: string
}


//FUNCTION TO LOG IN WITH APPLE 
//CALLED IN SIGN-IN.TSX
export async function loginWithApple(idToken: string): Promise<string> {
    const normalizedToken = idToken.trim();
    const res = await fetch(`${API_BASE_URL}/auth/apple`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Send common aliases to tolerate backend DTO naming differences.
      body: JSON.stringify({
        idToken: normalizedToken,
        identityToken: normalizedToken,
        token: normalizedToken,
      }),
    });
  
    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      if (errorText) {
        try {
          const parsed = JSON.parse(errorText) as {
            error?: string;
            detail?: string;
            traceId?: string;
          };
          const message = [parsed.error, parsed.detail, parsed.traceId ? `traceId=${parsed.traceId}` : null]
            .filter(Boolean)
            .join(" | ");
          throw new Error(message || errorText);
        } catch {
          throw new Error(errorText);
        }
      }
      throw new Error(`Login failed with status: ${res.status}`);
    }
  
    const data: LoginResponse = await res.json();
    if (!data.jwt) throw new Error("Login response missing jwt token");
  
    return data.jwt;
  }
