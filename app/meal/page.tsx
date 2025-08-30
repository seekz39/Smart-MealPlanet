"use client";

import { useEffect, useState } from "react";

type Plan = {
  mealType: "breakfast" | "lunch" | "dinner" | "supper" | "snack";
  readyInMinutes: number;
  servings: number;
  recipes: Array<{
    title: string;
    description?: string;
    steps: string[];
    ingredientsUsed: Array<{ name: string; amount?: number; unit?: string }>;
    ingredientsToBuy?: Array<{ name: string; amount?: number; unit?: string }>;
  }>;
  _source?: "ai" | "rules";
  _error?: string;
};

export default function MealPage() {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [picked, setPicked] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("smp.lastPlan");
      if (raw) setPlan(JSON.parse(raw));
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

  if (!plan) {
    return (
      <main className="page">
        <h1 className="title">Meal Plan</h1>
        <p className="center">No plan found. Please go back to the home page and generate one.</p>
        <div className="center">
          <a href="/">← Back</a>
        </div>
        <style jsx>{styles}</style>
      </main>
    );
  }

  const r = plan.recipes?.[0];

  // 没有 lastPicked 时，从 ingredientsUsed 里取前 3 个兜底
  const pickedToShow =
    picked.length > 0 ? picked.slice(0, 3) : (r?.ingredientsUsed ?? []).slice(0, 3).map((g) => g.name);

  return (
    <main className="page">
      {/* 顶部标题 */}
      <h1 className="title">Meal Plan</h1>

      {/* 元信息徽章（居中） */}
      <div className="metaRow">
        <span className="badge">{plan.mealType}</span>
        <span className="badge">⏱ {plan.readyInMinutes} min</span>
        <span className="badge">🍽 {plan.servings} servings</span>
        {plan._source && <span className="badge">{plan._source === "ai" ? "🤖 AI" : "⚙️ Rules"}</span>}
      </div>

      {/* 选中食材（英文 chips） */}
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

      {/* 食谱大白框：顶部 Steps（通栏），下面 Used / To buy 并排 */}
      <section className="recipeShell">
        <div className="headerArea">
          <h2 className="recipeTitle">{r?.title ?? "Meal"}</h2>
          {r?.description && <p className="recipeDesc">{r.description}</p>}
        </div>

        {/* 顶部通栏：Steps（浅蓝） */}
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

        {/* 下方并排：Used（左，浅黄） | To buy（右，粉） */}
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

      {/* 操作区：贴着大白框底部，等宽，尺寸与首页一致 */}
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
  font-size: 18px;            /* 基础字号放大 */
  line-height: 1.7;
}

.center { text-align: center; }

.title {
  color: #3A7F3C;
  font-weight: 900;
  margin: 0;
  text-align: center;
  letter-spacing: 0.3px;
  font-size: 34px;            /* 更大标题 */
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
  font-size: 14px;            /* 放大徽章字体 */
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
  font-size: 18px;            /* 放大提示文字 */
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

/* 食谱大白框 */
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
  font-size: 24px;            /* 放大标题 */
  color: #1F5123;
  font-weight: 900;
}
.recipeDesc {
  margin: 10px auto 0;
  color: #374151;
  line-height: 1.7;
  max-width: 70ch;
  font-size: 18px;            /* 放大描述 */
}

/* 统一小框样式 */
.box {
  border-radius: 16px;
  padding: 16px;
  border: 1px solid transparent;
}

/* 浅蓝 Steps */
.stepsBox {
  background: #E6F3FF;
  border-color: #CDE5FF;
  margin-bottom: 16px;
}

/* duo：Used/To buy 并排（左/右） */
.duo {
  display: grid;
  grid-template-columns: 1fr 1fr;   /* 并排 */
  gap: 16px;
}

/* 浅黄 Used（左） */
.usedBox {
  background: #FFF6D9;
  border-color: #FFE9A8;
}

/* 粉色 To buy（右） */
.buyBox {
  background: #FFE6EC;
  border-color: #FFCCD6;
}

.boxTitle {
  margin: 0 0 10px 0;
  color: #1F2937;
  font-weight: 900;
  font-size: 20px;            /* 放大段标题 */
  letter-spacing: .2px;
}

/* Steps 列表 */
.stepsList {
  margin: 0;
  padding-left: 24px;
  font-size: 18px;            /* 放大步骤字体 */
}
.stepItem {
  margin: 10px 0;
  line-height: 1.8;
  color: #111827;
}

/* Ingredients 列表 */
.ingredientsList {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 18px;            /* 放大食材字体 */
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

/* 小屏：Used/To buy 自动堆叠 */
@media (max-width: 820px) {
  .duo { grid-template-columns: 1fr; }
  .stepsList { padding-left: 22px; }
}

/* 操作区：与大白框等宽，按钮尺寸与首页一致 */
.actions {
  max-width: var(--shell-max);
  margin: 16px auto 0;
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.btn {
  flex: 1;
  padding: 20px 24px;                 /* 与首页一致 */
  border-radius: 999px;
  text-align: center;
  font-weight: 800;
  font-size: 22px;                    /* 与首页一致：放大 */
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
