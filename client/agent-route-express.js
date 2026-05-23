// routes/agent.js
// Express router for the AI agent endpoint
// Connects to MongoDB tasks, injects them as context, calls Anthropic API

const express = require("express");
const router  = express.Router();
const Anthropic = require("@anthropic-ai/sdk");

// Import your Task model (adjust path as needed)
const Task = require("../models/Task");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST /api/agent/chat
router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "messages array required" });
    }

    // ── 1. Fetch current task data from MongoDB ──────────────────────
    const tasks = await Task.find({})
      .populate("project", "name")
      .lean()
      .limit(200);

    const now = new Date();

    // Build rich context string from real task data
    const pending  = tasks.filter(t => t.status !== "done");
    const done     = tasks.filter(t => t.status === "done");
    const overdue  = pending.filter(t => t.dueDate && new Date(t.dueDate) < now);
    const dueSoon  = pending.filter(t => {
      if (!t.dueDate) return false;
      const diff = (new Date(t.dueDate) - now) / 86400000;
      return diff >= 0 && diff <= 3;
    });
    const highPriority = pending.filter(t => t.priority === "high");

    const taskContext = `
=== TASK MANAGER CONTEXT (${now.toLocaleDateString()}) ===

SUMMARY:
- Total tasks: ${tasks.length}
- Completed: ${done.length}
- Pending: ${pending.length}
- Overdue: ${overdue.length}
- Due within 3 days: ${dueSoon.length}
- High priority pending: ${highPriority.length}
- Progress: ${tasks.length ? Math.round((done.length / tasks.length) * 100) : 0}%

OVERDUE TASKS (${overdue.length}):
${overdue.length === 0 ? "None" : overdue.map(t =>
  `• [${t.priority?.toUpperCase()}] ${t.title} — due ${new Date(t.dueDate).toLocaleDateString()}${t.project?.name ? ` (${t.project.name})` : ""}`
).join("\n")}

DUE SOON (next 3 days):
${dueSoon.length === 0 ? "None" : dueSoon.map(t => {
  const diff = Math.ceil((new Date(t.dueDate) - now) / 86400000);
  return `• [${t.priority?.toUpperCase()}] ${t.title} — due ${diff === 0 ? "TODAY" : diff === 1 ? "tomorrow" : `in ${diff} days`}`;
}).join("\n")}

HIGH PRIORITY PENDING:
${highPriority.length === 0 ? "None" : highPriority.map(t =>
  `• ${t.title} [${t.status}]${t.dueDate ? ` — due ${new Date(t.dueDate).toLocaleDateString()}` : " — no due date"}`
).join("\n")}

ALL PENDING TASKS:
${pending.length === 0 ? "All tasks completed!" : pending.map(t =>
  `• [${t.status}] [${t.priority}] ${t.title}${t.dueDate ? ` (due: ${new Date(t.dueDate).toLocaleDateString()})` : ""}${t.description ? ` — ${t.description.slice(0,80)}` : ""}`
).join("\n")}
`;

    // ── 2. System prompt ────────────────────────────────────────────
    const systemPrompt = `You are an intelligent task management assistant embedded in a project management app.

You have access to the user's current task data (injected below). Use it to:
- Answer questions about pending, overdue, or completed tasks
- Give reminders about upcoming deadlines
- Analyze progress and workload
- Provide encouraging, actionable advice
- Suggest what to work on next based on priority and due dates

Be concise, friendly, and helpful. Format lists with bullet points. Use specific task names from the context. If asked to create/edit/delete tasks, explain that the user should use the UI for those actions.

${taskContext}`;

    // ── 3. Call Anthropic Claude ────────────────────────────────────
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    });

    const reply = response.content
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");

    res.json({ reply });

  } catch (err) {
    console.error("Agent error:", err);
    res.status(500).json({ message: err.message || "Agent error" });
  }
});

module.exports = router;
