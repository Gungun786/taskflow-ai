// server/routes/agentRoutes.js
// Reads your real MongoDB tasks → injects as context → calls Claude

const express    = require("express");
const router     = express.Router();
const Anthropic  = require("@anthropic-ai/sdk");
const Task       = require("../models/task");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "messages array required" });
    }

    // ── Fetch live task data ────────────────────────────────────────
    const tasks      = await Task.find({}).lean().limit(200);
    const now        = new Date();
    const pending    = tasks.filter(t => t.status !== "done");
    const done       = tasks.filter(t => t.status === "done");
    const overdue    = pending.filter(t => t.dueDate && new Date(t.dueDate) < now);
    const dueSoon    = pending.filter(t => {
      if (!t.dueDate) return false;
      const diff = (new Date(t.dueDate) - now) / 86400000;
      return diff >= 0 && diff <= 3;
    });
    const highPri    = pending.filter(t => t.priority === "high");
    const progress   = tasks.length
      ? Math.round((done.length / tasks.length) * 100) : 0;

    const ctx = `
=== LIVE TASK DATA (${now.toLocaleDateString("en-IN")}) ===
Total: ${tasks.length} | Completed: ${done.length} | Pending: ${pending.length}
Overdue: ${overdue.length} | Due in 3 days: ${dueSoon.length} | High priority: ${highPri.length}
Progress: ${progress}%

OVERDUE:
${overdue.length ? overdue.map(t => `• [${t.priority}] ${t.title} — due ${new Date(t.dueDate).toLocaleDateString()}`).join("\n") : "None"}

DUE SOON (≤3 days):
${dueSoon.length ? dueSoon.map(t => {
  const d = Math.ceil((new Date(t.dueDate) - now) / 86400000);
  return `• [${t.priority}] ${t.title} — ${d === 0 ? "TODAY" : d === 1 ? "tomorrow" : `in ${d} days`}`;
}).join("\n") : "None"}

HIGH PRIORITY PENDING:
${highPri.length ? highPri.map(t => `• ${t.title} [${t.status}]${t.dueDate ? ` — due ${new Date(t.dueDate).toLocaleDateString()}` : ""}`).join("\n") : "None"}

ALL PENDING:
${pending.length ? pending.map(t => `• [${t.status}][${t.priority}] ${t.title}${t.dueDate ? ` (due ${new Date(t.dueDate).toLocaleDateString()})` : ""}${t.description ? ` — ${t.description.slice(0,80)}` : ""}`).join("\n") : "All done! 🎉"}
`;

    const system = `You are an intelligent task assistant for TaskFlow AI.
You have live access to the user's task data below. Use it to:
- Answer questions about pending, overdue, or completed tasks
- Give reminders and alerts about deadlines
- Analyze progress and suggest what to work on next
- Be encouraging, concise, and use specific task names
- For create/edit/delete actions, politely ask the user to use the UI

${ctx}`;

    // ── Call Claude ─────────────────────────────────────────────────
    const response = await client.messages.create({
      model:      "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system,
      messages: messages.map(m => ({
        role:    m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    });

    const reply = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    res.json({ reply });

  } catch (err) {
    console.error("Agent error:", err.message);
    res.status(500).json({ message: err.message || "Agent error" });
  }
});

module.exports = router;
