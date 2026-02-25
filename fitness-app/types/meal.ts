export type Food = {
    id: string;
    title: string;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    timestampUtc: string;
}

export type FoodDto = {
    title: string;
    calories: number;
    proteins: number;
    carbs: number;
    fats: number;
    timestampUtc: string;
}

export type FoodFromBarcode = {
    title: string;
    caloriesPr100: number;
    proteinsPr100: number;
    carbsPr100: number;
    fatsPr100: number;
}

