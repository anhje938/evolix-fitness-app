import { Food } from "@/types/meal";

export function calcTotalMacros(foods: Food[]){

    let calories = 0;
    let proteins = 0;
    let carbs = 0;
    let fats = 0;

    foods.forEach((food) => {
        calories += food.calories;
        proteins += food.proteins;
        carbs += food.carbs;
        fats += food.fats;
    });

    return {
        totalCalories: calories,
        totalProteins: proteins,
        totalCarbs: carbs,
        totalFats: fats,

    }

}