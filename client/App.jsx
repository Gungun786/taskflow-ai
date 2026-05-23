import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import TasksPage from "./pages/TasksPage";
import AIAgent from "./components/AIAgent";
import Sidebar from "./components/Sidebar";
import Login from "./Login";
import { getSavedAuth, saveAuth, clearAuth } from "./services/auth";
import "./index.css";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [agentOpen, setAgentOpen] = useState(false);
  const [auth, setAuth] = useState(() => getSavedAuth());

  const handleLogin = (authData) => {
    setAuth(authData);
    saveAuth(authData);
  };

  const handleLogout = () => {
    setAuth(null);
    clearAuth();
  };

  if (!auth?.token) return <Login onLogin={handleLogin} />;

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} onAgentOpen={() => setAgentOpen(true)} />
      <main className="main-content">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: 12 }}>
          <div style={{ alignSelf: "center" }}>
            Signed in: <strong>{auth.user.name}</strong>
          </div>
          <button className="btn-ghost" onClick={handleLogout}>
            Sign out
          </button>
        </div>
        {page === "dashboard" && <Dashboard />}
        {page === "tasks" && <TasksPage />}
      </main>
      <AIAgent open={agentOpen} onClose={() => setAgentOpen(false)} />
    </div>
  );
}
