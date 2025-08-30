// lib/ai.ts
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ItemLite = {
  id: string;
  name: string;
  quantity?: number | null;
  unit?: string | null;
  category?: string | null;
  storage: "FRIDGE" | "FREEZER" | "PANTRY";
  expiryDate: string; // ISO
};

type Constraints = {
  mealType: "breakfast" | "lunch" | "dinner" | "supper" | "snack";
  servings: number;
  maxReadyMinutes: number;
  timezone: string;
  diet: string;
  exclude: string[];
};

export async function generateMealPlanAI(items: ItemLite[], c: Constraints) {
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

  // 结构化输出的 JSON Schema（严格）
  const schema = {
    name: "meal_plan",
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: ["mealType", "readyInMinutes", "servings", "recipes"],
      properties: {
        mealType: { type: "string", enum: ["breakfast","lunch","dinner","supper","snack"] },
        readyInMinutes: { type: "integer" },
        servings: { type: "integer" },
        recipes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title","steps","ingredientsUsed","ingredientsToBuy"],
            properties: {
              title: { type: "string" },
              description: { type: "string" },
              steps: { type: "array", items: { type: "string" } },
              ingredientsUsed: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id","name"],
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
                  additionalProperties: false,
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    amount: { type: "number" },
                    unit: { type: "string" },
                    reason: { type: "string" }
                  }
                }
              },
              notes: { type: "string" },
              nutrition: {
                type: "object",
                additionalProperties: false,
                properties: {
                  kcal: { type: "number" },
                  protein_g: { type: "number" },
                  carbs_g: { type: "number" },
                  fat_g: { type: "number" }
                }
              }
            }
          }
        }
      }
    }
  } as const;

  const sys = [
    "You are a culinary planner that minimizes food waste.",
    "Use items expiring soon first. Avoid allergens in exclude.",
    "Return JSON only that matches the schema. Keep steps concise."
  ].join(" ");

  const prompt = `
Generate ONE ${c.mealType} meal plan for right now in timezone ${c.timezone}.
Constraints: servings=${c.servings}, ready<=${c.maxReadyMinutes}min, diet=${c.diet}, exclude=${JSON.stringify(c.exclude)}.
The user’s 'virtual fridge' items (with expiry ISO): ${JSON.stringify(items)}
Return only JSON following the provided schema.
`.trim();

  const resp = await client.responses.create({
    model,
    input: [
      { role: "system", content: sys },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_schema", json_schema: schema }
  });

  // SDK 会把文本汇总在 output_text（是个字符串，按我们要求应是 JSON）
  const text = (resp as any).output_text as string;
  const parsed = JSON.parse(text); // 若不符合会抛错
  return parsed;
}
