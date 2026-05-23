import { useState, useEffect } from "react";
import { getProjects } from "./services/tasks";
import "./TaskModal.css";

function SVGIcon({ d, size=16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

const BLANK = { title:"", description:"", status:"todo", priority:"medium", dueDate:"", project:"" };

export default function TaskModal({ task, onSave, onClose }) {
  const [form,     setForm]     = useState(task ? {
    title:       task.title || "",
    description: task.description || "",
    status:      task.status || "todo",
    priority:    task.priority || "medium",
    dueDate:     task.dueDate ? task.dueDate.slice(0,10) : "",
    project:     task.project?._id || task.project || "",
  } : { ...BLANK });
  const [projects, setProjects] = useState([]);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  useEffect(() => {
    getProjects().then(data => setProjects(Array.isArray(data) ? data : data.projects || [])).catch(()=>{});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box anim-slide">
        <div className="modal-header">
          <h2 className="modal-title">{task ? "Edit Task" : "Create Task"}</h2>
          <button className="icon-btn" onClick={onClose}>
            <SVGIcon d="M6 18L18 6M6 6l12 12"/>
          </button>
        </div>

        <form onSubmit={submit} className="modal-form">
          {error && <div className="form-error">{error}</div>}

          <div className="form-group">
            <label>Title *</label>
            <input
              type="text"
              value={form.title}
              onChange={e => set("title", e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Add more details…"
              rows={3}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set("status", e.target.value)}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={e => set("priority", e.target.value)}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)}/>
            </div>
            {projects.length > 0 && (
              <div className="form-group">
                <label>Project</label>
                <select value={form.project} onChange={e => set("project", e.target.value)}>
                  <option value="">No Project</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{width:14,height:14}}/> : null}
              {task ? "Save Changes" : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
