import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Your passwords do not match.');
      return;
    }

    if (
      form.password.length < 8 ||
      new TextEncoder().encode(form.password).length > 72
    ) {
      setError('Password must be at least 8 characters and no more than 72 bytes.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate('/login', {
        replace: true,
        state: { message: 'Your account is ready. Please log in.' },
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          'We could not create your account. Please try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-page">
      <div className="auth-card">
        <span className="eyebrow">Join the Academy</span>
        <h1>Create your account</h1>
        <p className="auth-intro">
          Start your mentorship journey as a mentee.
        </p>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-name-fields">
            <div className="auth-field">
              <label htmlFor="register-first-name">First name</label>
              <input
                autoComplete="given-name"
                id="register-first-name"
                name="firstName"
                value={form.firstName}
                onChange={updateField}
                maxLength={80}
                required
              />
            </div>
            <div className="auth-field">
              <label htmlFor="register-last-name">Last name</label>
              <input
                autoComplete="family-name"
                id="register-last-name"
                name="lastName"
                value={form.lastName}
                onChange={updateField}
                maxLength={80}
                required
              />
            </div>
          </div>
          <label htmlFor="register-email">Email address</label>
          <input
            autoComplete="email"
            id="register-email"
            name="email"
            type="email"
            value={form.email}
            onChange={updateField}
            maxLength={254}
            required
          />
          <label htmlFor="register-password">Password</label>
          <input
            autoComplete="new-password"
            id="register-password"
            name="password"
            type="password"
            value={form.password}
            onChange={updateField}
            minLength={8}
            required
          />
          <label htmlFor="register-confirm-password">Confirm password</label>
          <input
            autoComplete="new-password"
            id="register-confirm-password"
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={updateField}
            minLength={8}
            required
          />
          <button
            className="button button-primary auth-submit"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="auth-switch">
          Already registered? <Link to="/login">Log in</Link>
        </p>
      </div>
    </section>
  );
}
