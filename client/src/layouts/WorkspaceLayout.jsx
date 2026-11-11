import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';

export default function WorkspaceLayout({ workspace }) {
  const { logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="workspace-shell">
      <aside className="workspace-sidebar">
        <Link className="brand workspace-brand" to="/">
          <span className="brand-mark">MA</span>
          <span className="brand-name">
            <strong>Mentorship</strong>
            <span>ACADEMY</span>
          </span>
        </Link>
        <div className="workspace-role">
          <span className="workspace-eyebrow">Workspace</span>
          <strong>{workspace.role}</strong>
        </div>
        <nav className="workspace-nav" aria-label={`${workspace.role} navigation`}>
          {workspace.pages.map((page) => {
            const to = page.path
              ? `${workspace.basePath}/${page.path}`
              : workspace.basePath;

            return (
              <NavLink
                key={page.path || 'index'}
                to={to}
                end={!page.path}
                className={({ isActive }) =>
                  `workspace-nav-link${isActive ? ' active' : ''}`
                }
              >
                {page.navLabel || page.title}
              </NavLink>
            );
          })}
        </nav>
        <p className="sidebar-note">{workspace.description}</p>
        <Link className="back-link" to="/">
          <span aria-hidden="true">←</span> Back to Academy
        </Link>
        <button className="workspace-logout" onClick={handleLogout} type="button">
          Log out
        </button>
      </aside>
      <main className="workspace-main">
        <header className="workspace-topbar">
          <div className="workspace-topbar-spacer" />
          <NotificationBell basePath={workspace.basePath} />
        </header>
        <Outlet />
      </main>
    </div>
  );
}
