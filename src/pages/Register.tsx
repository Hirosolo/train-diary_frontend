import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/NavBar/NavBar';

const Register: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  // NEW: State for loading status
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // NEW: Start loading
    setIsRegistering(true);

    try {
        const res = await register(username, email, password);
        if (res.message === 'User registered successfully.') {
          setSuccess('Registration successful! You can now log in.');
          setTimeout(() => navigate('/login'), 1500);
        } else {
          setError(res.message || 'Registration failed');
        }
    } catch (err) {
        console.error("Registration error:", err);
        setError("An unexpected error occurred during registration.");
    } finally {
        // NEW: Stop loading
        setIsRegistering(false);
    }
  };

  return (
    <div className="dashboard-bg">
      <Navbar />
      <div className="auth-card">
        <h2>Register</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            disabled={isRegistering} // NEW: Disable input during registration
          />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            disabled={isRegistering} // NEW: Disable input during registration
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            disabled={isRegistering} // NEW: Disable input during registration
          />
          <button 
            className="btn-primary" 
            type="submit" 
            // NEW: Disable button if fields are incomplete OR if registering
            disabled={!username || !email || !password || isRegistering}
          >
            {/* NEW: Update button text */}
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
          {error && <div className="error">{error}</div>}
          {success && <div className="success">{success}</div>}
        </form>
        <div className="auth-link">Already have an account? <button type="button" className="btn-outline" style={{marginTop:"1rem"}} onClick={() => navigate('/login')} disabled={isRegistering}>Login</button></div>
      </div>
    </div>
  );
};

export default Register;