import { Link, NavLink, Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="public-shell">
      <header className="public-header">
        <Link className="brand" to="/" aria-label="Mentorship Academy home">
          <span className="brand-mark">MA</span>
          <span className="brand-name">
            <strong>Mentorship</strong>
            <span>ACADEMY</span>
          </span>
        </Link>
        <nav className="public-nav" aria-label="Main navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/mentee">Mentee</NavLink>
          <NavLink to="/mentor">Mentor</NavLink>
          <NavLink to="/admin">Admin</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
      <footer className="public-footer">
        <Link className="brand footer-brand" to="/">
          <span className="brand-mark">MA</span>
          <span className="brand-name">
            <strong>Mentorship</strong>
            <span>ACADEMY</span>
          </span>
        </Link>
        <p>Meet. Learn. Lead.</p>
      </footer>
    </div>
  );
}
