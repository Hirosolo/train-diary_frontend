import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/NavBar/NavBar';

const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  // NEW: State for loading status
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    // NEW: Start loading
    setIsLoggingIn(true);

    try {
        const res = await login(email, password);
        if (res.token) {
          navigate('/dashboard');
        } else {
          setError(res.message || 'Login failed');
        }
    } catch (err) {
        console.error("Login error:", err);
        setError("An unexpected error occurred during login.");
    } finally {
        // NEW: Stop loading
        setIsLoggingIn(false);
    }
  };

  return (
    <div className="dashboard-bg">
      <Navbar />
      <div className="auth-card">
        <h2>Login</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isLoggingIn} 
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={isLoggingIn} 
          />
          <button 
            className="btn-primary" 
            type="submit" 
            // NEW: Disable button if fields are incomplete OR if logging in
            disabled={!email || !password || isLoggingIn}
          >
            {/* NEW: Update button text */}
            {isLoggingIn ? 'Logging in...' : 'Login'}
          </button>
          {error && <div className="error">{error}</div>}
        </form>
        <div className="auth-link">Don't have an account? <button type="button" className="btn-outline" style={{marginTop:"1rem"}} onClick={() => navigate('/register')} disabled={isLoggingIn}>Register</button></div>
      </div>
    </div>
  );
};

export default Login;