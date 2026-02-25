import { Food, FoodDto } from "@/types/meal";
import { API_BASE_URL } from "./baseUrl";

function parseJsonText<T>(text: string): T {
  if (!text) throw new Error("Server returned empty response body");
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Server returned invalid JSON response");
  }
}

// GET ALL USER MEALS
export async function FetchUserMeals(token: string): Promise<Food[]> {
  if (!token) return [];

  const res = await fetch(`${API_BASE_URL}/food`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Request failed: ${res.status}`);
  }

  return (await res.json()) as Food[];
}

// POST MEAL BY USER
export async function PostUserMeal(token: string, dto: FoodDto): Promise<Food> {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE_URL}/food`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);

  return parseJsonText<Food>(text);
}

// SEND BARCODE TO BACKEND, RECEIVE FOOD
export async function FetchFoodFromBarcode(token: string, barcode: string) {
  if (!token) throw new Error("Missing token");

  const safeBarcode = encodeURIComponent(barcode.trim());
  const res = await fetch(`${API_BASE_URL}/food/scan/${safeBarcode}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(errorText || `Request failed: ${res.status}`);
  }

  return await res.json();
}

export async function DeleteUserMeal(token: string, mealId: string): Promise<void> {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE_URL}/food/${mealId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);
}

export async function UpdateUserMeal(
  token: string,
  mealId: string,
  dto: FoodDto
): Promise<Food> {
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${API_BASE_URL}/food/${mealId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(dto),
  });

  const text = await res.text().catch(() => "");
  if (!res.ok) throw new Error(text || `Request failed: ${res.status}`);

  return parseJsonText<Food>(text);
}
