import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const roleHomePaths = {
  MENTEE: '/mentee',
  MENTOR: '/mentor',
  ADMIN: '/admin',
};

export default function GuestOnlyRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="auth-loading" role="status">
        Checking your session…
      </div>
    );
  }

  if (isAuthenticated) {
    if (user.role === 'MENTEE' && location.state?.journey === 'mentor') {
      return (
        <Navigate
          to="/mentor/register"
          replace
        />
      );
    }

    if (user.role === 'MENTEE' && location.state?.journey === 'mentee') {
      return (
        <Navigate
          to={location.state.newlyRegistered ? '/mentee/profile' : '/mentee'}
          replace
        />
      );
    }

    return <Navigate to={roleHomePaths[user.role] || '/'} replace />;
  }

  return children;
}
