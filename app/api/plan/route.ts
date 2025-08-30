// app/api/plan/route.ts
import { readItems } from "@/lib/store";
import { buildHeuristicPlan, pickMealType } from "@/lib/meal";
import { generateMealPlanAI } from "@/lib/ai";

export const runtime = "nodejs";

/**
 * 请求体（可选项都有默认）：
 * {
 *   "servings": 1,
 *   "maxReadyMinutes": 40,
 *   "withinDays": 5,
 *   "exclude": ["peanut","shrimp"],
 *   "diet": "none",
 *   "timezone": "Australia/Melbourne"
 * }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const servings = Number.isInteger(body?.servings) ? body.servings : 1;
  const maxReadyMinutes = Number.isInteger(body?.maxReadyMinutes) ? body.maxReadyMinutes : 40;
  const withinDays = Number.isInteger(body?.withinDays) ? body.withinDays : 5;
  const exclude = Array.isArray(body?.exclude)
    ? body.exclude.map((x: any) => String(x).toLowerCase())
    : [];
  const diet = typeof body?.diet === "string" ? body.diet : "none";
  const timezone = typeof body?.timezone === "string" ? body.timezone : "Australia/Melbourne";

  const items = await readItems();

  // 如果没配 OPENAI_API_KEY，直接走本地规则
  const hasKey = !!process.env.OPENAI_API_KEY;

  if (!hasKey) {
    const plan = buildHeuristicPlan(items, { servings, maxReadyMinutes, withinDays, exclude });
    return Response.json(plan);
  }

  // 有 Key：调用 AI（自动优先使用临期食材）
  try {
    const now = new Date();
    const mealType = pickMealType(now);
    const slimItems = items.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity ?? null,
      unit: i.unit ?? null,
      category: i.category ?? null,
      storage: i.storage,
      expiryDate: i.expiryDate
    }));

    const aiPlan = await generateMealPlanAI(slimItems, {
      mealType,
      servings,
      maxReadyMinutes,
      timezone,
      diet,
      exclude
    });

    return Response.json(aiPlan);
  } catch (e: any) {
    // 失败时兜底：返回本地规则版，服务不中断
    const fallback = buildHeuristicPlan(items, { servings, maxReadyMinutes, withinDays, exclude });
    return Response.json({ ...fallback, _fallback: true, _error: String(e?.message ?? e) }, { status: 200 });
  }
}
