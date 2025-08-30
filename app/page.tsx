"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

// ----- Types -----
type Ingredient = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  category: "Veggie" | "Protein" | "Bakery" | "Dairy" | "Spice" | "Other";
  expiry: string; // YYYY-MM-DD
  addedOn: string; // YYYY-MM-DD
};

type FridgeItemForAPI = {
  id: string;
  name: string;
  qty: number;
  unit: string;
  category: Ingredient["category"];
  expiresInDays: number;
};

type MealGenInput = {
  people: number;
  mealTime: "breakfast" | "lunch" | "dinner";
  fridge: FridgeItemForAPI[];
};

// ----- Helpers -----
const LS_KEY = "smp.fridge.v1";
const MODAL_KEY = "smp.seen.sampleHint.v1";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(baseISO: string, days: number) {
  const d = new Date(baseISO + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysUntil(dateISO: string): number {
  const base = new Date(new Date().toDateString()).getTime(); // today 00:00
  const tgt = new Date(dateISO + "T00:00:00").getTime();
  return Math.ceil((tgt - base) / 86400000);
}

function getMealTime(): MealGenInput["mealTime"] {
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  return "dinner";
}

function loadFridge(): Ingredient[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveFridge(items: Ingredient[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function randId() {
  return Math.random().toString(36).slice(2, 10);
}

function badgeStyle(days: number): React.CSSProperties {
  // 红：<=2 天；黄：<=5；绿：>5
  const bg = days <= 2 ? "#FFF0F0" : days <= 5 ? "#FCEFC5" : "#E8F8EE";
  const color = days <= 2 ? "#B91C1C" : days <= 5 ? "#92400E" : "#065F46";
  const border =
    days <= 2 ? "1px solid #FECACA" : days <= 5 ? "1px solid #FDE68A" : "1px solid #BBF7D0";
  return {
    background: bg,
    color,
    border,
    fontSize: 12,
    padding: "2px 8px",
    borderRadius: 999,
  };
}

// ----- Page Component -----
export default function Home() {
  // modal
  const [showHint, setShowHint] = useState(false);
  // init from localStorage (seed two samples on first visit)
  useEffect(() => {
    const existing = loadFridge();
    if (existing && existing.length > 0) {
      setItems(existing);
      return;
    }

    // 首次进入：塞两条示例
    const today = todayISO();
    const samples: Ingredient[] = [
      {
        id: randId(),
        name: "Milk",
        qty: 300,
        unit: "ml",
        category: "Dairy",
        expiry: today,                 // 今天到期
        addedOn: today,
      },
      {
        id: randId(),
        name: "Broccoli",
        qty: 200,
        unit: "g",
        category: "Veggie",
        expiry: addDaysISO(today, 2),  // 2 天后到期
        addedOn: today,
      },
    ];

    setItems(samples);
    saveFridge(samples);

    // 如果你有弹窗（showHint / MODAL_KEY），首访也显示一次
    try {
      const seen = localStorage.getItem(MODAL_KEY);
      if (!seen) {
        setShowHint(true);  // 你页面里已定义 showHint / setShowHint
      }
    } catch { }
  }, []);



  function closeHint(persist = true) {
    if (persist) {
      try {
        localStorage.setItem(MODAL_KEY, "1");
      } catch { }
    }
    setShowHint(false);
  }

  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);

  // form state
  const [name, setName] = useState("");
  const [qty, setQty] = useState<number | "">("");
  const [unit, setUnit] = useState("g");
  const [category, setCategory] = useState<Ingredient["category"]>("Veggie");
  const [expiry, setExpiry] = useState(todayISO());

  // init from localStorage
  useEffect(() => {
    setItems(loadFridge());
  }, []);

  // derived sorted items (soonest expiry first)
  const sorted = useMemo(
    () => [...items].sort((a, b) => a.expiry.localeCompare(b.expiry)),
    [items]
  );

  function addItem() {
    if (!name.trim() || !qty || Number(qty) <= 0) return;
    const newItem: Ingredient = {
      id: randId(),
      name: name.trim(),
      qty: Number(qty),
      unit,
      category,
      expiry,
      addedOn: todayISO(),
    };
    const next = [newItem, ...items];
    setItems(next);
    saveFridge(next);
    // reset form
    setName("");
    setQty("");
    setUnit("g");
    setCategory("Veggie");
    setExpiry(todayISO());
  }

  function removeItem(id: string) {
    const next = items.filter((i) => i.id !== id);
    setItems(next);
    saveFridge(next);
  }

  async function onGenerate() {
    if (!items.length) {
      alert("Please add at least one ingredient first.");
      return;
    }
    setLoading(true);
    try {
        // 1) 分颜色 + 同色内按到期更近优先
        const bySoonest = (a: typeof items[number], b: typeof items[number]) =>
        daysUntil(a.expiry) - daysUntil(b.expiry);

        const reds    = items.filter(i => daysUntil(i.expiry) <= 2).sort(bySoonest);
        const yellows = items.filter(i => {
        const d = daysUntil(i.expiry);
        return d > 2 && d <= 5;
        }).sort(bySoonest);
        const greens  = items.filter(i => daysUntil(i.expiry) > 5).sort(bySoonest);

        // 2) 按优先级合并后取前 3 个
        const prioritized = [...reds, ...yellows, ...greens].slice(0, 3);

        localStorage.setItem("smp.lastPicked", JSON.stringify(prioritized.map(p => p.name)));

        // 3) 构造发给后端的 fridge
        const fridge: FridgeItemForAPI[] = prioritized.map(i => ({
        id: i.id,
        name: i.name,
        qty: i.qty,
        unit: i.unit,
        category: i.category,
        expiresInDays: daysUntil(i.expiry),
        }));


      const payload: MealGenInput = {
        people: 1,
        mealTime: getMealTime(),
        fridge,
      };

      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Generate failed");
      const plan = await res.json();

      localStorage.setItem("smp.lastPlan", JSON.stringify(plan));
      window.location.href = "/meal";
    } catch (e: any) {
      console.error(e);
      alert("Failed to generate meal. Check the API route or try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FFF7E1", display: "flex", flexDirection: "column" }}>
      {/* top title */}
      <header style={{ padding: "28px 0" }}>
        <div style={{ display: "grid", placeItems: "center" }}>
          <Image
            src="/assets/title.png"
            alt="Smart MealPlanet"
            width={720}              // adjust to your asset
            height={200}             // aspect ratio placeholder
            priority
            style={{
              width: "min(90vw, 820px)", // responsive max
              height: "auto",
              display: "block",
              filter: "drop-shadow(0 1px 0 rgba(0,0,0,0.03))",
            }}
          />
        </div>
      </header>


      {/* main */}
      <main
        style={{
          width: "100%",
          maxWidth: 1120,
          margin: "0 auto",
          padding: "0 24px 48px",
          display: "flex",
          gap: 24,
          flexWrap: "wrap",
        }}
      >
        {/* left side: list */}
        <section style={{ flex: "1 1 620px", minWidth: 320 }}>
          <div
            style={{
              background: "rgba(255,255,255,0.9)",
              WebkitBackdropFilter: "blur(6px)",
              backdropFilter: "blur(6px)",
              borderRadius: 24,
              padding: 16,
              border: "1px solid #CDE5C6",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}
          >
            {/* list title */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <h2
                style={{
                  paddingLeft: "20px",
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#2F6E34",
                }}
              >
                Your List of Food:
              </h2>
            </div>

            {/* entering list */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "2fr 100px 1fr 1.2fr 1.2fr auto",
                gap: 8,
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <input
                placeholder="name (e.g., egg)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: 8, borderRadius: 12, border: "1px solid #E5E7EB", outline: "none" }}
              />
              <input
                placeholder="qty"
                type="number"
                min="0"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value === "" ? "" : Number(e.target.value))}
                style={{
                  width: "80px",
                  padding: 8,
                  borderRadius: 12,
                  border: "1px solid #E5E7EB",
                  outline: "none",
                }}
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{ padding: 8, borderRadius: 12, border: "1px solid #E5E7EB" }}
              >
                <option>g</option>
                <option>ml</option>
                <option>pcs</option>
                <option>bowl</option>
                <option>cup</option>
              </select>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                style={{ padding: 8, borderRadius: 12, border: "1px solid #E5E7EB" }}
              >
                <option value="Veggie">Veggie</option>
                <option value="Protein">Protein</option>
                <option value="Bakery">Bakery</option>
                <option value="Dairy">Dairy</option>
                <option value="Spice">Spice</option>
                <option value="Other">Other</option>
              </select>
              <input
                type="date"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                style={{ padding: 8, borderRadius: 12, border: "1px solid #E5E7EB" }}
              />
              <button
                onClick={addItem}
                style={{
                  padding: "10px 14px",
                  borderRadius: 14,
                  background: "#2563eb",
                  color: "#fff",
                  border: "none",
                  fontWeight: 600,
                }}
              >
                Add
              </button>
            </div>

            {/* list */}
            <ul style={{ listStyle: "none", padding: 0, margin: 0, borderTop: "1px solid #E6F2E2" }}>
              {sorted.map((i) => {
                const d = daysUntil(i.expiry);
                return (
                  <li
                    key={i.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 4px",
                      borderBottom: "1px solid #E6F2E2",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span
                        style={{
                          height: 10,
                          width: 10,
                          borderRadius: 999,
                          background: d <= 2 ? "#ef4444" : d <= 5 ? "#f59e0b" : "#7BC67E",
                          display: "inline-block",
                        }}
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: 600, color: "#1F5123" }}>{i.name}</p>
                        <p style={{ margin: 0, fontSize: 13, color: "rgba(31,81,35,0.7)" }}>
                          {i.qty} {i.unit} · {i.category}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={badgeStyle(d)}>{d <= 0 ? "Today" : d === 1 ? "Tomorrow" : `In ${d} days`}</span>
                      <button
                        onClick={() => removeItem(i.id)}
                        style={{
                          background: "#ef4444",
                          color: "#fff",
                          border: "none",
                          padding: "6px 10px",
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                        }}
                      >
                        delete
                      </button>
                    </div>
                  </li>
                );
              })}
              {sorted.length === 0 && (
                <li style={{ color: "#6b7280", padding: "12px 4px" }}>No items yet. Add some above!</li>
              )}
            </ul>

            {/* tip */}
            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(31,81,35,0.6)" }}>
              Note: Food close to expiry will be used first in your meal plan!
            </div>
          </div>
        </section>

        {/* right side: cartoon fridge img */}
        <aside style={{ flex: "1 1 380px", minWidth: 300, display: "flex", flexDirection: "column", gap: 16 }}>
          <div
            style={{
              position: "relative",
              background: "rgba(255,255,255,0.9)",
              borderRadius: 24,
              padding: 8,
              border: "1px solid #CDE5C6",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
              minHeight: 220,
              display: "grid",
              placeItems: "center",
            }}
          >
            <Image
              src="/assets/fridge.png"
              alt="Smart Fridge"
              width={480}
              height={480}
              style={{
                maxWidth: "100%",
                height: "auto",
                display: "block",
              }}
            />
          </div>


          {/* generate button */}
          <div style={{ marginTop: "auto" }}>
            <button
              onClick={onGenerate}
              disabled={loading || items.length === 0}
              style={{
                width: "100%",
                padding: "20px 24px",
                borderRadius: 999,
                color: "#fff",
                border: "none",
                fontSize: 22,
                fontWeight: 800,
                boxShadow: "0 8px 20px rgba(58,127,60,0.35)",
                background:
                  loading || items.length === 0
                    ? "#9ca3af"
                    : "linear-gradient(180deg, #5AAE61 0%, #3A7F3C 100%)",
                transform: "translateZ(0)",
              }}
            >
              {loading ? "Generating..." : "Generate Plan"}
            </button>
          </div>
        </aside>
      </main>

      {/* first-visit modal */}
      {showHint && (
        <div
          onClick={() => closeHint()} // click backdrop to close
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()} // prevent closing when clicking the card
            style={{
              width: "min(520px, 92vw)",
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
              border: "1px solid #E5E7EB",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <div
                style={{
                  height: 36,
                  width: 36,
                  borderRadius: 10,
                  background: "#E7F6E2",
                  border: "2px solid #7BC67E",
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <span style={{ fontSize: 18 }}>🌍</span>
              </div>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#1F5123" }}>Welcome to Smart MealPlanet!</h3>
            </div>

            <p style={{ marginTop: 6, marginBottom: 14, color: "#374151", lineHeight: 1.6 }}>
              The items you see now are <b>just examples groceries</b> . Feel free to <b>delete</b> the examples and
              <b> add</b> your own groceries and expiry dates. Your list is saved locally on your device.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => closeHint(true)} // don’t show again
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(180deg, #5AAE61 0%, #3A7F3C 100%)",
                  color: "#fff",
                  fontWeight: 800,
                  boxShadow: "0 6px 18px rgba(58,127,60,0.25)",
                }}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
