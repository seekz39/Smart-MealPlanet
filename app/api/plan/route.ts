// app/api/plan/route.ts
import { readItems } from "../../../lib/store";
import { buildHeuristicPlan, pickMealType } from "../../../lib/meal";
import { generateMealPlanAI } from "../../../lib/ai";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const servings = Number.isInteger(body.servings) ? body.servings : 1;
  const maxReadyMinutes = Number.isInteger(body.maxReadyMinutes) ? body.maxReadyMinutes : 30;
  const withinDays = Number.isInteger(body.withinDays) ? body.withinDays : 5;
  const exclude = Array.isArray(body.exclude) ? body.exclude.map((s: any) => String(s)) : [];

  let items = await readItems();

  // 支持把前端临时传来的 fridge 合并（仅用于当次，不落盘）
  if (Array.isArray(body.fridge) && body.fridge.length) {
    const now = new Date();
    const add = body.fridge.map((f: any) => ({
      id: String(f.id ?? Math.random().toString(36).slice(2)),
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

  // —— 有 Key 时先走 OpenAI ——
  if (process.env.OPENAI_API_KEY) {
    try {
      const ai = await generateMealPlanAI(
        items.map(i => ({
          id: i.id,
          name: i.name,
          storage: i.storage,
          expiryDate: i.expiryDate,
          quantity: i.quantity ?? null,
          unit: i.unit ?? null,
          category: i.category ?? null,
        })),
        {
          mealType: pickMealType(new Date()),
          servings,
          maxReadyMinutes,
          timezone: "Australia/Melbourne",
          diet: "none",
          exclude,
        }
      );
      return Response.json({ ...ai, _source: "ai" });
    } catch (e: any) {
      console.warn("[/api/plan] AI failed, falling back:", e?.message || e);
      // 继续兜底
    }
  }

  // —— 规则兜底 ——
  const plan = buildHeuristicPlan(items, { servings, maxReadyMinutes, withinDays, exclude });
  return Response.json({ ...plan, _source: "rules" });
}
