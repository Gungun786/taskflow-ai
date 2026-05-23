import { useState, useEffect } from "react";
import { getTasks, createTask, updateTask, deleteTask, patchTask } from "./services/tasks";
import TaskModal from "./components/TaskModal";
import "./TasksPage.css";

const STATUSES   = ["all","todo","in-progress","done"];
const PRIORITIES = ["all","high","medium","low"];

function SVGIcon({ d, size=16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

const PRIORITY_DOT = { high:"red", medium:"amber", low:"green" };
const STATUS_LABEL = { todo:"To Do", "in-progress":"In Progress", done:"Done" };
const STATUS_BADGE = { todo:"badge-blue", "in-progress":"badge-amber", done:"badge-green" };

export default function TasksPage() {
  const [tasks,     setTasks]    = useState([]);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing,   setEditing]  = useState(null);
  const [search,    setSearch]   = useState("");
  const [filterStatus,   setFilterStatus]   = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [sortBy,    setSortBy]   = useState("createdAt");

  const load = () => {
    setLoading(true);
    getTasks()
      .then(data => setTasks(Array.isArray(data) ? data : data.tasks || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };



  useEffect(() => {
    // Wrap in microtask to avoid setState directly in effect body per lint rule
    queueMicrotask(() => load());
  }, []);



  const filtered = tasks
    .filter(t => filterStatus === "all" || t.status === filterStatus)
    .filter(t => filterPriority === "all" || t.priority === filterPriority)
    .filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => {
      if (sortBy === "dueDate") return new Date(a.dueDate||"9999") - new Date(b.dueDate||"9999");
      if (sortBy === "priority") {
        const ord = {high:0,medium:1,low:2};
        return (ord[a.priority]||2) - (ord[b.priority]||2);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit   = (t) => { setEditing(t);   setModalOpen(true); };

  const handleSave = async (data) => {
    if (editing) {
      await updateTask(editing._id, data);
    } else {
      await createTask(data);
    }
    setModalOpen(false);
    load();
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this task?")) return;
    await deleteTask(id);
    load();
  };

  const toggleStatus = async (t) => {
    const next = t.status === "done" ? "todo" : t.status === "todo" ? "in-progress" : "done";
    await patchTask(t._id, { status: next });
    load();
  };

  const isOverdue = (t) => t.dueDate && t.status !== "done" && new Date(t.dueDate) < new Date();

  return (
    <div className="tasks-page anim-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Tasks</h1>
          <p className="page-sub">{filtered.length} task{filtered.length !== 1 ? "s" : ""} found</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <SVGIcon d="M12 4v16m8-8H4"/>
          New Task
        </button>
      </div>

      {/* Filters Bar */}
      <div className="filters-bar">
        <div className="search-wrap">
          <SVGIcon d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0"/>
          <input
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-chips">
          {STATUSES.map(s => (
            <button key={s} className={`chip ${filterStatus===s?"active":""}`} onClick={() => setFilterStatus(s)}>
              {s === "all" ? "All" : STATUS_LABEL[s] || s}
            </button>
          ))}
        </div>

        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="filter-select">
          {PRIORITIES.map(p => <option key={p} value={p}>{p === "all" ? "All Priorities" : p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
        </select>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="filter-select">
          <option value="createdAt">Newest First</option>
          <option value="dueDate">Due Date</option>
          <option value="priority">Priority</option>
        </select>
      </div>

      {/* Task List */}
      {loading ? (
        <div style={{display:"flex",justifyContent:"center",padding:60}}>
          <div className="spinner"/>
        </div>
      ) : error ? (
        <div className="error-box">⚠ {error}</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <SVGIcon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" size={32}/>
          <p>No tasks found. Create one!</p>
        </div>
      ) : (
        <ul className="task-cards">
          {filtered.map(t => (
            <li key={t._id} className={`task-card ${t.status==="done"?"done":""} ${isOverdue(t)?"overdue":""}`}>
              {/* Status toggle checkbox */}
              <button className={`check-btn ${t.status==="done"?"checked":""}`} onClick={() => toggleStatus(t)} title="Cycle status">
                {t.status === "done" && <SVGIcon d="M5 13l4 4L19 7" size={12}/>}
              </button>

              <div className="task-card-body">
                <div className="task-card-top">
                  <span className="task-card-title">{t.title}</span>
                  <div className="task-card-actions">
                    <button className="icon-btn" onClick={() => openEdit(t)} title="Edit">
                      <SVGIcon d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
                    </button>
                    <button className="icon-btn danger" onClick={() => handleDelete(t._id)} title="Delete">
                      <SVGIcon d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </button>
                  </div>
                </div>

                {t.description && <p className="task-desc">{t.description}</p>}

                <div className="task-card-meta">
                  <span className={`badge ${STATUS_BADGE[t.status]||"badge-blue"}`}>
                    {STATUS_LABEL[t.status] || t.status}
                  </span>
                  <span className={`badge priority-badge-${PRIORITY_DOT[t.priority]||"blue"}`}>
                    <span className={`dot ${PRIORITY_DOT[t.priority]||"blue"}`} style={{width:6,height:6}}/>
                    {t.priority?.charAt(0).toUpperCase()+t.priority?.slice(1) || "Normal"}
                  </span>
                  {t.dueDate && (
                    <span className={`badge ${isOverdue(t)?"badge-red":"badge-blue"}`}>
                      <SVGIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" size={11}/>
                      {isOverdue(t) ? "Overdue · " : ""}
                      {new Date(t.dueDate).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
                    </span>
                  )}
                  {t.project && (
                    <span className="badge badge-purple">
                      <SVGIcon d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" size={11}/>
                      {typeof t.project === "object" ? t.project.name : t.project}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modalOpen && (
        <TaskModal
          task={editing}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
