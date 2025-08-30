import { readItems } from "@/lib/store";
import { buildHeuristicPlan } from "@/lib/meal";

export const runtime = "nodejs";

/**
 * 请求体（都可选，有默认）：
 * {
 *   "servings": 1,
 *   "maxReadyMinutes": 40,
 *   "withinDays": 5,
 *   "exclude": ["peanut", "shrimp"]
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

  const items = await readItems();
  const plan = buildHeuristicPlan({
    items,
    now: new Date(),
    servings,
    maxReadyMinutes,
    withinDays,
    exclude
  });

  return Response.json(plan);
}
