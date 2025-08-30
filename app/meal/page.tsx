"use client";

import { useEffect, useState } from "react";

type Plan = {
  mealType: "breakfast"|"lunch"|"dinner"|"supper"|"snack";
  readyInMinutes: number;
  servings: number;
  recipes: Array<{
    title: string;
    description?: string;
    steps: string[];
    ingredientsUsed: Array<{ name: string; amount?: number; unit?: string }>;
    ingredientsToBuy?: Array<{ name: string; amount?: number; unit?: string }>;
  }>;
  _source?: "ai"|"rules";
  _error?: string;
};

export default function MealPage() {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smp.lastPlan");
      if (raw) setPlan(JSON.parse(raw));
    } catch { setPlan(null); }
  }, []);

  if (!plan) {
    return (
      <main style={{ minHeight:"100vh", background:"#FFF7E1", padding:24 }}>
        <h1 style={{ color:"#3A7F3C", fontWeight:900 }}>Meal Plan</h1>
        <p>没有找到计划，请先回到首页生成一次。</p>
        <a href="/">← Back</a>
      </main>
    );
  }

  const r = plan.recipes?.[0];

  return (
    <main style={{ minHeight:"100vh", background:"#FFF7E1", padding:24 }}>
      <h1 style={{ color:"#3A7F3C", fontWeight:900, margin:0 }}>Your Meal Plan</h1>
      <p style={{ color:"#1F5123" }}>
        {plan.mealType} · {plan.readyInMinutes} min · {plan.servings} servings
        {plan._source ? ` · ${plan._source === "ai" ? "AI" : "Rules"}` : ""}
      </p>

      <section style={{
        background:"rgba(255,255,255,.9)", border:"1px solid #CDE5C6",
        borderRadius:16, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,.05)", maxWidth:900
      }}>
        <h2 style={{ marginTop:0 }}>{r?.title ?? "Meal"}</h2>
        {r?.description && <p>{r.description}</p>}

        <h3>Steps</h3>
        <ol>{(r?.steps ?? []).map((s,i)=><li key={i}>{s}</li>)}</ol>

        <h3>Ingredients used</h3>
        <ul>{(r?.ingredientsUsed ?? []).map((g,i)=><li key={i}>
          {g.name}{g.amount ? ` · ${g.amount}${g.unit ?? ""}` : ""}
        </li>)}</ul>

        {!!r?.ingredientsToBuy?.length && (
          <>
            <h3>To buy</h3>
            <ul>{r.ingredientsToBuy.map((g,i)=><li key={i}>
              {g.name}{g.amount ? ` · ${g.amount}${g.unit ?? ""}` : ""}
            </li>)}</ul>
          </>
        )}
      </section>
    </main>
  );
}
