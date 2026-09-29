import React, { useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { loginUser, registerStudentUser } from '../services/api.js';

export default function LoginModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [prn, setPrn] = useState('');
  const [department, setDepartment] = useState('COMPUTER_SCIENCE');
  const [year, setYear] = useState(3);
  const [rollNo, setRollNo] = useState('');
  const [hosteller, setHosteller] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await registerStudentUser({
          prn,
          name,
          email,
          password,
          department,
          year: parseInt(year, 10),
          roll_no: rollNo || prn,
          hosteller,
        });
        // Auto-login after registration
        const user = await loginUser(email, password);
        onAuthSuccess(user);
        onClose();
      } else {
        const user = await loginUser(email, password);
        onAuthSuccess(user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="auth-tab-buttons">
            <button
              type="button"
              className={`auth-tab-btn ${!isRegister ? 'active' : ''}`}
              onClick={() => { setIsRegister(false); setError(null); }}
            >
              <LogIn size={16} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              className={`auth-tab-btn ${isRegister ? 'active' : ''}`}
              onClick={() => { setIsRegister(true); setError(null); }}
            >
              <UserPlus size={16} />
              <span>Register Student</span>
            </button>
          </div>
          <button type="button" className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          {isRegister && (
            <>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reg-name">Full Name</label>
                  <input
                    id="reg-name"
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="reg-prn">Student PRN</label>
                  <input
                    id="reg-prn"
                    type="text"
                    required
                    placeholder="e.g. 2023CSE0101"
                    value={prn}
                    onChange={(e) => setPrn(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="reg-dept">Department</label>
                  <select
                    id="reg-dept"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                  >
                    <option value="COMPUTER_SCIENCE">Computer Science</option>
                    <option value="ELECTRONICS">Electronics & Comm.</option>
                    <option value="MECHANICAL">Mechanical Engg.</option>
                    <option value="CIVIL">Civil Engg.</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="reg-year">Year of Study</label>
                  <select
                    id="reg-year"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                  >
                    <option value={1}>1st Year</option>
                    <option value={2}>2nd Year</option>
                    <option value={3}>3rd Year</option>
                    <option value={4}>4th Year</option>
                  </select>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={hosteller}
                    onChange={(e) => setHosteller(e.target.checked)}
                  />
                  <span>Registered Hostel Resident (Enables Hostel Maintenance Tickets)</span>
                </label>
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              required
              placeholder="e.g. aarav@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button
              type="submit"
              className="primary-btn submit-btn"
              disabled={loading}
            >
              {loading
                ? 'Processing...'
                : isRegister
                ? 'Register & Authenticate'
                : 'Sign In to CampusFlow'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
