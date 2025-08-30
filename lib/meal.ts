// lib/meal.ts
import { differenceInCalendarDays, addDays, isBefore } from "date-fns";
import type { FoodItem } from "./store";

// ✅ 防御：如果没传 now，就用当前时间
export function pickMealType(now: Date = new Date()) {
  const h = now.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "supper";
}

export function scoreUrgency(item: FoodItem, now: Date = new Date()) {
  const daysLeft = differenceInCalendarDays(new Date(item.expiryDate), now);
  let s = 0;
  if (daysLeft <= 0) s -= 1000;
  else if (daysLeft <= 1) s += 100;
  else if (daysLeft <= 3) s += 60;
  else if (daysLeft <= 7) s += 20;

  if (item.storage === "FRIDGE") s += 20;
  else if (item.storage === "PANTRY") s += 10;
  else if (item.storage === "FREEZER") s += 5;

  return s;
}

export function buildHeuristicPlan(
  items: FoodItem[],
  opts?: {
    withinDays?: number;
    servings?: number;
    maxReadyMinutes?: number;
    exclude?: string[];
  }
) {
  const withinDays = opts?.withinDays ?? 5;
  const servings = opts?.servings ?? 1;
  const maxReadyMinutes = opts?.maxReadyMinutes ?? 40;
  const exclude = (opts?.exclude ?? []).map(s => s.toLowerCase());

  const now = new Date();                       // 当前时间
  const end = addDays(now, withinDays);

  const pool = items
    .filter(i => !i.isConsumed && !exclude.includes(i.name.toLowerCase()))
    .filter(i => isBefore(now, new Date(i.expiryDate)) && new Date(i.expiryDate) <= end)
    .sort((a, b) => scoreUrgency(b, now) - scoreUrgency(a, now));

  const chosen = pool.slice(0, 3);

  const mealType = pickMealType(now);           // ✅ 明确传入 now

  const titleCore = chosen.map(x => x.name).slice(0, 2).join(" & ") || "Pantry Mix";
  const title = {
    breakfast: `Quick ${titleCore} Scramble`,
    lunch:     `${titleCore} Stir-fry`,
    dinner:    `${titleCore} One-pan`,
    supper:    `${titleCore} Warm Bowl`
  }[mealType];

  return {
    mealType,
    readyInMinutes: Math.min(25, maxReadyMinutes),
    servings,
    recipes: [{
      title,
      description: "Prioritizes soon-to-expire items.",
      steps: [
        "Prep: wash and cut ingredients.",
        "Heat pan with a bit of oil; add aromatics if available.",
        "Cook harder ingredients first, then softer ones; season to taste.",
        `Serve for ${servings}.`
      ],
      ingredientsUsed: chosen.map(i => ({
        id: i.id,
        name: i.name,
        amount: i.quantity,
        unit: i.unit
      })),
      ingredientsToBuy: [],
      notes: "Add carbs/protein you have on hand if desired."
    }]
  };
}
