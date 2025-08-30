import { nanoid } from "nanoid";
import { readItems, upsertItem, FoodItem } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  const items = await readItems();
  return Response.json({ items });
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    if (!data?.name || !data?.expiryDate) {
      return Response.json({ error: "name 和 expiryDate 为必填（ISO）" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const item: FoodItem = {
      id: nanoid(),
      name: String(data.name),
      quantity: typeof data.quantity === "number" ? data.quantity : undefined,
      unit: data.unit ? String(data.unit) : undefined,
      category: data.category ? String(data.category) : undefined,
      storage: ["FRIDGE","FREEZER","PANTRY"].includes(data.storage) ? data.storage : "FRIDGE",
      purchasedAt: data.purchasedAt ? String(data.purchasedAt) : now,
      expiryDate: String(data.expiryDate),
      notes: data.notes ? String(data.notes) : undefined,
      isConsumed: false,
      createdAt: now,
      updatedAt: now
    };

    await upsertItem(item);
    return Response.json({ item }, { status: 201 });
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "Invalid JSON" }, { status: 400 });
  }
}
