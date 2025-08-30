export const runtime = "nodejs";
export async function GET() {
  const aiEnabled = !!process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  return Response.json({ ok: true, aiEnabled, model, ts: new Date().toISOString() });
}
