import { useState, useRef, useEffect } from "react";
import { chatWithAgent } from "./services/tasks";
import "./AIAgent.css";

function SVGIcon({ d, size=16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

const SUGGESTIONS = [
  "What tasks are pending?",
  "Show me overdue tasks",
  "What's my progress this week?",
  "Remind me about high priority tasks",
  "Which tasks are due soon?",
  "Summarize my workload",
];

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`message ${isUser ? "user" : "agent"}`}>
      {!isUser && (
        <div className="agent-avatar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--accent)" stroke="none">
            <path d="M12 2a5 5 0 015 5 5 5 0 01-5 5 5 5 0 01-5-5 5 5 0 015-5m0 12c5.33 0 8 2.67 8 4v2H4v-2c0-1.33 2.67-4 8-4z"/>
          </svg>
        </div>
      )}
      <div className={`bubble ${isUser?"bubble-user":"bubble-agent"}`}>
        {msg.loading
          ? <span className="typing-dots"><span/><span/><span/></span>
          : <p className="msg-text">{msg.content}</p>
        }
      </div>
    </div>
  );
}

export default function AIAgent({ open, onClose }) {
  const [messages,  setMessages]  = useState([
    { role:"assistant", content:"Hi! I'm your AI task assistant. I can answer questions about your tasks, remind you of deadlines, and analyze your progress. What would you like to know?" }
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");

    const userMsg    = { role:"user", content: q };
    const loadingMsg = { role:"assistant", content:"", loading:true };
    setMessages(prev => [...prev, userMsg, loadingMsg]);
    setLoading(true);

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const data    = await chatWithAgent(history);
      const reply   = data.reply || data.message || data.content || "Sorry, I couldn't process that.";
      setMessages(prev => [...prev.slice(0, -1), { role:"assistant", content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev.slice(0, -1), { role:"assistant", content:`Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const onKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const clearChat = () => setMessages([messages[0]]);

  if (!open) return null;

  return (
    <div className="agent-overlay">
      <div className="agent-panel anim-slide">
        {/* Header */}
        <div className="agent-header">
          <div className="agent-header-left">
            <div className="agent-status-dot"/>
            <div>
              <p className="agent-name">AI Task Agent</p>
              <p className="agent-sub">Powered by Claude</p>
            </div>
          </div>
          <div className="agent-header-actions">
            <button className="icon-btn" onClick={clearChat} title="Clear chat">
              <SVGIcon d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </button>
            <button className="icon-btn" onClick={onClose} title="Close">
              <SVGIcon d="M6 18L18 6M6 6l12 12"/>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="agent-messages">
          {messages.map((m, i) => <Message key={i} msg={m}/>)}
          <div ref={bottomRef}/>
        </div>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <div className="suggestions">
            {SUGGESTIONS.map(s => (
              <button key={s} className="suggestion-chip" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="agent-input-bar">
          <textarea
            ref={inputRef}
            className="agent-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder="Ask about your tasks…"
            rows={1}
          />
          <button
            className={`send-btn ${(!input.trim()||loading)?"disabled":""}`}
            onClick={() => send()}
            disabled={!input.trim() || loading}
          >
            {loading
              ? <div className="spinner" style={{width:16,height:16}}/>
              : <SVGIcon d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
            }
          </button>
        </div>
      </div>
    </div>
  );
}
