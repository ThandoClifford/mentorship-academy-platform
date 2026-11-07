import { Link, useLocation } from 'react-router-dom';

export default function PagePlaceholder({
  title,
  description,
  backTo,
  backLabel,
}) {
  const { pathname } = useLocation();

  return (
    <section className="page-placeholder">
      <span className="eyebrow">The Mentorship Academy</span>
      <h1>{title}</h1>
      <p className="placeholder-description">{description}</p>
      <p className="current-route">
        <span>Current route</span>
        <code>{pathname}</code>
      </p>
      <Link
        className="placeholder-back-link"
        to={backTo}
      >
        <span aria-hidden="true">←</span> {backLabel}
      </Link>
      <span className="coming-soon">Page placeholder</span>
    </section>
  );
}
