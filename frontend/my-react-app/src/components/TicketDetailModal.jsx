import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  History,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Building,
  ShieldAlert,
  ArrowRightCircle,
  UserCheck
} from 'lucide-react';
import {
  fetchTicketDetails,
  addTicketComment,
  updateTicketStatus,
  assignTicket,
} from '../services/api.js';

export default function TicketDetailModal({
  ticketId,
  isOpen,
  onClose,
  currentUser,
  onTicketUpdated,
}) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New comment input
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  // Operations actions
  const [actionNotes, setActionNotes] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);

  const loadTicket = async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicketDetails(ticketId);
      setTicket(data);
    } catch (err) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && ticketId) {
      loadTicket();
    }
  }, [isOpen, ticketId]);

  if (!isOpen) return null;

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmittingComment(true);
    try {
      await addTicketComment(ticket.id, newComment.trim());
      setNewComment('');
      await loadTicket();
      onTicketUpdated();
    } catch (err) {
      alert(err.message || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleStatusChange = async (targetStatus) => {
    setActionLoading(true);
    setActionError(null);
    try {
      await updateTicketStatus(ticket.id, targetStatus, actionNotes || undefined);
      setActionNotes('');
      await loadTicket();
      onTicketUpdated();
    } catch (err) {
      setActionError(err.message || `Failed to transition to ${targetStatus}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assigneeName.trim()) return;

    setActionLoading(true);
    setActionError(null);
    try {
      await assignTicket(ticket.id, assigneeName.trim(), actionNotes || undefined);
      setAssigneeName('');
      setActionNotes('');
      await loadTicket();
      onTicketUpdated();
    } catch (err) {
      setActionError(err.message || 'Failed to assign ticket');
    } finally {
      setActionLoading(false);
    }
  };

  const isStaffOrAdmin = currentUser?.role === 'staff' || currentUser?.role === 'admin' || currentUser?.role === 'faculty';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card ticket-detail-modal-card" onClick={(e) => e.stopPropagation()}>
        {loading ? (
          <div className="modal-loading">
            <div className="spinner" />
            <p>Fetching full ticket graph via GraphQL...</p>
          </div>
        ) : error || !ticket ? (
          <div className="modal-error">
            <ShieldAlert size={28} className="text-red" />
            <p>{error || 'Ticket not found'}</p>
            <button type="button" className="secondary-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="modal-header">
              <div>
                <div className="modal-badge-row">
                  <span className={`status-pill pill-${ticket.status.toLowerCase()}`}>
                    {ticket.status}
                  </span>
                  <span className={`priority-pill priority-${ticket.priority.toLowerCase()}`}>
                    {ticket.priority} PRIORITY
                  </span>
                  <span className="category-pill">{ticket.category}</span>
                  <span className="routing-pill">
                    <Building size={12} />
                    {ticket.department_routing}
                  </span>
                </div>
                <h2 className="modal-title">{ticket.title}</h2>
              </div>
              <button type="button" className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            {actionError && (
              <div className="error-alert">
                <AlertCircle size={16} />
                <span>{actionError}</span>
              </div>
            )}

            {/* SLA & Creator Bar */}
            <div className="ticket-meta-grid">
              <div className="meta-card">
                <div className="meta-label">
                  <Clock size={14} />
                  <span>SLA Deadline</span>
                </div>
                <div className="meta-value">
                  {new Date(ticket.sla_deadline).toLocaleString()}
                </div>
                <div className={`meta-sub ${ticket.is_sla_breached ? 'text-red font-bold' : 'text-emerald'}`}>
                  {ticket.is_sla_breached ? '⚠️ SLA BREACHED' : '✓ Within SLA Window'}
                </div>
              </div>

              <div className="meta-card">
                <div className="meta-label">
                  <User size={14} />
                  <span>Student (Creator)</span>
                </div>
                <div className="meta-value">
                  {ticket.creator?.name || ticket.created_by}
                </div>
                <div className="meta-sub">
                  PRN: {ticket.creator?.prn || ticket.created_by} • {ticket.creator?.department || 'Student'}
                  {ticket.creator?.hosteller && ' (Hosteller)'}
                </div>
              </div>

              <div className="meta-card">
                <div className="meta-label">
                  <UserCheck size={14} />
                  <span>Assigned Officer</span>
                </div>
                <div className="meta-value">
                  {ticket.assigned_to || 'Unassigned'}
                </div>
                <div className="meta-sub">
                  {ticket.resolved_by ? `Resolved by: ${ticket.resolved_by}` : 'Pending Resolution'}
                </div>
              </div>
            </div>

            {/* Description Body */}
            <div className="ticket-body-card">
              <div className="body-heading">Description</div>
              <p className="body-text">{ticket.description}</p>
              {ticket.resolution_notes && (
                <div className="resolution-notes-box">
                  <strong>Resolution Notes:</strong> {ticket.resolution_notes}
                </div>
              )}
            </div>

            {/* Staff / Admin State Machine Transition Controls */}
            {isStaffOrAdmin && ticket.status !== 'CLOSED' && (
              <div className="operations-action-bar">
                <div className="op-bar-title">
                  <ArrowRightCircle size={16} />
                  <span>Operations Control Matrix (State Machine Actions)</span>
                </div>

                <div className="op-actions-flow">
                  {/* Assignment box */}
                  <form onSubmit={handleAssign} className="assign-form-inline">
                    <input
                      type="text"
                      placeholder="Assignee Name / Staff ID..."
                      value={assigneeName}
                      onChange={(e) => setAssigneeName(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="secondary-btn"
                      disabled={actionLoading || !assigneeName.trim()}
                    >
                      Assign
                    </button>
                  </form>

                  {/* Transition buttons */}
                  {ticket.status === 'OPEN' && (
                    <button
                      type="button"
                      className="op-btn btn-progress"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('IN_PROGRESS')}
                    >
                      Move to IN_PROGRESS
                    </button>
                  )}

                  {ticket.status === 'IN_PROGRESS' && (
                    <div className="resolve-action-group">
                      <input
                        type="text"
                        placeholder="Resolution notes / action taken..."
                        value={actionNotes}
                        onChange={(e) => setActionNotes(e.target.value)}
                      />
                      <button
                        type="button"
                        className="op-btn btn-resolve"
                        disabled={actionLoading}
                        onClick={() => handleStatusChange('RESOLVED')}
                      >
                        <CheckCircle2 size={15} />
                        <span>Mark RESOLVED</span>
                      </button>
                    </div>
                  )}

                  {ticket.status === 'RESOLVED' && (
                    <button
                      type="button"
                      className="op-btn btn-close-ticket"
                      disabled={actionLoading}
                      onClick={() => handleStatusChange('CLOSED')}
                    >
                      Close Ticket
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Two column layout: Activity Timeline + Comments Discussion */}
            <div className="ticket-split-grid">
              {/* Discussion Thread */}
              <div className="split-column">
                <div className="split-header">
                  <MessageSquare size={16} />
                  <h3>Discussion Thread ({ticket.comments?.length || 0})</h3>
                </div>

                <div className="comments-scroll-area">
                  {ticket.comments?.length === 0 ? (
                    <div className="empty-subtext">No comments yet. Start the conversation below.</div>
                  ) : (
                    ticket.comments.map((c) => (
                      <div key={c.id} className="comment-bubble">
                        <div className="comment-header">
                          <span className="comment-author">{c.author_name || c.author_id}</span>
                          <span className={`role-badge role-${c.author_role}`}>{c.author_role}</span>
                          <span className="comment-time">
                            {new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="comment-body">{c.comment}</div>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleAddComment} className="comment-input-form">
                  <input
                    type="text"
                    placeholder="Type a response or update..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={submittingComment || !newComment.trim()}
                  >
                    <Send size={15} />
                  </button>
                </form>
              </div>

              {/* Audit Timeline Activity */}
              <div className="split-column">
                <div className="split-header">
                  <History size={16} />
                  <h3>Chronological Audit Trail ({ticket.timeline?.length || 0})</h3>
                </div>

                <div className="timeline-scroll-area">
                  {ticket.timeline?.map((act, idx) => (
                    <div key={act.id || idx} className="timeline-item">
                      <div className="timeline-bullet" />
                      <div className="timeline-content">
                        <div className="timeline-action-row">
                          <span className="timeline-action">{act.action}</span>
                          <span className="timeline-time">
                            {new Date(act.created_at).toLocaleDateString()} {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="timeline-actor">By: {act.actor}</div>
                        {act.notes && <div className="timeline-notes">{act.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
