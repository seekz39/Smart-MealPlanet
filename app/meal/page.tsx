"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type Recipe = {
  title: string;
  description?: string;
  steps: string[];
  ingredientsUsed: Array<{ name: string; amount?: number; unit?: string }>;
  ingredientsToBuy?: Array<{ name: string; amount?: number; unit?: string }>;
};

type Plan = {
  mealType: "breakfast" | "lunch" | "dinner" | "supper" | "snack";
  readyInMinutes: number;
  servings: number;
  recipes: Recipe[];
  _source?: "ai" | "rules";
  _error?: string;
};

export default function MealPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    // Load plan from localStorage. Supports both:
    // 1) { ...plan, _source }    (old shape)
    // 2) { source, plan }        (new route shape)
    try {
      const raw = localStorage.getItem("smp.lastPlan");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && "plan" in parsed) {
          const p = (parsed.plan ?? {}) as Plan;
          // merge top-level source/error if present
          p._source = parsed._source ?? parsed.source ?? p._source;
          p._error = parsed._error ?? p._error;
          setPlan(p);
        } else {
          setPlan(parsed as Plan);
        }
      } else {
        setPlan(null);
      }
    } catch {
      setPlan(null);
    }

    try {
      const p = localStorage.getItem("smp.lastPicked");
      if (p) setPicked(JSON.parse(p));
    } catch {
      setPicked([]);
    }
  }, []);

  // ---------- Empty state ----------
  if (!plan) {
    return (
      <main className="page">
        <div className="titleImgWrap">
          <Image
            src="/assets/plan_title.png"
            alt="Smart MealPlanet — Meal Plan"
            width={520}
            height={140}
            priority
            className="titleImg"
          />
          <h1 className="srOnly">Meal Plan</h1>
        </div>

        <p className="center">No plan found. Please go back to the home page and generate one.</p>
        <div className="center">
          <a href="/">← Back</a>
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const r = plan.recipes?.[0];
  const pickedToShow =
    picked.length > 0 ? picked.slice(0, 3) : (r?.ingredientsUsed ?? []).slice(0, 3).map((g) => g.name);

  // ---------- Normal page ----------
  return (
    <main className="page">
      {/* PNG Title */}
      <div className="titleImgWrap">
        <Image
          src="/assets/plan_title.png"
          alt="Smart MealPlanet — Meal Plan"
          width={520}
          height={140}
          priority
          className="titleImg"
        />
        <h1 className="srOnly">Meal Plan</h1>
      </div>

      {/* Meta badges */}
      <div className="metaRow">
        <span className="badge">{plan.mealType}</span>
        <span className="badge">⏱ {plan.readyInMinutes} min</span>
        <span className="badge">🍽 {plan.servings} servings</span>
        {/* {plan._source && <span className="badge">{plan._source === "ai" ? "🤖 AI" : "⚙️ Rules"}</span>} */}
      </div>

      {/* Picked ingredients */}
      <div className="pickedCard">
        <p className="pickedTitle">
          <b>I picked the following ingredients from your fridge:</b>
        </p>
        <div className="chips">
          {pickedToShow.length ? (
            pickedToShow.map((name, i) => (
              <span className="chip" key={i} title={name}>
                {name}
              </span>
            ))
          ) : (
            <span className="chip muted">(none)</span>
          )}
        </div>
      </div>

      {/* Recipe content */}
      <section className="recipeShell">
        <div className="headerArea">
          <h2 className="recipeTitle">{r?.title ?? "Meal"}</h2>
          {r?.description && <p className="recipeDesc">{r.description}</p>}
        </div>

        {/* Steps */}
        <div className="box stepsBox">
          <h3 className="boxTitle">Steps</h3>
          <ol className="stepsList">
            {(r?.steps ?? []).map((s, i) => (
              <li key={i} className="stepItem">
                {s}
              </li>
            ))}
          </ol>
        </div>

        {/* Used / To buy */}
        <div className="duo">
          <div className="box usedBox">
            <h3 className="boxTitle">Used</h3>
            <ul className="ingredientsList">
              {(r?.ingredientsUsed ?? []).map((g, i) => (
                <li key={i} className="ingredientRow">
                  <span className="ingredientName">{g.name}</span>
                  {g.amount ? <span className="ingredientMeta">{g.amount}{g.unit ?? ""}</span> : null}
                </li>
              ))}
              {(r?.ingredientsUsed ?? []).length === 0 && (
                <li className="emptyHint">No ingredients used.</li>
              )}
            </ul>
          </div>

          <div className="box buyBox">
            <h3 className="boxTitle">To buy</h3>
            <ul className="ingredientsList">
              {(r?.ingredientsToBuy ?? []).map((g, i) => (
                <li key={i} className="ingredientRow">
                  <span className="ingredientName">{g.name}</span>
                  {g.amount ? <span className="ingredientMeta">{g.amount}{g.unit ?? ""}</span> : null}
                </li>
              ))}
              {!(r?.ingredientsToBuy?.length) && (
                <li className="emptyHint">No extra items needed.</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* Actions */}
      <div className="actions">
        <a href="/" className="btn btnGhost">← Return</a>
        <button onClick={() => window.print()} className="btn btnPrimary">Print</button>
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

/** ----------------- CSS (styled-jsx) ----------------- */
const styles = `
:root { --shell-max: 900px; }

.page {
  min-height: 100vh;
  background: #FFF7E1;
  padding: 28px;
  font-size: 18px;
  line-height: 1.7;
}

.center { text-align: center; }

/* PNG title styles */
.titleImgWrap {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 6px 0 8px;
}
.titleImg {
  width: min(520px, 86vw);
  height: auto;
  filter: drop-shadow(0 1px 0 rgba(0,0,0,0.03));
}
/* Keep for a11y/SEO */
.srOnly {
  position: absolute !important;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0);
  white-space: nowrap; border: 0;
}

.metaRow {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
  margin-top: 12px;
  margin-bottom: 8px;
}

.badge {
  background: #ffffff;
  border: 1px solid #CDE5C6;
  color: #1F5123;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.pickedCard {
  margin: 16px auto 24px;
  max-width: var(--shell-max);
  background: rgba(255,255,255,.9);
  border: 1px solid #CDE5C6;
  border-radius: 16px;
  padding: 14px 16px;
}

.pickedTitle {
  margin: 0 0 12px 0;
  color: #1F5123;
  text-align: center;
  font-size: 18px;
  font-weight: 800;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.chip {
  background: #E8F8EE;
  color: #065F46;
  border: 1px solid #BBF7D0;
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 14px;
  font-weight: 800;
}
.chip.muted {
  background: #F3F4F6;
  color: #6B7280;
  border: 1px solid #E5E7EB;
}

/* Recipe shell */
.recipeShell {
  background: rgba(255,255,255,.96);
  border: 1px solid #CDE5C6;
  border-radius: 20px;
  padding: 20px;
  box-shadow: 0 1px 10px rgba(0,0,0,.06);
  max-width: var(--shell-max);
  margin: 0 auto;
}

.headerArea {
  text-align: center;
  margin-bottom: 14px;
}

.recipeTitle {
  margin: 0;
  font-size: 24px;
  color: #1F5123;
  font-weight: 900;
}
.recipeDesc {
  margin: 10px auto 0;
  color: #374151;
  line-height: 1.7;
  max-width: 70ch;
  font-size: 18px;
}

/* Shared box */
.box {
  border-radius: 16px;
  padding: 16px;
  border: 1px solid transparent;
}

/* Steps (blue) */
.stepsBox {
  background: #E6F3FF;
  border-color: #CDE5FF;
  margin-bottom: 16px;
}

/* Two columns */
.duo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/* Used (yellow) */
.usedBox {
  background: #FFF6D9;
  border-color: #FFE9A8;
}

/* To buy (pink) */
.buyBox {
  background: #FFE6EC;
  border-color: #FFCCD6;
}

.boxTitle {
  margin: 0 0 10px 0;
  color: #1F2937;
  font-weight: 900;
  font-size: 20px;
  letter-spacing: .2px;
}

/* Steps list */
.stepsList {
  margin: 0;
  padding-left: 24px;
  font-size: 18px;
}
.stepItem {
  margin: 10px 0;
  line-height: 1.8;
  color: #111827;
}

/* Ingredients */
.ingredientsList {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 18px;
}
.ingredientRow {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 10px 12px;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 12px;
  background: rgba(255,255,255,0.7);
  margin-bottom: 10px;
}
.ingredientName {
  font-weight: 900;
  color: #1F5123;
}
.ingredientMeta {
  font-size: 16px;
  color: #374151;
}
.emptyHint {
  color: #6B7280;
}

/* Stack on small screens */
@media (max-width: 820px) {
  .duo { grid-template-columns: 1fr; }
  .stepsList { padding-left: 22px; }
}

/* Action buttons */
.actions {
  max-width: var(--shell-max);
  margin: 16px auto 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 20px 24px;
  border-radius: 999px;
  text-align: center;
  font-weight: 800;
  font-size: 22px;
  cursor: pointer;
  user-select: none;
  box-shadow: 0 8px 20px rgba(58,127,60,0.15);
}
.btn:active { transform: translateY(1px); }

.btnGhost {
  background: #fff;
  border: 1px solid #CDE5C6;
  color: #1F5123;
  text-decoration: none;
}
.btnPrimary {
  background: linear-gradient(180deg, #5AAE61 0%, #3A7F3C 100%);
  color: #fff;
  border: none;
}
`;
