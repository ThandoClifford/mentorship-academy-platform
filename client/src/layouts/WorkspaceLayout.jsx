import { Link, NavLink, Outlet } from 'react-router-dom';

export default function WorkspaceLayout({ workspace }) {
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
      </aside>
      <main className="workspace-main">
        <Outlet />
      </main>
    </div>
  );
}
