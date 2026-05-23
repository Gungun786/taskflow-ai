import "./Sidebar.css";

const NAV = [
  { id:"dashboard", label:"Dashboard",  icon:<Icon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/> },
  { id:"tasks",     label:"All Tasks",  icon:<Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/> },
];

function Icon({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d}/>
    </svg>
  );
}

export default function Sidebar({ page, setPage, onAgentOpen }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="2" width="9" height="9" rx="2" fill="var(--accent)"/>
            <rect x="13" y="2" width="9" height="9" rx="2" fill="var(--accent)" opacity=".5"/>
            <rect x="2" y="13" width="9" height="9" rx="2" fill="var(--accent)" opacity=".5"/>
            <rect x="13" y="13" width="9" height="9" rx="2" fill="var(--accent)" opacity=".3"/>
          </svg>
        </div>
        <span className="logo-text">TaskFlow</span>
      </div>

      <nav className="sidebar-nav">
        <span className="nav-section">Menu</span>
        {NAV.map(n => (
          <button
            key={n.id}
            className={`nav-item ${page === n.id ? "active" : ""}`}
            onClick={() => setPage(n.id)}
          >
            {n.icon}
            {n.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <button className="ai-button" onClick={onAgentOpen}>
          <span className="ai-dot"/>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
          Ask AI Agent
        </button>
      </div>
    </aside>
  );
}
