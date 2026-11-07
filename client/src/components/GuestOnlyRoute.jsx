import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleHomePaths = {
  MENTEE: '/mentee',
  MENTOR: '/mentor',
  ADMIN: '/admin',
};

export default function GuestOnlyRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        Checking your session…
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={roleHomePaths[user.role] || '/'} replace />;
  }

  return children;
}
