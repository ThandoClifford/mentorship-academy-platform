import { Link } from 'react-router-dom';

export default function WorkspaceLayout({ role, children }) {
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
          <strong>{role}</strong>
        </div>
        <Link className="back-link" to="/">
          <span aria-hidden="true">←</span> Back to Academy
        </Link>
        <p className="sidebar-note">Your mentorship journey starts here.</p>
      </aside>
      <main className="workspace-main">{children}</main>
    </div>
  );
}
