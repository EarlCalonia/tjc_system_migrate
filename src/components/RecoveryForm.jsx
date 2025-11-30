import React from 'react';
import { Link } from 'react-router-dom';

const RecoveryForm = () => {
  return (
    <div className="card text-center shadow-sm" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'rgba(255,255,255,0.9)' }}>
      <div className="card-body p-4">
        <h3 className="mb-3">Password Recovery</h3>
        <p className="text-muted mb-4">Enter your email address and we'll send you a link to reset your password.</p>
        
        <form>
          <div className="input-group mb-3">
            <span className="input-group-text">@</span>
            <input 
              type="email" 
              className="form-control" 
              placeholder="Email address" 
              required 
            />
          </div>
          
          <div className="d-grid gap-2 mb-3">
            <button type="submit" className="btn btn-primary text-white">
              Send Reset Link
            </button>
          </div>
        </form>

        <div className="mt-3">
          <Link to="/login" className="text-decoration-none">
            &larr; Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RecoveryForm;