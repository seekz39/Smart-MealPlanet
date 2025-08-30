// lib/ai.ts
import { GoogleGenerativeAI } from "@google/generative-ai";

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

export class AIUnavailableError extends Error {
  constructor(public reason: "missing_key" | "model_error" | "other", message?: string) {
    super(message || reason);
    this.name = "AIUnavailableError";
  }
}

export async function generateMealPlanAI(items: SimpleItem[], opts: AIOptions) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new AIUnavailableError("missing_key", "GOOGLE_API_KEY missing");

  const modelId = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  console.log("[/api/plan] Gemini model:", modelId, "Key?", !!apiKey);

  const genAI = new GoogleGenerativeAI(apiKey);

  // 结构化 JSON 输出（Gemini 的 responseSchema）
  const responseSchema = {
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
  } as const;

  const system =
    "You are a helpful zero-waste meal planner. Prefer items that expire sooner. Keep recipes simple for home kitchens. Return ONLY JSON.";

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

  const model = genAI.getGenerativeModel({
    model: modelId,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema
    }
  });

  const prompt = `${system}\n\nUSER:\n${JSON.stringify(user)}`;

  let result;
  try {
    result = await model.generateContent([
      { role: "user", parts: [{ text: prompt }] }
    ]);
  } catch (e: any) {
    console.error("[/api/plan] Gemini call failed:", e?.message || e);
    throw new AIUnavailableError("model_error", e?.message);
  }

  let text = "";
  try {
 
    if (typeof result?.response?.text === "function") {
      text = String(result.response.text() || "");
    } else if (result && "text" in result) {

      text = String(result.text || "");
    } else {

      const parts = result?.response?.candidates?.[0]?.content?.parts ?? [];
      text = parts.map((p: any) => p?.text || "").join("");
    }
  } catch {
  }

  if (!text) throw new AIUnavailableError("model_error", "Gemini returned empty content");

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}$/);
    data = match ? JSON.parse(match[0]) : {};
  }

  console.log("[/api/plan] Gemini OK:", data?.mealType, "•", data?.recipes?.[0]?.title ?? "(no title)");

  return {
    mealType: data.mealType,
    readyInMinutes: data.readyInMinutes,
    servings: data.servings,
    recipes: data.recipes
  };
}
