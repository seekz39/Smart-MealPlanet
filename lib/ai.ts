// lib/ai.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export type SimpleItem = {
  id: string;
  name: string;
  storage: "FRIDGE" | "FREEZER" | "PANTRY";
  expiryDate: string;          // ISO
  quantity: number | null;
  unit: string | null;
  category: string | null;
};

export type AIOptions = {
  mealType: "breakfast" | "lunch" | "dinner" | "supper" | "snack";
  servings: number;
  maxReadyMinutes: number;
  timezone?: string;
  diet?: "none" | "vegan" | "vegetarian" | "pescatarian";
  exclude?: string[];
};

export async function generateMealPlanAI(
  items: SimpleItem[],
  opts: AIOptions
) {
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  // 让模型输出固定 JSON 结构
  const schema: any = {
    name: "MealPlan",
    schema: {
      type: "object",
      required: ["mealType", "readyInMinutes", "servings", "recipes"],
      properties: {
        mealType: { type: "string" },
        readyInMinutes: { type: "number" },
        servings: { type: "number" },
        recipes: {
          type: "array",
          minItems: 1,
          items: {
            type: "object",
            required: ["title", "steps", "ingredientsUsed"],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              steps: { type: "array", items: { type: "string" } },
              ingredientsUsed: {
                type: "array",
                items: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    amount: { type: "number" },
                    unit: { type: "string" }
                  }
                }
              },
              ingredientsToBuy: {
                type: "array",
                items: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    amount: { type: "number" },
                    unit: { type: "string" },
                    reason: { type: "string" }
                  }
                }
              },
              notes: { type: "string" }
            }
          }
        }
      }
    },
    strict: true
  };

  const system =
    "You are a helpful meal planner. Prefer items that expire sooner. Keep recipes simple and feasible in home kitchens.";

  const user = {
    pantry: items,
    request: {
      mealType: opts.mealType,
      servings: opts.servings,
      maxReadyMinutes: opts.maxReadyMinutes,
      timezone: opts.timezone ?? "UTC",
      diet: opts.diet ?? "none",
      exclude: opts.exclude ?? []
    }
  };

  // 使用 Responses API（SDK v4）
  const resp = await client.responses.create({
    model,
    input: [
      { role: "system", content: system },
      { role: "user", content: JSON.stringify(user) }
    ],
    response_format: { type: "json_schema", json_schema: schema },
    temperature: 0.6
  });

  // 取 JSON 文本
  const text =
    (resp.output_text ?? "").trim() ||
    (resp.output?.[0] as any)?.content?.[0]?.text ||
    "{}";

  const data = JSON.parse(text);

  // 返回与后端期望结构一致
  return {
    mealType: data.mealType,
    readyInMinutes: data.readyInMinutes,
    servings: data.servings,
    recipes: data.recipes
  };
}
