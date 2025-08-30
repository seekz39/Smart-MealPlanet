import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const ITEMS_FILE = path.join(DATA_DIR, "items.json");

export type Storage = "FRIDGE" | "FREEZER" | "PANTRY";

export interface FoodItem {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;          // g/ml/pcs
  category?: string;      // meat/vegetable/dairy/...
  storage: Storage;
  purchasedAt?: string;   // ISO
  expiryDate: string;     // ISO
  notes?: string;
  isConsumed?: boolean;
  createdAt: string;      // ISO
  updatedAt: string;      // ISO
}

async function ensureFile() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.access(ITEMS_FILE);
  } catch {
    await fs.writeFile(ITEMS_FILE, "[]", "utf-8");
  }
}

export async function readItems(): Promise<FoodItem[]> {
  await ensureFile();
  const raw = await fs.readFile(ITEMS_FILE, "utf-8");
  try {
    const arr = JSON.parse(raw) as FoodItem[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function writeItems(items: FoodItem[]) {
  await ensureFile();
  await fs.writeFile(ITEMS_FILE, JSON.stringify(items, null, 2), "utf-8");
}

export async function getItem(id: string) {
  const items = await readItems();
  return items.find(i => i.id === id) ?? null;
}

export async function upsertItem(item: FoodItem) {
  const items = await readItems();
  const idx = items.findIndex(i => i.id === item.id);
  if (idx >= 0) items[idx] = item;
  else items.unshift(item);
  await writeItems(items);
  return item;
}

export async function deleteItem(id: string) {
  const items = await readItems();
  const next = items.filter(i => i.id !== id);
  await writeItems(next);
  return items.length !== next.length;
}
