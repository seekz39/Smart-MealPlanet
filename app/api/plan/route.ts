// app/api/plan/route.ts
import { readItems } from "../../../lib/store";
import { buildHeuristicPlan, pickMealType } from "../../../lib/meal";

export const runtime = "nodejs";

type ItemForAI = {
  id: string;
  name: string;
  storage: string;
  expiryDate: string;
  quantity: number | null;
  unit: string | null;
  category: string | null;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const servings = Number.isInteger(body.servings) ? body.servings : 1;
  const maxReadyMinutes = Number.isInteger(body.maxReadyMinutes) ? body.maxReadyMinutes : 30;
  const withinDays = Number.isInteger(body.withinDays) ? body.withinDays : 5;
  const exclude = Array.isArray(body.exclude) ? body.exclude.map((s: any) => String(s)) : [];

  let items = await readItems();

  // 合并前端临时 fridge（仅本次）
  if (Array.isArray(body.fridge) && body.fridge.length) {
    const now = new Date();
    const add = body.fridge.map((f: any) => ({
      id: String(f.id ?? crypto.randomUUID()),
      name: String(f.name),
      quantity: Number(f.qty ?? 0) || undefined,
      unit: f.unit ? String(f.unit) : undefined,
      category: f.category ? String(f.category) : undefined,
      storage: "FRIDGE" as const,
      purchasedAt: now.toISOString(),
      expiryDate: new Date(now.getTime() + Number(f.expiresInDays ?? 0) * 86400000).toISOString(),
      notes: "",
      isConsumed: false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }));
    items = [...add, ...items];
  }

  const googleKey = process.env.GOOGLE_API_KEY; // ✅ 你现有的环境变量名
  if (!googleKey) {
    const plan = buildHeuristicPlan(items, { servings, maxReadyMinutes, withinDays, exclude });
    return Response.json({ ...plan, _source: "rules", _error: "NO_GOOGLE_API_KEY" });
  }

  // ---- 构造 prompt（让模型只回 JSON，字段与你的前端 Plan 类型匹配） ----
  const mealType = pickMealType(new Date());
  const itemsForAI: ItemForAI[] = items.map(i => ({
    id: i.id,
    name: i.name,
    storage: i.storage,
    expiryDate: i.expiryDate,
    quantity: i.quantity ?? null,
    unit: i.unit ?? null,
    category: i.category ?? null,
  }));

  const prompt = `
You are a meal planner. Prefer ingredients expiring the soonest.
Return ONLY valid JSON (no markdown, no extra text) with this schema:

{
  "mealType": "breakfast" | "lunch" | "dinner" | "supper" | "snack",
  "readyInMinutes": number,
  "servings": number,
  "recipes": [
    {
      "title": string,
      "description"?: string,
      "steps": string[],
      "ingredientsUsed": [{"name": string, "amount"?: number, "unit"?: string}],
      "ingredientsToBuy"?: [{"name": string, "amount"?: number, "unit"?: string}]
    }
  ],
  "_source"?: "ai" | "rules"
}

Constraints:
- "mealType" must be "${mealType}"
- "servings" must be ${servings}
- "readyInMinutes" must be <= ${maxReadyMinutes}
- Exclude these ingredients if possible: ${exclude.join(", ") || "(none)"}
- Use these available items first (name, qty, unit, ~daysToExpire inferred from expiryDate): 
${itemsForAI.map(i => `- ${i.name} ${i.quantity ?? ""} ${i.unit ?? ""} | category=${i.category ?? "-"} | expiry=${i.expiryDate}`).join("\n")}
- If something is missing, add to "ingredientsToBuy" with reasonable amounts.
`.trim();

  try {
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

    const payload = {
      contents: [
        {
          role: "user",                // ✅ role 在 contents 层
          parts: [{ text: prompt }],   // ✅ parts 里是 {text}
        },
      ],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json", // ✅ 让模型直接返回 JSON 字符串
      },
    };

    // 可调试：console.log('Gemini payload =', JSON.stringify(payload));

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": googleKey,
      },
      body: JSON.stringify(payload),
    });

    const json = await resp.json();

    if (!resp.ok) {
      const msg =
        json?.error?.message ||
        JSON.stringify(json);
      // 回退到 rules
      const fallback = buildHeuristicPlan(items, { servings, maxReadyMinutes, withinDays, exclude });
      return Response.json({ ...fallback, _source: "rules", _error: msg });
    }

    // 取文本并解析
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      const fallback = buildHeuristicPlan(items, { servings, maxReadyMinutes, withinDays, exclude });
      return Response.json({ ...fallback, _source: "rules", _error: "NO_TEXT" });
    }

    let plan;
    try {
      plan = JSON.parse(text);
    } catch {
      const fallback = buildHeuristicPlan(items, { servings, maxReadyMinutes, withinDays, exclude });
      return Response.json({ ...fallback, _source: "rules", _error: "BAD_JSON", raw: text });
    }

    plan._source = "ai";
    if (!plan.mealType) plan.mealType = mealType;
    if (!plan.servings) plan.servings = servings;

    return Response.json(plan);
  } catch (e: any) {
    const msg = e?.message || String(e);
    const fallback = buildHeuristicPlan(items, { servings, maxReadyMinutes, withinDays, exclude });
    return Response.json({ ...fallback, _source: "rules", _error: msg });
  }
}
