import React, { useState } from 'react';
import {
  Layers,
  Activity,
  User,
  LogOut,
  LogIn,
  ChevronDown,
  ShieldCheck,
  Cpu,
  GraduationCap
} from 'lucide-react';

export default function Header({
  user,
  health,
  onOpenAuth,
  onOpenArch,
  onSwitchDemo,
  onLogout,
}) {
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const demoAccounts = [
    {
      label: 'Aarav Sharma (Hosteller)',
      sub: 'PRN: 2023CSE0101 • Hosteller',
      email: 'aarav@college.edu',
      role: 'student',
    },
    {
      label: 'Ananya Verma (Day Scholar)',
      sub: 'PRN: 2023ECE0205 • Non-Hosteller',
      email: 'ananya@college.edu',
      role: 'student',
    },
    {
      label: 'Warden Rajesh (Staff)',
      sub: 'Facilities & Hostel Officer',
      email: 'warden@campusflow.edu',
      role: 'staff',
    },
    {
      label: 'Chief Admin Desk',
      sub: 'System Administrator',
      email: 'admin@campusflow.edu',
      role: 'admin',
    },
  ];

  return (
    <header className="cf-header">
      <div className="header-left">
        <div className="brand-container">
          <div className="brand-icon-box">
            <Layers className="brand-icon" size={24} />
          </div>
          <div>
            <div className="brand-title">
              CampusFlow
              <span className="brand-badge">Enterprise Mesh</span>
            </div>
            <div className="brand-subtitle">
              gRPC Microservice • Kafka KRaft Outbox • GraphQL Gateway
            </div>
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* Architecture Health Status Pill */}
        <button
          type="button"
          className="health-badge-button"
          onClick={onOpenArch}
          title="Click to inspect Distributed Mesh Architecture"
        >
          <span className={`status-dot ${health?.database === 'connected' ? 'online' : 'offline'}`} />
          <Cpu size={15} />
          <span>Distributed Mesh</span>
          <span className="tech-tags">
            <span className="mini-tag">GraphQL</span>
            <span className="mini-tag">gRPC</span>
            <span className="mini-tag">Kafka</span>
          </span>
        </button>

        {/* Demo Switcher */}
        <div className="demo-dropdown-container">
          <button
            type="button"
            className="demo-switch-btn"
            onClick={() => setShowDemoMenu(!showDemoMenu)}
          >
            <GraduationCap size={16} />
            <span>Switch Persona</span>
            <ChevronDown size={14} />
          </button>

          {showDemoMenu && (
            <div className="demo-dropdown-menu">
              <div className="dropdown-header">Quick Role Switcher</div>
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  className={`dropdown-item ${user?.email === acc.email ? 'active' : ''}`}
                  onClick={() => {
                    setShowDemoMenu(false);
                    onSwitchDemo(acc.email, 'Password123!');
                  }}
                >
                  <div className="item-title">{acc.label}</div>
                  <div className="item-sub">{acc.sub}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* User Info / Auth */}
        {user ? (
          <div className="user-profile-badge">
            <div className="user-avatar">
              <User size={16} />
            </div>
            <div className="user-details">
              <div className="user-name">{user.name || user.email}</div>
              <div className="user-meta">
                <span className={`role-chip role-${user.role}`}>
                  {user.role.toUpperCase()}
                </span>
                {user.prn && <span className="prn-tag">{user.prn}</span>}
              </div>
            </div>
            <button
              type="button"
              className="icon-action-btn"
              onClick={onLogout}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button type="button" className="primary-btn" onClick={onOpenAuth}>
            <LogIn size={16} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
}
