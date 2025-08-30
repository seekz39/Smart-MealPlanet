// app/page.tsx
export default function Home() {
  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700 }}>Smart MealPlanet</h1>
      <p>Home page is working 🎉</p>
      <a href="/meal" style={{ display: "inline-block", marginTop: 12, padding: "8px 12px", background: "#16a34a", color: "#fff", borderRadius: 8, textDecoration: "none" }}>
        Go to /meal
      </a>
    </main>
  );
}
