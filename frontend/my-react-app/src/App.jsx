import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header.jsx';
import StudentDashboard from './components/StudentDashboard.jsx';
import AdminDashboard from './components/AdminDashboard.jsx';
import RaiseTicketModal from './components/RaiseTicketModal.jsx';
import TicketDetailModal from './components/TicketDetailModal.jsx';
import LoginModal from './components/LoginModal.jsx';
import ArchitectureModal from './components/ArchitectureModal.jsx';
import {
  getStoredUser,
  clearSession,
  loginUser,
  fetchTickets,
  fetchAnalytics,
  fetchSystemHealth,
} from './services/api.js';
import './App.css';

export default function App() {
  const [user, setUser] = useState(getStoredUser());
  const [health, setHealth] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isRaiseOpen, setIsRaiseOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isArchOpen, setIsArchOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  // View Mode for Admin/Staff (can toggle between Ops command center and Student portal)
  const [viewMode, setViewMode] = useState('ops'); // 'ops' or 'student'

  // Toast notifications
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [healthData, ticketsData, analyticsData] = await Promise.all([
        fetchSystemHealth(),
        fetchTickets({ limit: 100 }),
        fetchAnalytics(),
      ]);
      setHealth(healthData);
      setTickets(ticketsData.tickets);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Failed to load CampusFlow data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize session and auto-load
  useEffect(() => {
    async function init() {
      // If no user in local storage, authenticate as default student demo account
      if (!getStoredUser()) {
        try {
          const defaultUser = await loginUser('aarav@college.edu', 'Password123!');
          setUser(defaultUser);
        } catch {
          // If login fails, user remains guest
        }
      }
      await loadData();
    }
    init();
  }, [loadData]);

  // Sync viewMode when user role changes
  useEffect(() => {
    if (user?.role === 'student') {
      setViewMode('student');
    } else {
      setViewMode('ops');
    }
  }, [user]);

  const handleSwitchPersona = async (email, password) => {
    try {
      const newUser = await loginUser(email, password);
      setUser(newUser);
      showToast(`Switched persona to ${newUser.name || newUser.email} (${newUser.role})`);
      await loadData();
    } catch (err) {
      showToast(err.message || 'Persona switch failed', 'error');
    }
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    showToast('Signed out of session');
  };

  const handleTicketCreated = (newTicket) => {
    showToast(`Ticket created: #${newTicket.id.slice(0, 8)}`);
    loadData();
    setSelectedTicketId(newTicket.id);
  };

  const isStaffOrAdmin =
    user?.role === 'staff' || user?.role === 'admin' || user?.role === 'faculty';

  return (
    <div className="campusflow-app">
      {/* Toast Alert */}
      {toast && (
        <div className={`toast-notification toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <Header
        user={user}
        health={health}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenArch={() => setIsArchOpen(true)}
        onSwitchDemo={handleSwitchPersona}
        onLogout={handleLogout}
      />

      {/* Main View Container */}
      <main className="main-viewport">
        {/* Sub-nav for Staff/Admin to toggle perspective */}
        {isStaffOrAdmin && (
          <div className="role-perspective-bar">
            <div className="perspective-tabs">
              <button
                type="button"
                className={`tab-btn ${viewMode === 'ops' ? 'active' : ''}`}
                onClick={() => setViewMode('ops')}
              >
                Operations Command Center (Staff/Admin)
              </button>
              <button
                type="button"
                className={`tab-btn ${viewMode === 'student' ? 'active' : ''}`}
                onClick={() => setViewMode('student')}
              >
                Student Grievance Portal View
              </button>
            </div>
            <div className="view-note">
              Authenticated as: <strong>{user?.name || user?.email}</strong> ({user?.role})
            </div>
          </div>
        )}

        {viewMode === 'ops' && isStaffOrAdmin ? (
          <AdminDashboard
            analytics={analytics}
            tickets={tickets}
            loading={loading}
            onSelectTicket={(id) => setSelectedTicketId(id)}
            onRefresh={loadData}
          />
        ) : (
          <StudentDashboard
            user={user}
            tickets={tickets}
            loading={loading}
            onOpenRaiseTicket={() => {
              if (!user) {
                setIsAuthOpen(true);
              } else {
                setIsRaiseOpen(true);
              }
            }}
            onSelectTicket={(id) => setSelectedTicketId(id)}
          />
        )}
      </main>

      {/* Modals */}
      <RaiseTicketModal
        isOpen={isRaiseOpen}
        onClose={() => setIsRaiseOpen(false)}
        onTicketCreated={handleTicketCreated}
        user={user}
      />

      <TicketDetailModal
        ticketId={selectedTicketId}
        isOpen={Boolean(selectedTicketId)}
        onClose={() => setSelectedTicketId(null)}
        currentUser={user}
        onTicketUpdated={loadData}
      />

      <LoginModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={(authUser) => {
          setUser(authUser);
          showToast(`Welcome, ${authUser.name || authUser.email}!`);
          loadData();
        }}
      />

      <ArchitectureModal
        isOpen={isArchOpen}
        onClose={() => setIsArchOpen(false)}
        health={health}
        onRefreshHealth={loadData}
      />
    </div>
  );
}
