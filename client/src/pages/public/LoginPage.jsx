import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

const roleHomePaths = {
  MENTEE: '/mentee',
  MENTOR: '/mentor',
  ADMIN: '/admin',
};

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successMessage = location.state?.message;

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const user = await login({ email: email.trim(), password });
      navigate(roleHomePaths[user.role] || '/', { replace: true });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'We could not log you in. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Welcome back</span>
        <h1>Log in to your account</h1>
        <p className="auth-intro">
          Continue your Mentorship Academy journey.
        </p>
        {successMessage && (
          <p className="auth-success" role="status">
            {successMessage}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            autoComplete="email"
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
          />
          <label htmlFor="login-password">Password</label>
          <input
            autoComplete="current-password"
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>
        <p className="auth-switch">
          New to the Academy? <Link to="/register">Create an account</Link>
        </p>
      </div>
    </section>
  );
}
