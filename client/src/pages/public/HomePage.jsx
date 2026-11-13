import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import './HomePage.css';
import {
  submitMentorApplication,
  getMyMentorApplication,
} from '../../services/mentorApplicationService.js';

const STORIES = [
  {
    meta: '2023 · Community · ICT · Women',
    title: "International Women's Day in ICT",
    text: "A story about women coming together around technology, opportunity and leadership. The Academy's community creates space for conversations that encourage women to see themselves as capable leaders and contributors.",
    quote: "When women connect, knowledge becomes confidence, and confidence becomes action.",
    cls: 'story-ict',
    year: '2023',
    label: "International Women's Day",
  },
  {
    meta: 'November 2022 · Women\'s Dialogue',
    title: "Women's Dialogue",
    text: "A space for women to share experiences, learn from one another and speak openly about the barriers and opportunities that shape their leadership journeys.",
    quote: "A meaningful conversation can become the beginning of a meaningful connection.",
    cls: 'story-2022',
    year: '2022',
    label: "Women's Dialogue",
  },
  {
    meta: 'November 2021 · Women\'s Dialogue',
    title: "Women's Dialogue",
    text: "An earlier chapter in the Academy's community journey, centred on dialogue, mentorship and creating stronger networks for women.",
    quote: "Every new chapter starts with women who are willing to connect, learn and lift one another.",
    cls: 'story-2021',
    year: '2021',
    label: "Women's Dialogue",
  },
];

const MENTORSHIP_STYLES = [
  'STRUCTURED',
  'FLEXIBLE',
  'GOAL_ORIENTED',
  'CONVERSATIONAL',
  'MIXED',
];

const STATUS_LABELS = {
  PENDING: 'Application under review',
  APPROVED: 'Approved — you can now mentor',
  REJECTED: 'Application not approved',
  SUSPENDED: 'Account suspended',
};

export default function HomePage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [application, setApplication] = useState(null);
  const [appLoading, setAppLoading] = useState(false);
  const [appChecked, setAppChecked] = useState(false);
  const [appError, setAppError] = useState(null);
  const [appForm, setAppForm] = useState({
    jobTitle: '',
    company: '',
    industry: '',
    yearsOfExperience: '',
    professionalBackground: '',
    expertise: '',
    skills: '',
    specialisations: '',
    experienceAreas: '',
    mentorshipAreas: '',
    mentorshipStyle: '',
    languages: '',
    availabilityDays: '',
    availabilityTimeZone: '',
    motivation: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const openStory = (i) => {
    setStoryIndex(i);
    setStoryOpen(true);
  };

  const loadApplication = useCallback(async () => {
    if (!isAuthenticated) {
      setApplication(null);
      setAppChecked(true);
      return;
    }

    setAppLoading(true);
    setAppError(null);
    try {
      const data = await getMyMentorApplication();
      setApplication(data?.application || null);
    } catch (error) {
      setAppError(error.response?.data?.message || 'Could not load your mentor application status.');
    } finally {
      setAppLoading(false);
      setAppChecked(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading) return;
    setAppChecked(false);
    loadApplication();
  }, [authLoading, loadApplication]);

  useEffect(() => {
    if (
      authLoading ||
      !isAuthenticated ||
      !appChecked ||
      location.state?.journeyAction !== 'mentor-application'
    ) return;

    setApplyOpen(true);
    navigate(location.pathname, { replace: true, state: null });
  }, [appChecked, authLoading, isAuthenticated, location.pathname, location.state, navigate]);

  function handleFindMentor() {
    if (!isAuthenticated) {
      navigate('/login', { state: { journey: 'mentee' } });
      return;
    }

    const roleHome = {
      MENTEE: '/mentee',
      MENTOR: '/mentor',
      ADMIN: '/admin',
    };
    navigate(roleHome[user?.role] || '/');
  }

  const handleApplyClick = () => {
    if (!isAuthenticated) {
      navigate('/login', { state: { journey: 'mentor' } });
      return;
    }
    setApplyOpen(true);
  };

  const handleApplySubmit = async (e) => {
    e.preventDefault();
    setAppError(null);
    setSubmitting(true);
    try {
      const years = appForm.yearsOfExperience.trim();
      const payload = {
        jobTitle: appForm.jobTitle.trim(),
        company: appForm.company.trim(),
        industry: appForm.industry.trim(),
        professionalBackground: appForm.professionalBackground.trim(),
        motivation: appForm.motivation.trim(),
        expertise: appForm.expertise
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        skills: appForm.skills
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        specialisations: appForm.specialisations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        experienceAreas: appForm.experienceAreas
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        mentorshipAreas: appForm.mentorshipAreas
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        mentorshipStyle: appForm.mentorshipStyle || '',
        languages: appForm.languages
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        yearsOfExperience: years !== '' ? Number(years) : null,
      };
      const availabilityDays = appForm.availabilityDays
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const availabilityTimeZone = appForm.availabilityTimeZone.trim();
      if (availabilityDays.length > 0 || availabilityTimeZone !== '') {
        payload.availability = {
          days: availabilityDays,
          timeZone: availabilityTimeZone,
        };
      }

      const data = await submitMentorApplication(payload);
      setApplication(data.application);
      setAppForm({
        jobTitle: '',
        company: '',
        industry: '',
        yearsOfExperience: '',
        professionalBackground: '',
        expertise: '',
        skills: '',
        specialisations: '',
        experienceAreas: '',
        mentorshipAreas: '',
        mentorshipStyle: '',
        languages: '',
        availabilityDays: '',
        availabilityTimeZone: '',
        motivation: '',
      });
      setApplyOpen(false);
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        navigate('/login', { state: { journey: 'mentor' } });
        return;
      }
      let message = err.message || 'Could not submit application. Please try again.';
      if (err.response?.data?.message) {
        message = err.response.data.message;
      }
      setAppError(message);
    } finally {
      setSubmitting(false);
    }
  };

  async function handleApplicationRetry() {
    setAppChecked(false);
    await loadApplication();
  }

  const statusText = application
    ? STATUS_LABELS[application.status] || application.status
    : 'Not submitted';

  return (
    <div className="landing-page">
      <header className="academy-header">
        <div className="academy-header-inner">
          <a
            className="academy-brand"
            href="#home"
            onClick={(event) => {
              event.preventDefault();
              setNavOpen(false);
            }}
            aria-label="The Mentorship Academy home"
          >
            <span className="academy-brand-mark">MA</span>
            <span className="academy-brand-name">
              <strong>Mentorship</strong>
              <small>ACADEMY</small>
            </span>
          </a>
          <button
            aria-expanded={navOpen}
            aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
            className={`academy-menu-toggle${navOpen ? ' is-open' : ''}`}
            onClick={() => setNavOpen((open) => !open)}
            type="button"
          >
            <span />
            <span />
            <span />
          </button>
          <nav className={`academy-nav${navOpen ? ' is-open' : ''}`} aria-label="Main navigation">
            <div className="academy-nav-links">
              <a href="#about" onClick={() => setNavOpen(false)}>About</a>
              <a href="#program" onClick={() => setNavOpen(false)}>Programmes</a>
              <a href="#journey" onClick={() => setNavOpen(false)}>How it works</a>
              <a href="#stories" onClick={() => setNavOpen(false)}>Stories</a>
              <Link to="/resources" onClick={() => setNavOpen(false)}>Resources</Link>
            </div>
            <div className="academy-nav-actions">
              <Link
                className="academy-login"
                state={!isAuthenticated ? { journey: 'mentee' } : undefined}
                to={isAuthenticated ? `/${user.role.toLowerCase()}` : '/login'}
                onClick={() => setNavOpen(false)}
              >
                Log in
              </Link>
              <Link
                className="academy-join"
                state={!isAuthenticated ? { journey: 'mentee' } : undefined}
                to={isAuthenticated ? `/${user.role.toLowerCase()}` : '/register'}
                onClick={() => setNavOpen(false)}
              >
                Get started
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main
        id="home"
        className="page active"
      >
        <section className="academy-hero">
          <div className="academy-hero-grid">
            <div className="academy-hero-copy">
              <span className="academy-eyebrow">
                <span /> Mentorship Academy
              </span>
              <h1>
                Find the right mentor.
                <span> Build your future.</span>
              </h1>
              <p>
                A community for young women to find guidance, grow with purpose
                and lead with confidence.
              </p>
              <div className="academy-hero-actions">
                <button className="academy-primary-action" onClick={handleFindMentor}>
                  Find a Mentor <span aria-hidden="true">→</span>
                </button>
                <button className="academy-secondary-action" onClick={handleApplyClick}>
                  Become a Mentor
                </button>
              </div>
              <div className="academy-hero-note">
                <span className="academy-note-mark" aria-hidden="true">✦</span>
                <span>Guidance that grows with you</span>
              </div>
            </div>

            <div
              className="academy-hero-art"
              role="img"
              aria-label="An illustration of a mentor and mentee connected through shared growth"
            >
              <div className="academy-art-glow" />
              <div className="academy-art-orbit academy-art-orbit-one" />
              <div className="academy-art-orbit academy-art-orbit-two" />
              <div className="academy-art-spark academy-art-spark-one">✦</div>
              <div className="academy-art-spark academy-art-spark-two">✦</div>
              <div className="academy-connection">
                <div className="academy-person academy-person-mentor">
                  <svg viewBox="0 0 96 112" role="presentation" aria-hidden="true">
                    <circle cx="48" cy="33" r="20" />
                    <path d="M12 108c2-29 16-45 36-45s34 16 36 45" />
                    <path d="M28 34c0-15 8-24 20-24s20 9 20 24" />
                  </svg>
                  <span>Experience</span>
                </div>
                <div className="academy-connection-line" aria-hidden="true">
                  <span>✦</span>
                </div>
                <div className="academy-person academy-person-mentee">
                  <svg viewBox="0 0 96 112" role="presentation" aria-hidden="true">
                    <circle cx="48" cy="33" r="20" />
                    <path d="M12 108c2-29 16-45 36-45s34 16 36 45" />
                    <path d="M27 29c3-14 10-20 21-20 12 0 19 8 21 20" />
                  </svg>
                  <span>Ambition</span>
                </div>
              </div>
              <div className="academy-art-caption">
                <span className="academy-caption-icon" aria-hidden="true">↗</span>
                <span>
                  <strong>Grow, together</strong>
                  <small>One meaningful connection at a time</small>
                </span>
              </div>
              <div className="academy-art-label">A community of women moving forward</div>
            </div>
          </div>
          <div className="academy-trust-line">
            <span>Thoughtful mentorship.</span>
            <span className="academy-trust-dot" />
            <span>Real growth.</span>
            <span className="academy-trust-dot" />
            <span>Stronger futures.</span>
          </div>
        </section>

        <section className="academy-value-section" id="program">
          <div className="academy-section-heading">
            <span className="academy-eyebrow">Why Mentorship Academy?</span>
            <h2>Make room for what’s possible.</h2>
            <p>Meaningful support can change how you see your next step—and what you believe you can achieve.</p>
          </div>
          <div className="academy-value-grid">
            <article className="academy-value-card">
              <span className="academy-value-number">01</span>
              <h3>Find your person</h3>
              <p>Connect with a mentor who understands your ambitions and can help you see new possibilities.</p>
              <span className="academy-value-mark" aria-hidden="true">↗</span>
            </article>
            <article className="academy-value-card">
              <span className="academy-value-number">02</span>
              <h3>Grow with purpose</h3>
              <p>Turn the things you want to change into thoughtful goals and practical next steps.</p>
              <span className="academy-value-mark" aria-hidden="true">✦</span>
            </article>
            <article className="academy-value-card">
              <span className="academy-value-number">03</span>
              <h3>Build your confidence</h3>
              <p>Make space to learn, reflect and recognise the progress you’re making along the way.</p>
              <span className="academy-value-mark" aria-hidden="true">◎</span>
            </article>
            <article className="academy-value-card">
              <span className="academy-value-number">04</span>
              <h3>Lead your next chapter</h3>
              <p>Bring your growing experience, voice and network into the future you’re creating.</p>
              <span className="academy-value-mark" aria-hidden="true">↗</span>
            </article>
          </div>
        </section>

        <section className="section center" id="journey">
          <div className="eyebrow">How it works</div>
          <h2>Your mentorship journey</h2>
          <p className="lead">
            A simple digital experience designed around the young woman joining
            the Academy.
          </p>
          <div className="steps">
            <div className="step">
              <div className="num">1</div>
              <h3>Tell us about you</h3>
              <p>
                Share your background, interests, ambitions and the kind of
                support you need.
              </p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h3>Get your match</h3>
              <p>
                Our matching service recommends approved mentors based on your
                profile, goals and preferences.
              </p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h3>Grow together</h3>
              <p>
                Explore your recommended mentor and continue your mentorship
                journey through the Academy.
              </p>
            </div>
          </div>
        </section>

        <section className="section split" id="about">
          <div>
            <div className="eyebrow">About TMA</div>
            <h2>We are women. We lead.</h2>
            <p className="lead" style={{ margin: 0 }}>
              The Academy offers an online mentorship programme for young women
              who are employed, unemployed or self-employed. The programme is
              being piloted in South Africa with a vision to expand across
              Africa.
            </p>
            <div style={{ marginTop: 28 }}>
              <button className="btn primary" onClick={handleApplyClick}>
                Apply to the Academy
              </button>
            </div>
          </div>
          <div className="featurebox">
            <div className="eyebrow" style={{ color: '#f5c542' }}>
              Our purpose
            </div>
            <h3>Transformative mentorship.</h3>
            <ul>
              <li>Build a pool and pipeline of young women leaders.</li>
              <li>Address barriers to leadership.</li>
              <li>Unleash hidden leadership talent.</li>
              <li>Build stronger networks and confidence.</li>
            </ul>
          </div>
        </section>

        <section className="section stories-section" id="stories">
          <div className="stories-head">
            <div>
              <div className="eyebrow">Our Stories</div>
              <h2>Women. Stories. Connections.</h2>
              <p className="lead" style={{ margin: 0 }}>
                The moments, conversations and experiences that continue to
                shape The Mentorship Academy community.
              </p>
            </div>
            <div className="story-count">
              <strong>03</strong>
              <span>featured stories</span>
            </div>
          </div>

          <div className="story-grid">
            {STORIES.map((s, i) => (
              <article
                className={`story-card${i === 0 ? ' featured' : ''}`}
                key={`${s.year}-${s.title}`}
                onClick={() => openStory(i)}
              >
                <div className={`story-image ${s.cls}`}>
                  <span className="story-year">{s.year}</span>
                  <span className="story-label">{s.label}</span>
                </div>
                <div className="story-body">
                  <div className="story-meta">{s.meta}</div>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                  <button className="story-link">Read the story &rarr;</button>
                </div>
              </article>
            ))}
          </div>

          <div className="story-bottom">
            <div>
              <span className="eyebrow">Your story starts here</span>
              <h3>Every connection can become a new chapter.</h3>
            </div>
            <button className="btn primary" onClick={handleFindMentor}>
              Find My Mentor &rarr;
            </button>
          </div>
        </section>

        <div className="cta">
          <div>
            <h2>Ready to find your direction?</h2>
            <p>
              Tell us what matters to you and explore mentors whose experience
              can support your next step.
            </p>
          </div>
          <button className="btn yellow" onClick={handleFindMentor}>
            Find a Mentor &rarr;
          </button>
        </div>
      </main>

      <div
        className={`modal${applyOpen ? ' show' : ''}`}
        id="apply"
      >
        <div className="modalbox">
          <button className="close" onClick={() => setApplyOpen(false)}>
            &times;
          </button>
          {appLoading || !appChecked ? (
            <p role="status">Checking your application status…</p>
          ) : appError ? (
            <div>
              <div className="eyebrow">Mentor application</div>
              <h2>We couldn’t check your application</h2>
              <p role="alert">{appError}</p>
              <button className="btn primary" onClick={handleApplicationRetry} type="button">
                Try again
              </button>
            </div>
          ) : application ? (
            <div>
              <div className="eyebrow">Application status</div>
              <h2>{statusText}</h2>
              {application.status === 'PENDING' && (
                <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 0' }}>
                  Your mentor application has been submitted and is pending
                  admin review. You will be notified once a decision is made.
                </p>
              )}
              {application.status === 'APPROVED' && (
                <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 0' }}>
                  Congratulations! Your mentor application has been approved.
                  You can now participate in mentorship as a mentor.
                </p>
              )}
              {application.status === 'REJECTED' && (
                <>
                  <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 0' }}>
                    Your mentor application was not approved at this time.
                  </p>
                  {application.adminNotes && (
                    <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 8 }}>
                      <strong>Admin notes:</strong> {application.adminNotes}
                    </p>
                  )}
                  <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 12 }}>
                    You may submit a new application if your circumstances
                    change.
                  </p>
                </>
              )}
              {application.status === 'SUSPENDED' && (
                <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '10px 0 0' }}>
                  Your mentor account has been suspended. Contact the academy
                  for more information.
                </p>
              )}
              <button
                className="btn outline"
                onClick={() => setApplyOpen(false)}
                style={{ marginTop: 18 }}
              >
                Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleApplySubmit}>
              <div className="eyebrow">Mentor application</div>
              <h2>Apply to become a mentor</h2>
              {appError && (
                <p
                  style={{
                    color: '#962752',
                    background: '#fff5f8',
                    border: '1px solid #f0cbd9',
                    padding: 10,
                    borderRadius: 8,
                    fontSize: 12,
                    marginBottom: 14,
                  }}
                >
                  {appError}
                </p>
              )}
              <p style={{ color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
                Tell us about your professional background and why you would
                like to mentor through the Academy.
              </p>
              <label>Job title</label>
              <input
                placeholder="e.g. Product Manager"
                value={appForm.jobTitle}
                required
                onChange={(e) => setAppForm({ ...appForm, jobTitle: e.target.value })}
              />
              <label>Company</label>
              <input
                placeholder="e.g. Tech Solutions Inc."
                value={appForm.company}
                required
                onChange={(e) => setAppForm({ ...appForm, company: e.target.value })}
              />
              <label>Industry</label>
              <input
                placeholder="e.g. Technology"
                value={appForm.industry}
                required
                onChange={(e) => setAppForm({ ...appForm, industry: e.target.value })}
              />
              <label>Years of experience</label>
              <input
                type="number"
                min="0"
                max="80"
                placeholder="0"
                value={appForm.yearsOfExperience}
                onChange={(e) => setAppForm({ ...appForm, yearsOfExperience: e.target.value })}
              />
              <label>Professional background</label>
              <textarea
                placeholder="Summarise your professional experience and areas of expertise."
                value={appForm.professionalBackground}
                required
                onChange={(e) =>
                  setAppForm({ ...appForm, professionalBackground: e.target.value })
                }
                rows={3}
              />
              <label>Expertise (comma-separated)</label>
              <input
                placeholder="e.g. Leadership, Strategy, Coaching"
                value={appForm.expertise}
                onChange={(e) => setAppForm({ ...appForm, expertise: e.target.value })}
              />
              <label>Skills (comma-separated)</label>
              <input
                placeholder="e.g. Public speaking, Project management"
                value={appForm.skills}
                onChange={(e) => setAppForm({ ...appForm, skills: e.target.value })}
              />
              <label>Specialisations (comma-separated)</label>
              <input
                placeholder="e.g. Executive coaching, Digital transformation"
                value={appForm.specialisations}
                onChange={(e) => setAppForm({ ...appForm, specialisations: e.target.value })}
              />
              <label>Experience areas (comma-separated)</label>
              <input
                placeholder="e.g. Startups, Enterprise, Non-profit"
                value={appForm.experienceAreas}
                onChange={(e) => setAppForm({ ...appForm, experienceAreas: e.target.value })}
              />
              <label>Mentorship areas (comma-separated)</label>
              <input
                placeholder="e.g. Career growth, Leadership, Entrepreneurship"
                value={appForm.mentorshipAreas}
                onChange={(e) => setAppForm({ ...appForm, mentorshipAreas: e.target.value })}
              />
              <label>Mentorship style</label>
              <select
                value={appForm.mentorshipStyle}
                onChange={(e) => setAppForm({ ...appForm, mentorshipStyle: e.target.value })}
              >
                <option value="">Select a style</option>
                {MENTORSHIP_STYLES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <label>Languages (comma-separated)</label>
              <input
                placeholder="e.g. English, Zulu, Xhosa"
                value={appForm.languages}
                onChange={(e) => setAppForm({ ...appForm, languages: e.target.value })}
              />
              <label>Availability days (comma-separated, optional)</label>
              <input
                placeholder="e.g. MONDAY, WEDNESDAY, FRIDAY"
                value={appForm.availabilityDays}
                onChange={(e) => setAppForm({ ...appForm, availabilityDays: e.target.value })}
              />
              <label>Time zone (optional)</label>
              <input
                placeholder="e.g. Africa/Johannesburg"
                value={appForm.availabilityTimeZone}
                onChange={(e) => setAppForm({ ...appForm, availabilityTimeZone: e.target.value })}
              />
              <label>Why would mentorship benefit you?</label>
              <textarea
                placeholder="Tell us about your goals and why you want to mentor."
                value={appForm.motivation}
                required
                onChange={(e) => setAppForm({ ...appForm, motivation: e.target.value })}
                rows={3}
              />
              <button
                className="btn primary"
                style={{ width: '100%', marginTop: 18 }}
                disabled={submitting}
              >
                {submitting ? 'Submitting…' : 'Submit application &rarr;'}
              </button>
            </form>
          )}
        </div>
      </div>

      <div
        className={`story-modal${storyOpen ? ' show' : ''}`}
        id="storyModal"
      >
        <div className="story-modal-card">
          <button className="story-close" onClick={() => setStoryOpen(false)}>
            &times;
          </button>
          <div
            id="storyModalImage"
            className={`story-modal-image ${STORIES[storyIndex].cls}`}
          />
          <div className="story-modal-content">
            <div className="story-meta" id="storyModalMeta">
              {STORIES[storyIndex].meta}
            </div>
            <h2 id="storyModalTitle">{STORIES[storyIndex].title}</h2>
            <p id="storyModalText">{STORIES[storyIndex].text}</p>
            <div className="story-quote" id="storyModalQuote">
              {STORIES[storyIndex].quote}
            </div>
            <button
              className="btn primary"
              onClick={() => { setStoryOpen(false); handleFindMentor(); }}
            >
              Start Your Mentorship Journey &rarr;
            </button>
          </div>
        </div>
      </div>

      <footer>
        <div className="foot">
          <div>
            <div className="brand" style={{ color: '#fff' }}>
              <div className="logo" style={{ width: 34, height: 34, fontSize: 16 }}>
                MA
              </div>
              <small style={{ display: 'block', color: '#a18a96', fontSize: 9 }}>
                MENTORSHIP &middot; ACADEMY
              </small>
            </div>
          </div>
          <div>
            <h4>Academy</h4>
            <a href="#about">About</a>
            <a href="#program">E-Mentorship</a>
            <a href="#mentors">Mentors</a>
            <a href="#stories">Our Stories</a>
          </div>
          <div>
            <h4>Join</h4>
            <a href="#apply" onClick={(e) => { e.preventDefault(); handleApplyClick(); }}>Apply Now</a>
            <a href="#apply" onClick={(e) => { e.preventDefault(); handleApplyClick(); }}>Become a Mentor</a>
            <Link to="/register">Become a Mentee</Link>
          </div>
          <div>
            <h4>Support</h4>
            <Link to="/contact">Contact</Link>
            <Link to="/resources">Resources</Link>
            <Link to="/faq">FAQ</Link>
          </div>
        </div>
        <div className="copy">
          &copy; The Mentorship Academy. E-mentorship for young women.
        </div>
      </footer>
    </div>
  );
}
