import React, { useState } from 'react';
import { X, Send, AlertTriangle, Clock, ShieldAlert, Cpu } from 'lucide-react';
import { createTicket } from '../services/api.js';

export default function RaiseTicketModal({ isOpen, onClose, onTicketCreated, user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('GENERAL');
  const [priority, setPriority] = useState('MEDIUM');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const slaOptions = {
    LOW: '5 Days Response SLA',
    MEDIUM: '48 Hours Response SLA',
    HIGH: '24 Hours Priority SLA',
    URGENT: '6 Hours Critical SLA',
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const ticket = await createTicket({
        title,
        description,
        category,
        priority,
      });
      onTicketCreated(ticket);
      onClose();
      // Reset form
      setTitle('');
      setDescription('');
      setCategory('GENERAL');
      setPriority('MEDIUM');
    } catch (err) {
      setError(err.message || 'Failed to raise ticket');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card ticket-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Raise Grievance / Operational Ticket</h2>
            <p className="modal-desc">
              Routes automatically to department coordinator with transactional Kafka audit
            </p>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-alert">
            <ShieldAlert size={18} />
            <span>{error}</span>
          </div>
        )}

        {category === 'HOSTEL' && (
          <div className="info-banner grpc-banner">
            <Cpu size={16} />
            <span>
              <strong>gRPC Microservice Guard Active:</strong> Raising hostel maintenance triggers
              a binary RPC to port 50051 to verify hostel allocation for PRN <code>{user?.prn || 'N/A'}</code>.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="ticket-form">
          <div className="form-group">
            <label htmlFor="ticket-title">Title / Summary</label>
            <input
              id="ticket-title"
              type="text"
              required
              placeholder="e.g. Wi-Fi router down in Block B Room 302"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="ticket-cat">Category & Auto-Routing</label>
              <select
                id="ticket-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="GENERAL">General Administration (GENERAL_ADMIN)</option>
                <option value="HOSTEL">Hostel & Facilities (FACILITIES_HOSTEL)</option>
                <option value="ACADEMIC">Academic / Coursework (ACADEMIC_OFFICE)</option>
                <option value="MAINTENANCE">IT & Infrastructure (IT_INFRASTRUCTURE)</option>
                <option value="FINANCE">Finance & Accounts (FINANCE_OFFICE)</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="ticket-priority">Priority & SLA Engine</label>
              <select
                id="ticket-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">LOW (5 Days SLA)</option>
                <option value="MEDIUM">MEDIUM (48 Hours SLA)</option>
                <option value="HIGH">HIGH (24 Hours SLA)</option>
                <option value="URGENT">URGENT (6 Hours Critical SLA)</option>
              </select>
            </div>
          </div>

          <div className="sla-preview-box">
            <Clock size={16} />
            <span>Assigned SLA Target: <strong>{slaOptions[priority]}</strong></span>
          </div>

          <div className="form-group">
            <label htmlFor="ticket-desc">Detailed Description & Evidence</label>
            <textarea
              id="ticket-desc"
              rows={4}
              required
              placeholder="Provide exact location, symptoms, error codes, or context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn submit-btn"
              disabled={loading}
            >
              <Send size={16} />
              <span>{loading ? 'Submitting & Streaming...' : 'Submit via GraphQL'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
