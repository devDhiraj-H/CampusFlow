import React, { useState } from 'react';
import {
  PlusCircle,
  Clock,
  MessageSquare,
  Building,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  Sparkles
} from 'lucide-react';

export default function StudentDashboard({
  user,
  tickets,
  loading,
  onOpenRaiseTicket,
  onSelectTicket,
}) {
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = tickets.filter((t) => {
    const matchesStatus =
      filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department_routing.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const getSlaDisplay = (ticket) => {
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const diffHours = Math.round((deadline - now) / (1000 * 60 * 60));

    if (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') {
      return { text: 'Resolved', isBreached: false, color: 'text-emerald' };
    }
    if (diffHours < 0 || ticket.is_sla_breached) {
      return { text: `Breached by ${Math.abs(diffHours)}h`, isBreached: true, color: 'text-red' };
    }
    return { text: `${diffHours}h remaining`, isBreached: false, color: 'text-amber' };
  };

  return (
    <div className="dashboard-content">
      {/* Welcome Banner */}
      <div className="student-hero-banner">
        <div className="banner-left">
          <div className="student-badge-line">
            <Sparkles size={16} className="text-amber" />
            <span>Student Grievance & Service Portal</span>
          </div>
          <h1 className="banner-greeting">
            Welcome back, {user?.name || 'Student'}!
          </h1>
          <p className="banner-subtext">
            Track active requests across hostel, academics, IT infrastructure, and administration
            with end-to-end SLA tracking.
          </p>
        </div>
        <div className="banner-right">
          <button
            type="button"
            className="raise-ticket-cta"
            onClick={onOpenRaiseTicket}
          >
            <PlusCircle size={20} />
            <span>Raise New Grievance</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="toolbar-row">
        <div className="search-box">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search tickets by title, keyword, or department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-pill-group">
          <button
            type="button"
            className={`filter-pill ${filterStatus === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterStatus('ALL')}
          >
            All Tickets ({tickets.length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterStatus === 'OPEN' ? 'active' : ''}`}
            onClick={() => setFilterStatus('OPEN')}
          >
            Open ({tickets.filter((t) => t.status === 'OPEN').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterStatus === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setFilterStatus('IN_PROGRESS')}
          >
            In Progress ({tickets.filter((t) => t.status === 'IN_PROGRESS').length})
          </button>
          <button
            type="button"
            className={`filter-pill ${filterStatus === 'RESOLVED' ? 'active' : ''}`}
            onClick={() => setFilterStatus('RESOLVED')}
          >
            Resolved ({tickets.filter((t) => t.status === 'RESOLVED').length})
          </button>
        </div>
      </div>

      {/* Tickets Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading tickets from GraphQL Gateway...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="empty-state">
          <CheckCircle2 size={40} className="text-emerald" />
          <h3>No tickets found</h3>
          <p>
            {searchQuery
              ? 'Try modifying your search or filter criteria.'
              : 'You have no active grievance requests at this time.'}
          </p>
          <button
            type="button"
            className="primary-btn mt-3"
            onClick={onOpenRaiseTicket}
          >
            Raise a Grievance
          </button>
        </div>
      ) : (
        <div className="tickets-grid">
          {filteredTickets.map((ticket) => {
            const sla = getSlaDisplay(ticket);
            return (
              <div
                key={ticket.id}
                className="ticket-card"
                onClick={() => onSelectTicket(ticket.id)}
              >
                <div className="ticket-card-header">
                  <div className="card-pills">
                    <span className={`status-pill pill-${ticket.status.toLowerCase()}`}>
                      {ticket.status}
                    </span>
                    <span className={`priority-pill priority-${ticket.priority.toLowerCase()}`}>
                      {ticket.priority}
                    </span>
                    <span className="category-pill">{ticket.category}</span>
                  </div>
                  <div className={`sla-badge ${sla.color}`}>
                    <Clock size={13} />
                    <span>{sla.text}</span>
                  </div>
                </div>

                <h3 className="ticket-card-title">{ticket.title}</h3>
                <p className="ticket-card-desc">{ticket.description}</p>

                <div className="ticket-card-footer">
                  <div className="footer-left">
                    <span className="routing-badge">
                      <Building size={12} />
                      {ticket.department_routing}
                    </span>
                  </div>
                  <div className="footer-right">
                    <span className="comments-count">
                      <MessageSquare size={13} />
                      {ticket.comments?.length || 0}
                    </span>
                    <span className="date-tag">
                      {new Date(ticket.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
