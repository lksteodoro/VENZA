import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    setLoading(true);
    // Simulate short network request
    setTimeout(() => {
      onLogin(); // Set authenticated
      navigate('/dashboard'); // Direct entry
    }, 600);
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-container">
          <div className="login-logo-icon">V</div>
        </div>
        <h1 className="login-title">VENZA <span style={{ color: 'var(--primary)', fontWeight: '400' }}>ASSESSORIA</span></h1>
        <p className="login-subtitle">Acesse seu workspace de operações.</p>
        
        <button 
          className={`login-btn ${loading ? 'loading' : ''}`}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Entrando...' : (
            <>
              Entrar Direto <ArrowRight size={18} />
            </>
          )}
        </button>
        <p className="login-hint">
          <Lock size={12} style={{ marginRight: '6px' }} />
          Acesso seguro
        </p>
      </div>
      
      {/* Decorative background elements */}
      <div className="login-blob blob-1"></div>
      <div className="login-blob blob-2"></div>
    </div>
  );
};

export default Login;
