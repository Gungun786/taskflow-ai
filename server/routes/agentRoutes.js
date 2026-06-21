// server/routes/agentRoutes.js
// Reads your real MongoDB tasks → injects as context → calls Claude, Gemini, or falls back to local heuristics

const express        = require("express");
const router         = express.Router();
const Anthropic      = require("@anthropic-ai/sdk");
const Task           = require("../models/task");
const ChatMessage    = require("../models/chatMessage");
const authMiddleware = require("../middleware/authMiddleware");

// Require auth for all agent routes
router.use(authMiddleware);

// Lazily load Anthropic client to avoid crashes if API key is not present
let anthropicClient = null;
function getAnthropicClient() {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("Anthropic API key missing");
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

// Helper to call Gemini API directly without SDK
async function callGemini(systemPrompt, messages) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key missing");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));

  const payload = {
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    contents
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Gemini API error: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
    return data.candidates[0].content.parts[0].text;
  }

  throw new Error("Invalid response from Gemini API");
}

// Local offline heuristic fallback
function getHeuristicResponse(query, tasks, pending, done, overdue, dueSoon, highPri, progress) {
  const q = query.toLowerCase();

  const formatTask = t => {
    let line = `• **${t.title}** (Priority: ${t.priority}`;
    if (t.dueDate) {
      line += `, Due: ${new Date(t.dueDate).toLocaleDateString("en-IN")}`;
    }
    line += ")";
    if (t.description) {
      const desc = t.description.length > 60 ? t.description.slice(0, 57) + "..." : t.description;
      line += ` — *${desc}*`;
    }
    return line;
  };

  if (q.match(/\b(hi|hello|hey|greetings|good morning|good afternoon)\b/)) {
    return `Hello! 👋 I am your local AI Task Assistant.

I am running in **Offline Heuristic Mode** because no API key (Gemini or Anthropic) is configured. However, I can still analyze your tasks and answer queries like:
- "What tasks are pending?"
- "Show me overdue tasks"
- "What is my progress?"
- "Remind me about high priority tasks"
- "Which tasks are due soon?"
- "Summarize my workload"

How can I help you manage your tasks today?`;
  }

  if (q.includes("overdue") || q.includes("late") || q.includes("past due")) {
    if (overdue.length === 0) {
      return `🎉 Great news! You have no overdue tasks at the moment. Keep it up!`;
    }
    const list = overdue.map(formatTask).join("\n");
    return `⚠️ You have **${overdue.length} overdue task(s)**:\n\n${list}\n\nI recommend addressing these as soon as possible to get back on track!`;
  }

  if (q.includes("soon") || q.includes("due in") || q.includes("deadline") || q.includes("calendar") || q.includes("next days") || q.includes("upcoming")) {
    if (dueSoon.length === 0) {
      return `You don't have any pending tasks due within the next 3 days. Nice job staying ahead!`;
    }
    const list = dueSoon.map(t => {
      const diff = Math.ceil((new Date(t.dueDate) - new Date()) / 86400000);
      const dayStr = diff === 0 ? "TODAY" : diff === 1 ? "tomorrow" : `in ${diff} days`;
      return `• **${t.title}** — due **${dayStr}** (${new Date(t.dueDate).toLocaleDateString("en-IN")})`;
    }).join("\n");
    return `📅 Here are your tasks due in the next 3 days:\n\n${list}\n\nMake sure to complete these on time!`;
  }

  if (q.includes("high") || q.includes("priority") || q.includes("urgent") || q.includes("critical")) {
    if (highPri.length === 0) {
      return `You have no high-priority pending tasks right now.`;
    }
    const list = highPri.map(formatTask).join("\n");
    return `🔥 Here are your **high-priority pending tasks**:\n\n${list}\n\nFocusing on these will help you make the most impact!`;
  }

  if (q.includes("pending") || q.includes("todo") || q.includes("to do") || q.includes("in progress") || q.includes("in-progress") || q.includes("list")) {
    if (pending.length === 0) {
      return `🎉 All tasks are completed! You have no pending tasks. Enjoy your free time or add a new task!`;
    }
    const list = pending.slice(0, 10).map(formatTask).join("\n");
    const countStr = pending.length > 10 ? `\n*(Showing top 10 of ${pending.length} pending tasks)*` : "";
    return `📋 You have **${pending.length} pending task(s)**:\n\n${list}${countStr}`;
  }

  if (q.includes("progress") || q.includes("completed") || q.includes("percent") || q.includes("done") || q.includes("stat")) {
    return `📊 **Your Task Progress:**
- **Completion Rate:** ${progress}%
- **Completed Tasks:** ${done.length}
- **Pending Tasks:** ${pending.length}
- **Overdue Tasks:** ${overdue.length}

Keep pushing forward to bring that completion rate closer to 100%! 🚀`;
  }

  const overdueAlert = overdue.length ? `\n⚠️ **${overdue.length} tasks are overdue!**` : "";
  const soonAlert = dueSoon.length ? `\n📅 **${dueSoon.length} tasks are due in the next 3 days.**` : "";
  const highAlert = highPri.length ? `\n🔥 **${highPri.length} high priority tasks pending.**` : "";
  
  const suggestions = [];
  if (overdue.length) suggestions.push("resolve your overdue tasks");
  if (highPri.length) suggestions.push("tackle high priority items");
  if (dueSoon.length) suggestions.push("finish upcoming deadlines");
  const nextStep = suggestions.length ? `I suggest you first ${suggestions.join(" and then ")}.` : "All caught up! Feel free to create new tasks.";

  return `📋 **TaskFlow Workload Summary:**
- **Total Tasks:** ${tasks.length}
- **Completed:** ${done.length}
- **Pending:** ${pending.length} (Progress: ${progress}%)${overdueAlert}${soonAlert}${highAlert}

💡 **Next Recommendation:** ${nextStep}

*(Note: Currently running in Local Heuristic Fallback. For full conversational AI, configure a \`GEMINI_API_KEY\` or \`ANTHROPIC_API_KEY\` in your server's .env file.)*`;
}

// GET /history — retrieve user's chat history with the agent
router.get("/history", async (req, res) => {
  try {
    const history = await ChatMessage.find({ owner: req.user._id })
      .sort({ createdAt: 1 })
      .select("role content -_id") // Return only role and content
      .lean();
    res.json(history);
  } catch (err) {
    console.error("Failed to get agent history:", err.message);
    res.status(500).json({ message: err.message || "Failed to get history" });
  }
});

// DELETE /history — clear user's chat history with the agent
router.delete("/history", async (req, res) => {
  try {
    await ChatMessage.deleteMany({ owner: req.user._id });
    res.json({ message: "Chat history cleared" });
  } catch (err) {
    console.error("Failed to delete agent history:", err.message);
    res.status(500).json({ message: err.message || "Failed to clear history" });
  }
});

// POST /chat — ask a question to the agent
router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "messages array required" });
    }

    const query = messages.length > 0 ? messages[messages.length - 1].content : "";

    // Save user's query to MongoDB
    if (query) {
      await ChatMessage.create({
        role: "user",
        content: query,
        owner: req.user._id
      });
    }

    // ── Fetch user-specific live task data ──────────────────────────
    const tasks      = await Task.find({ $or: [{ owner: req.user._id }, { owner: null }] }).lean().limit(200);
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

    let reply = "";

    // ── Decide API Key / Heuristics Fallback ─────────────────────────
    if (process.env.GEMINI_API_KEY) {
      // Call Google Gemini
      reply = await callGemini(system, messages);
    } else if (process.env.ANTHROPIC_API_KEY) {
      // Call Claude
      const client = getAnthropicClient();
      const response = await client.messages.create({
        model:      "claude-sonnet-4-20250514",
        max_tokens: 1024,
        system,
        messages: messages.map(m => ({
          role:    m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      });

      reply = response.content
        .filter(b => b.type === "text")
        .map(b => b.text)
        .join("");
    } else {
      // Heuristic offline fallback
      reply = getHeuristicResponse(query, tasks, pending, done, overdue, dueSoon, highPri, progress);
    }

    // Save assistant's reply to MongoDB
    await ChatMessage.create({
      role: "assistant",
      content: reply,
      owner: req.user._id
    });

    res.json({ reply });

  } catch (err) {
    console.error("Agent error:", err.message);
    res.status(500).json({ message: err.message || "Agent error" });
  }
});

module.exports = router;
