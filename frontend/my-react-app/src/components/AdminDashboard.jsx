import React, { useState } from 'react';
import {
  BarChart3,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ListFilter,
  Search,
  Building,
  User,
  ArrowUpRight,
  TrendingUp,
  Inbox
} from 'lucide-react';

export default function AdminDashboard({
  analytics,
  tickets,
  loading,
  onSelectTicket,
  onRefresh,
}) {
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTickets = tickets.filter((t) => {
    const matchesCat = filterCategory === 'ALL' || t.category === filterCategory;
    const matchesStatus = filterStatus === 'ALL' || t.status === filterStatus;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.created_by.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.department_routing.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesStatus && matchesSearch;
  });

  return (
    <div className="dashboard-content">
      {/* KPI Cards Row */}
      <div className="kpi-metrics-grid">
        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Total Volume</span>
            <Inbox size={18} className="text-purple" />
          </div>
          <div className="kpi-value">{analytics?.total || 0}</div>
          <div className="kpi-sub">Across all campus departments</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Open / New</span>
            <Clock size={18} className="text-blue" />
          </div>
          <div className="kpi-value text-blue">{analytics?.open || 0}</div>
          <div className="kpi-sub">Pending staff triage</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">In Progress</span>
            <TrendingUp size={18} className="text-amber" />
          </div>
          <div className="kpi-value text-amber">{analytics?.in_progress || 0}</div>
          <div className="kpi-sub">Under active resolution</div>
        </div>

        <div className="kpi-card">
          <div className="kpi-header">
            <span className="kpi-label">Resolved</span>
            <CheckCircle2 size={18} className="text-emerald" />
          </div>
          <div className="kpi-value text-emerald">{analytics?.resolved || 0}</div>
          <div className="kpi-sub">Closed & SLA satisfied</div>
        </div>

        <div className={`kpi-card ${analytics?.sla_breached > 0 ? 'kpi-breached-alert' : ''}`}>
          <div className="kpi-header">
            <span className="kpi-label">SLA Breached</span>
            <AlertTriangle size={18} className="text-red" />
          </div>
          <div className="kpi-value text-red">{analytics?.sla_breached || 0}</div>
          <div className="kpi-sub">Requires immediate escalation</div>
        </div>
      </div>

      {/* Analytics Breakdown & Metrics */}
      <div className="analytics-split-row">
        <div className="analytics-card">
          <div className="analytics-card-header">
            <BarChart3 size={16} />
            <span>Volume by Department Category</span>
          </div>
          <div className="bars-container">
            {analytics?.by_category?.map((cat) => {
              const maxCount = Math.max(...(analytics.by_category.map(c => c.count)), 1);
              const percentage = Math.round((cat.count / maxCount) * 100);
              return (
                <div key={cat.category} className="metric-bar-row">
                  <div className="bar-labels">
                    <span className="bar-name">{cat.category}</span>
                    <span className="bar-count">{cat.count}</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill fill-category" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="analytics-card">
          <div className="analytics-card-header">
            <TrendingUp size={16} />
            <span>Distribution by Priority Level</span>
          </div>
          <div className="bars-container">
            {analytics?.by_priority?.map((prio) => {
              const maxCount = Math.max(...(analytics.by_priority.map(p => p.count)), 1);
              const percentage = Math.round((prio.count / maxCount) * 100);
              return (
                <div key={prio.priority} className="metric-bar-row">
                  <div className="bar-labels">
                    <span className="bar-name">{prio.priority}</span>
                    <span className="bar-count">{prio.count}</span>
                  </div>
                  <div className="bar-track">
                    <div className={`bar-fill fill-${prio.priority.toLowerCase()}`} style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Operations Ticket Table */}
      <div className="admin-table-container">
        <div className="table-toolbar">
          <div className="search-box">
            <Search size={16} />
            <input
              type="text"
              placeholder="Filter by title, student PRN, or routing..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="toolbar-selects">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="table-select"
            >
              <option value="ALL">All Categories</option>
              <option value="HOSTEL">Hostel</option>
              <option value="ACADEMIC">Academic</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="FINANCE">Finance</option>
              <option value="GENERAL">General</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="table-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>
        </div>

        <div className="table-responsive">
          <table className="operations-table">
            <thead>
              <tr>
                <th>Ticket Title & Context</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Department Routing</th>
                <th>Status</th>
                <th>SLA Countdown</th>
                <th>Student (PRN)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-4">
                    No tickets matching current filters.
                  </td>
                </tr>
              ) : (
                filteredTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="table-row-clickable"
                    onClick={() => onSelectTicket(ticket.id)}
                  >
                    <td>
                      <div className="td-title">{ticket.title}</div>
                      <div className="td-sub">{ticket.id.slice(0, 8)}...</div>
                    </td>
                    <td>
                      <span className="category-pill">{ticket.category}</span>
                    </td>
                    <td>
                      <span className={`priority-pill priority-${ticket.priority.toLowerCase()}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td>
                      <span className="routing-badge">
                        <Building size={11} />
                        {ticket.department_routing}
                      </span>
                    </td>
                    <td>
                      <span className={`status-pill pill-${ticket.status.toLowerCase()}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td>
                      <div className={`sla-badge ${ticket.is_sla_breached ? 'text-red font-bold' : 'text-emerald'}`}>
                        <Clock size={12} />
                        <span>{ticket.is_sla_breached ? 'Breached' : 'Active'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="prn-cell">{ticket.created_by}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="manage-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTicket(ticket.id);
                        }}
                      >
                        <span>Manage</span>
                        <ArrowUpRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
