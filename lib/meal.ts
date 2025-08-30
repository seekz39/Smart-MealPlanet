import { differenceInCalendarDays, addDays, isBefore } from "date-fns";
import { FoodItem } from "./store";

export function scoreUrgency(item: FoodItem, now: Date) {
  const daysLeft = differenceInCalendarDays(new Date(item.expiryDate), now);
  let s = 0;
  if (daysLeft <= 0) s -= 1000;
  else if (daysLeft <= 1) s += 100;
  else if (daysLeft <= 3) s += 60;
  else if (daysLeft <= 7) s += 20;
  // storage 权重
  if (item.storage === "FRIDGE") s += 20;
  else if (item.storage === "PANTRY") s += 10;
  else if (item.storage === "FREEZER") s += 5;
  return s;
}

export function pickMealType(now: Date) {
  const h = now.getHours();
  if (h < 11) return "breakfast";
  if (h < 15) return "lunch";
  if (h < 21) return "dinner";
  return "supper";
}

export function selectExpiring(
  items: FoodItem[],
  now: Date,
  withinDays = 5
) {
  const end = addDays(now, withinDays);
  return items
    .filter(i =>
      !i.isConsumed &&
      isBefore(now, new Date(i.expiryDate)) &&
      new Date(i.expiryDate) <= end
    )
    .sort((a, b) => scoreUrgency(b, now) - scoreUrgency(a, now));
}

// 非 AI：根据食材类别拼装一个简易食谱
export function buildHeuristicPlan(params: {
  items: FoodItem[];
  now: Date;
  servings: number;
  maxReadyMinutes: number;
  withinDays: number;
  exclude: string[];
}) {
  const { items, now, servings, maxReadyMinutes, withinDays, exclude } = params;
  const mealType = pickMealType(now);

  const pool = selectExpiring(
    items.filter(i => !exclude.includes(i.name.toLowerCase())),
    now,
    withinDays
  );

  const take = (n: number) => pool.slice(0, n);

  const chosen = take(3); // 最多拿 3 种临期食材拼一个菜
  const titleCore =
    chosen.map(x => x.name).slice(0, 2).join(" & ") || "Simple Pantry Bowl";

  const title = {
    breakfast: `Quick ${titleCore} Scramble`,
    lunch:     `${titleCore} Stir-fry`,
    dinner:    `${titleCore} One-pan`,
    supper:    `${titleCore} Warm Bowl`
  }[mealType];

  const steps = [
    "Prep: Wash, peel, and cut the ingredients into bite-sized pieces.",
    "Heat a pan with a bit of oil, add aromatics if you have (garlic/onion).",
    "Add the harder ingredients first, then softer ones. Stir-fry or sauté.",
    "Season with salt/pepper/soy sauce or your preferred spices.",
    `Cook until tender (~${Math.min(15, maxReadyMinutes)} min).`,
    `Serve for ${servings} ${servings > 1 ? "people" : "person"}.`
  ];

  return {
    mealType,
    readyInMinutes: Math.min(25, maxReadyMinutes),
    servings,
    recipes: [
      {
        title,
        description: "A quick meal prioritizing soon-to-expire items.",
        steps,
        ingredientsUsed: chosen.map(i => ({
          id: i.id,
          name: i.name,
          amount: i.quantity,
          unit: i.unit
        })),
        ingredientsToBuy: [],
        notes: "Feel free to adjust seasoning and add carbs/proteins you have."
      }
    ]
  };
}
