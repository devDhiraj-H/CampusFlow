import React from 'react';
import { X, CheckCircle, Database, Radio, Server, Shield, ArrowRight, Zap, RefreshCw } from 'lucide-react';

export default function ArchitectureModal({ isOpen, onClose, health, onRefreshHealth }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card arch-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Distributed Systems Architecture Mesh</h2>
            <p className="modal-desc">
              CampusFlow Enterprise Subsystems & High-Performance Inter-Process Mesh
            </p>
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="refresh-btn"
              onClick={onRefreshHealth}
              title="Refresh health checks"
            >
              <RefreshCw size={16} />
            </button>
            <button type="button" className="close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="arch-status-grid">
          <div className="arch-node-card">
            <div className="node-icon-title">
              <Server className="node-icon text-purple" size={20} />
              <div>
                <div className="node-name">GraphQL Gateway</div>
                <div className="node-sub">Apollo Server 5.5</div>
              </div>
            </div>
            <div className="node-status-badge active">
              <CheckCircle size={14} />
              <span>Active (/graphql)</span>
            </div>
            <p className="node-desc">
              Unified schema aggregating ticket lifecycles, student profiles, discussion threads, and operational metrics.
            </p>
          </div>

          <div className="arch-node-card">
            <div className="node-icon-title">
              <Radio className="node-icon text-cyan" size={20} />
              <div>
                <div className="node-name">gRPC Microservice</div>
                <div className="node-sub">Protocol Buffers v3</div>
              </div>
            </div>
            <div className="node-status-badge active">
              <CheckCircle size={14} />
              <span>Listening (:50051)</span>
            </div>
            <p className="node-desc">
              Sub-millisecond inter-service student eligibility & hostel resident verification with circuit fallback.
            </p>
          </div>

          <div className="arch-node-card">
            <div className="node-icon-title">
              <Zap className="node-icon text-amber" size={20} />
              <div>
                <div className="node-name">Kafka Event Stream</div>
                <div className="node-sub">KRaft Mode (No ZooKeeper)</div>
              </div>
            </div>
            <div className="node-status-badge active">
              <CheckCircle size={14} />
              <span>Streaming Enabled</span>
            </div>
            <p className="node-desc">
              Transactional outbox relay with <code>SKIP LOCKED</code> publishing to <code>campus.tickets</code> topic.
            </p>
          </div>

          <div className="arch-node-card">
            <div className="node-icon-title">
              <Database className="node-icon text-emerald" size={20} />
              <div>
                <div className="node-name">PostgreSQL 16 Engine</div>
                <div className="node-sub">ACID Dual-Write Guard</div>
              </div>
            </div>
            <div className="node-status-badge active">
              <CheckCircle size={14} />
              <span>Database Connected</span>
            </div>
            <p className="node-desc">
              Relational tables for tickets, students, comments, audit logs, and immutable outbox event rows.
            </p>
          </div>
        </div>

        <div className="arch-flow-diagram">
          <div className="flow-title">Transactional Outbox Data Flow</div>
          <div className="flow-steps">
            <div className="flow-step">
              <div className="step-num">1</div>
              <div className="step-info">
                <strong>Client Mutation</strong>
                <span>Student raises ticket or posts comment via GraphQL</span>
              </div>
            </div>
            <ArrowRight className="flow-arrow" size={20} />
            <div className="flow-step">
              <div className="step-num">2</div>
              <div className="step-info">
                <strong>gRPC Eligibility Check</strong>
                <span>Binary RPC validates student department & hostel status</span>
              </div>
            </div>
            <ArrowRight className="flow-arrow" size={20} />
            <div className="flow-step">
              <div className="step-num">3</div>
              <div className="step-info">
                <strong>ACID Transaction</strong>
                <span>Ticket record + Outbox event written in one atomic commit</span>
              </div>
            </div>
            <ArrowRight className="flow-arrow" size={20} />
            <div className="flow-step">
              <div className="step-num">4</div>
              <div className="step-info">
                <strong>Kafka Outbox Relay</strong>
                <span>Poller worker relays event to Kafka topic <code>campus.tickets</code></span>
              </div>
            </div>
            <ArrowRight className="flow-arrow" size={20} />
            <div className="flow-step">
              <div className="step-num">5</div>
              <div className="step-info">
                <strong>Consumer Worker</strong>
                <span>Dispatches asynchronous SLA alerts & notifications</span>
              </div>
            </div>
          </div>
        </div>

        <div className="arch-footer">
          <div className="health-raw">
            <span>Raw Health Probe:</span>
            <code>{JSON.stringify(health || {})}</code>
          </div>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Close Inspection
          </button>
        </div>
      </div>
    </div>
  );
}
