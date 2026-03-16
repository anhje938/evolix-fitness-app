export type FoodSourceType =
  | "quickAdd"
  | "composedMeal"
  | "manual"
  | "qr"
  | (string & {});

export type Food = {
  id: string;
  title: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  timestampUtc: string;
  sourceComposedMealId?: string | null;
  sourceType?: FoodSourceType | null;
  sourceServings?: number | null;
};

export type FoodDto = {
  title: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  timestampUtc: string;
  sourceComposedMealId?: string | null;
  sourceType?: FoodSourceType | null;
  sourceServings?: number | null;
};

export type FoodFromBarcode = {
  title: string;
  caloriesPr100: number;
  proteinsPr100: number;
  carbsPr100: number;
  fatsPr100: number;
};

export type ComposedMealIngredient = {
  id: string;
  name: string;
  amountGrams: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  sortOrder: number;
};

export type UpsertComposedMealIngredientDto = {
  name: string;
  amountGrams: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  sortOrder: number;
};

export type ComposedMeal = {
  id: string;
  name: string;
  isFavorite: boolean;
  createdUtc: string;
  updatedUtc: string;
  lastUsedUtc?: string | null;
  totalCalories: number;
  totalProteins: number;
  totalCarbs: number;
  totalFats: number;
  ingredientCount: number;
  ingredients: ComposedMealIngredient[];
};

export type UpsertComposedMealDto = {
  name: string;
  isFavorite: boolean;
  ingredients: UpsertComposedMealIngredientDto[];
};

export type LogComposedMealDto = {
  servings?: number;
  timestampUtc?: string;
};

export type ComposedMealHistoryItem = {
  foodLogId: string;
  composedMealId: string;
  composedMealName: string;
  loggedTitle: string;
  servings: number;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  timestampUtc: string;
};

export type RelogComposedMealHistoryDto = {
  servings?: number;
  timestampUtc?: string;
};
