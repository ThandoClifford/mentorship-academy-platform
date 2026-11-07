import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleHomePaths = {
  MENTEE: '/mentee',
  MENTOR: '/mentor',
  ADMIN: '/admin',
};

export default function ProtectedRoute({ allowedRole, children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        Checking your session…
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  if (user.role !== allowedRole) {
    return <Navigate to={roleHomePaths[user.role] || '/'} replace />;
  }

  return children;
}
