import { Link, NavLink, Outlet } from 'react-router-dom';
import { publicRoutes } from '../routes.js';

export default function PublicLayout() {
  const primaryRoutes = ['about', 'programmes', 'how-it-works', 'stories', 'resources', 'contact'];
  const accountRoutes = ['login', 'register'];

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
          <NavLink to="/" end>Home</NavLink>
          {primaryRoutes.map((path) => {
            const page = publicRoutes.find((route) => route.path === path);

            return (
              <NavLink key={path} to={`/${path}`}>
                {page.title}
              </NavLink>
            );
          })}
          {accountRoutes.map((path) => {
            const page = publicRoutes.find((route) => route.path === path);

            return (
              <NavLink
                key={path}
                className={path === 'register' ? 'nav-cta' : undefined}
                to={`/${path}`}
              >
                {page.title}
              </NavLink>
            );
          })}
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
        <div className="public-footer-links">
          {publicRoutes.map((page) => (
            <Link key={page.path} to={`/${page.path}`}>
              {page.title}
            </Link>
          ))}
          <Link to="/mentee">Mentee workspace</Link>
          <Link to="/mentor">Mentor workspace</Link>
          <Link to="/admin">Admin workspace</Link>
        </div>
        <p className="footer-tagline">Meet. Learn. Lead.</p>
      </footer>
    </div>
  );
}
