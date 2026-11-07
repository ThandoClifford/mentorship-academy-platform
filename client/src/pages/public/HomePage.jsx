import { Link } from 'react-router-dom';
import HealthStatus from '../../components/HealthStatus.jsx';

export default function HomePage() {
  return (
    <div className="home-page">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>
            Meet. Learn.
            <br />
            <span>Lead.</span>
          </h1>
          <p>
            A space for meaningful connections, shared experience, and the next
            step in your journey.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" to="/mentee">
              Explore the platform
            </Link>
            <a className="text-link" href="#about">
              Discover our approach <span aria-hidden="true">→</span>
            </a>
          </div>
          <HealthStatus />
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-orbit orbit-outer" />
          <div className="hero-orbit orbit-inner" />
          <div className="hero-sun" />
          <div className="hero-note">
            <span className="note-star">✦</span>
            <span>Grow with guidance</span>
          </div>
          <div className="hero-caption">A community of women who lead</div>
        </div>
      </section>
      <section className="intro-section" id="about">
        <span className="eyebrow">A journey, together</span>
        <h2>Every next chapter starts with a connection.</h2>
        <p>
          The Mentorship Academy brings people together to learn from one
          another and move forward with confidence.
        </p>
      </section>
    </div>
  );
}
