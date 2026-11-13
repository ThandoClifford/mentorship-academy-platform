import { useState } from 'react';
import { Link, matchPath, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import './WorkspaceDesign.css';

const iconPaths = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  profile: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.7-3.1 3.2-5 7-5s6.3 1.9 7 5" /></>,
  search: <><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 4.5 4.5" /></>,
  mentor: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19c.6-2.8 2.7-4.5 6-4.5 1.5 0 2.8.4 3.8 1.1M16 8.5l1.5 1.5L21 6.5" /><path d="M15 15.5v4M13 17.5h4" /></>,
  goals: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  messages: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4H12" /><path d="M15 4h6M18 1v6" /></>,
  resources: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 1 4 16.5z" /><path d="M4 16.5A2.5 2.5 0 0 1 6.5 14H20M8 7h8M8 10h6" /></>,
  feedback: <><path d="M4 4h16v13H9l-5 4z" /><path d="m12 7 .9 2.2 2.4.2-1.8 1.5.6 2.3-2.1-1.2-2.1 1.2.6-2.3-1.8-1.5 2.4-.2z" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.5 2.6-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-3l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.5-2.6 1.4-1.1a7 7 0 0 1 0-1.8l-1.4-1.1 1.5-2.6 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8h3l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.5 2.6-1.4 1.1a7 7 0 0 1 0 1.7Z" /></>,
  requests: <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  reports: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 19c.5-2.7 2.5-4.3 6-4.3s5.5 1.6 6 4.3M16 5.5a3 3 0 0 1 0 5.8M18 14.8c1.7.6 2.7 2 3 4.2" /></>,
  applications: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M9 13h7M9 17h7" /></>,
  relationships: <><circle cx="6" cy="6" r="2" /><circle cx="18" cy="18" r="2" /><path d="M8 6h4a4 4 0 0 1 4 4v4a4 4 0 0 0 4 4M6 8v8a4 4 0 0 0 4 4h6" /></>,
  content: <><path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h8M8 16h5" /></>,
  notifications: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  audit: <><path d="M4 5h16M4 12h16M4 19h16" /><circle cx="7" cy="5" r=".7" fill="currentColor" /><circle cx="7" cy="12" r=".7" fill="currentColor" /><circle cx="7" cy="19" r=".7" fill="currentColor" /></>,
  logout: <><path d="M10 4H5v16h5M14 8l4 4-4 4M8 12h10" /></>,
};

function WorkspaceIcon({ name }) {
  return (
    <svg aria-hidden="true" className="workspace-nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {iconPaths[name] || iconPaths.dashboard}
    </svg>
  );
}

function getNavigationTitle(workspace, pathname) {
  const activePage = workspace.pages.find((page) => {
    const path = page.path ? `${workspace.basePath}/${page.path}` : workspace.basePath;
    return matchPath({ path, end: true }, pathname);
  });
  return activePage?.navLabel || activePage?.title || workspace.role;
}

function isCustomItemActive(item, workspace, pathname) {
  if (item.exact) return pathname === workspace.basePath || pathname === `${workspace.basePath}/`;
  const paths = item.activePaths?.length ? item.activePaths : [item.path];
  return paths.some((path) =>
    matchPath({
      path: `${workspace.basePath}/${path}`,
      end: path === item.path || item.exactActivePaths?.includes(path),
    }, pathname),
  );
}

export default function WorkspaceLayout({ workspace }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isMenteeWorkspace = workspace.role === 'Mentee';
  const hasGroupedNavigation = Boolean(workspace.navigation);
  const workspaceClass = workspace.role.toLowerCase();
  const firstName = user?.firstName || '';
  const lastName = user?.lastName || '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}` || 'U';
  const profilePath = `${workspace.basePath}/profile`;

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className={`workspace-shell${hasGroupedNavigation ? ` workspace-shell--standard workspace-shell--${workspaceClass}` : ''}`}>
      {menuOpen && <button className="workspace-menu-backdrop" type="button" aria-label="Close navigation" onClick={closeMenu} />}
      <aside className={`workspace-sidebar${menuOpen ? ' is-open' : ''}`}>
        <Link className="brand workspace-brand" to="/" onClick={closeMenu}>
          <span className="brand-mark">MA</span>
          <span className="brand-name">
            <strong>Mentorship</strong>
            <span>ACADEMY</span>
          </span>
        </Link>

        {hasGroupedNavigation ? (
          <nav className="workspace-nav workspace-nav-grouped" aria-label={`${workspace.role} navigation`}>
            {workspace.navigation.map((group) => (
              <div className="workspace-nav-section" key={group.label}>
                <span className="workspace-nav-heading">{group.label}</span>
                {group.items.map((item) => {
                  const to = item.path ? `${workspace.basePath}/${item.path}` : workspace.basePath;
                  const active = isCustomItemActive(item, workspace, pathname);
                  return (
                    <Link
                      aria-current={active ? 'page' : undefined}
                      className={`workspace-nav-link${active ? ' active' : ''}`}
                      key={item.path || item.label}
                      onClick={closeMenu}
                      to={to}
                    >
                      <WorkspaceIcon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        ) : (
          <>
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
                    className={({ isActive }) =>
                      `workspace-nav-link${isActive ? ' active' : ''}`
                    }
                    end={!page.path}
                    key={page.path || 'index'}
                    onClick={closeMenu}
                    to={to}
                  >
                    {page.navLabel || page.title}
                  </NavLink>
                );
              })}
            </nav>
            <p className="sidebar-note">{workspace.description}</p>
          </>
        )}

        {hasGroupedNavigation ? (
          <div className="workspace-sidebar-footer">
            <Link className="back-link" to="/" onClick={closeMenu}>
              <span aria-hidden="true">←</span> Back to Academy
            </Link>
            <button className="workspace-logout" onClick={handleLogout} type="button">
              <WorkspaceIcon name="logout" />
              <span>Log out</span>
            </button>
          </div>
        ) : (
          <>
            <Link className="back-link" to="/">
              <span aria-hidden="true">←</span> Back to Academy
            </Link>
            <button className="workspace-logout" onClick={handleLogout} type="button">
              Log out
            </button>
          </>
        )}
      </aside>

      <main className="workspace-main">
        <header className="workspace-topbar">
          {hasGroupedNavigation ? (
            <>
              <button
                aria-expanded={menuOpen}
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                className="workspace-menu-toggle"
                onClick={() => setMenuOpen((open) => !open)}
                type="button"
              >
                <span />
                <span />
                <span />
              </button>
              <div className="workspace-page-context">
                <span className="workspace-page-context-label">{workspace.role} workspace</span>
                <strong>{getNavigationTitle(workspace, pathname)}</strong>
              </div>
              <div className="workspace-topbar-actions">
                <NotificationBell basePath={workspace.basePath} />
                {isMenteeWorkspace || workspace.pages.some((page) => page.path === 'profile') ? (
                  <Link className="workspace-user" to={profilePath} aria-label={`View ${firstName || 'your'} profile`}>
                    <span className="workspace-user-avatar">{initials}</span>
                    <span className="workspace-user-copy">
                      <strong>{`${firstName} ${lastName}`.trim() || 'My profile'}</strong>
                      <small>{workspace.role}</small>
                    </span>
                  </Link>
                ) : (
                  <span className="workspace-user" aria-label={`${workspace.role} account`}>
                    <span className="workspace-user-avatar">{initials}</span>
                    <span className="workspace-user-copy">
                      <strong>{`${firstName} ${lastName}`.trim() || workspace.role}</strong>
                      <small>{workspace.role}</small>
                    </span>
                  </span>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="workspace-topbar-spacer" />
              <NotificationBell basePath={workspace.basePath} />
            </>
          )}
        </header>
        <Outlet />
      </main>
    </div>
  );
}
