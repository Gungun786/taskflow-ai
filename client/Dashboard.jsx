import { useState, useEffect } from "react";
import { getTasks } from "./services/tasks";
import "./Dashboard.css";

const STATUS_COLORS = { todo:"badge-blue", "in-progress":"badge-amber", done:"badge-green", overdue:"badge-red" };
const PRIORITY_COLORS = { high:"red", medium:"amber", low:"green" };

function StatCard({ label, value, icon, color }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${color}`}>{icon}</div>
      <div className="stat-body">
        <p className="stat-label">{label}</p>
        <p className="stat-value">{value}</p>
      </div>
    </div>
  );
}

function SVGIcon({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

export default function Dashboard() {
  const [tasks, setTasks]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTasks()
      .then(data => setTasks(Array.isArray(data) ? data : data.tasks || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const total      = tasks.length;
  const done       = tasks.filter(t => t.status === "done").length;
  const inProgress = tasks.filter(t => t.status === "in-progress").length;
  const overdue    = tasks.filter(t => {
    if (!t.dueDate || t.status === "done") return false;
    return new Date(t.dueDate) < new Date();
  }).length;
  const progress = total ? Math.round((done / total) * 100) : 0;

  const recent = [...tasks]
    .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);

  const dueSoon = tasks
    .filter(t => t.dueDate && t.status !== "done")
    .filter(t => {
      const diff = (new Date(t.dueDate) - new Date()) / 86400000;
      return diff >= 0 && diff <= 3;
    })
    .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

  if (loading) return (
    <div style={{display:"flex",justifyContent:"center",alignItems:"center",height:300}}>
      <div className="spinner"/>
    </div>
  );

  return (
    <div className="dashboard anim-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Here's what's happening with your tasks today.</p>
        </div>
        <p className="date-label">{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</p>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <StatCard label="Total Tasks" value={total} color="blue" icon={<SVGIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>}/>
        <StatCard label="Completed"   value={done}  color="green" icon={<SVGIcon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>}/>
        <StatCard label="In Progress" value={inProgress} color="amber" icon={<SVGIcon d="M13 10V3L4 14h7v7l9-11h-7z"/>}/>
        <StatCard label="Overdue"     value={overdue}    color="red"   icon={<SVGIcon d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>}/>
      </div>

      {/* Progress */}
      <div className="card progress-section">
        <div className="progress-header">
          <div>
            <p className="section-label">Overall Progress</p>
            <p className="progress-text">{done} of {total} tasks completed</p>
          </div>
          <span className="progress-pct">{progress}%</span>
        </div>
        <div className="progress-bar" style={{marginTop:12}}>
          <div className="progress-fill" style={{width:`${progress}%`}}/>
        </div>
      </div>

      <div className="dash-columns">
        {/* Recent Tasks */}
        <div className="card">
          <p className="section-label" style={{marginBottom:14}}>Recent Tasks</p>
          {recent.length === 0
            ? <div className="empty-state"><p>No tasks yet</p></div>
            : <ul className="task-list">
                {recent.map(t => (
                  <li key={t._id} className="task-row">
                    <div className="task-row-left">
                      <span className={`dot ${PRIORITY_COLORS[t.priority] || "blue"}`}/>
                      <span className="task-title">{t.title}</span>
                    </div>
                    <span className={`badge ${STATUS_COLORS[t.status] || "badge-blue"}`}>
                      {t.status === "in-progress" ? "In Progress" : t.status?.charAt(0).toUpperCase()+t.status?.slice(1)}
                    </span>
                  </li>
                ))}
              </ul>
          }
        </div>

        {/* Due Soon */}
        <div className="card">
          <p className="section-label" style={{marginBottom:14}}>Due in 3 Days</p>
          {dueSoon.length === 0
            ? <div className="empty-state"><p>Nothing due soon 🎉</p></div>
            : <ul className="task-list">
                {dueSoon.map(t => {
                  const diff = Math.ceil((new Date(t.dueDate) - new Date()) / 86400000);
                  return (
                    <li key={t._id} className="task-row">
                      <div className="task-row-left">
                        <span className={`dot ${diff === 0 ? "red" : diff === 1 ? "amber" : "blue"}`}/>
                        <span className="task-title">{t.title}</span>
                      </div>
                      <span className={`badge ${diff === 0 ? "badge-red" : diff === 1 ? "badge-amber" : "badge-blue"}`}>
                        {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `${diff}d`}
                      </span>
                    </li>
                  );
                })}
              </ul>
          }
        </div>
      </div>
    </div>
  );
}
