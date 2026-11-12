import { useState } from 'react';
import { Link } from 'react-router-dom';

const MENTORS = [
  {
    name: 'Naledi M.',
    role: 'Leadership & Career Mentor',
    score: 96,
    tags: ['Leadership', 'Career', 'Confidence'],
    icon: '👩🏾‍💼',
    reason: 'Strong alignment with leadership growth and career direction.',
  },
  {
    name: 'Zanele K.',
    role: 'Entrepreneurship & Business Mentor',
    score: 91,
    tags: ['Business', 'Networking', 'Growth'],
    icon: '👩🏿‍💻',
    reason: 'Excellent fit for entrepreneurship, networking and business goals.',
  },
  {
    name: 'Ayanda S.',
    role: 'Corporate Career Mentor',
    score: 87,
    tags: ['Career', 'Skills', 'Leadership'],
    icon: '👩🏽‍💼',
    reason: 'Strong experience match for workplace readiness and leadership.',
  },
];

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

export default function HomePage() {
  const [activeView, setActiveView] = useState('home');
  const [applyOpen, setApplyOpen] = useState(false);
  const [storyOpen, setStoryOpen] = useState(false);
  const [storyIndex, setStoryIndex] = useState(0);
  const [results, setResults] = useState([]);
  const [form, setForm] = useState({
    role: 'Young professional',
    goals: [],
    bio: '',
    experience: 'Leadership',
  });

  const toggleGoal = (value) => {
    setForm((prev) => {
      const next = prev.goals.includes(value)
        ? prev.goals.filter((g) => g !== value)
        : [...prev.goals, value];
      return { ...prev, goals: next };
    });
  };

  const runMatch = () => {
    const { goals, experience } = form;
    const list = MENTORS.map((m) => {
      let s = m.score;
      if (goals.includes('leadership') && m.tags.includes('Leadership')) s += 2;
      if (goals.includes('career') && m.tags.includes('Career')) s += 2;
      if (goals.includes('business') && m.tags.includes('Business')) s += 3;
      if (goals.includes('network') && m.tags.includes('Networking')) s += 2;
      if (goals.includes('confidence') && m.tags.includes('Confidence')) s += 2;
      if (experience.toLowerCase().includes(m.role.split(' ')[0].toLowerCase())) s += 1;
      return { ...m, score: Math.min(99, s) };
    }).sort((a, b) => b.score - a.score);
    setResults(list);
    setActiveView('results');
  };

  const openStory = (i) => {
    setStoryIndex(i);
    setStoryOpen(true);
  };

  return (
    <div className="landing-page">
      <div className="top">
        THE MENTORSHIP ACADEMY &middot; E-MENTORSHIP FOR YOUNG WOMEN
      </div>

      <nav>
        <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setActiveView('home'); }}>
          <div className="logo">MA</div>
          <small>MENTORSHIP &middot; ACADEMY</small>
        </a>
        <div className="links">
          <a href="#about">About</a>
          <a href="#program">E-Mentorship</a>
          <a href="#mentors">Mentors</a>
          <a href="#stories">Our Stories</a>
          <button className="btn outline" onClick={() => setActiveView('match')}>
            Find My Match
          </button>
          <button className="btn primary" onClick={() => setApplyOpen(true)}>
            Apply Now
          </button>
        </div>
      </nav>

      <main
        id="home"
        className={`page ${activeView === 'home' ? 'active' : ''}`}
      >
        <section className="hero">
          <div>
            <div className="kicker">Mentorship that moves women forward</div>
            <h1>
              Meet. Learn. <span>Lead.</span>
            </h1>
            <p>
              The Mentorship Academy connects young women with meaningful
              mentorship to build confidence, grow networks and unlock
              leadership potential.
            </p>
            <div className="actions">
              <button
                className="btn yellow"
                onClick={() => setActiveView('match')}
              >
                Find My Mentor Match &rarr;
              </button>
              <button className="btn outline" onClick={() => setApplyOpen(true)}>
                Join the Academy
              </button>
            </div>
            <div className="mini">
              <div>
                <strong>01</strong>Connect
              </div>
              <div>
                <strong>02</strong>Grow
              </div>
              <div>
                <strong>03</strong>Lead
              </div>
            </div>
          </div>
          <div className="visual">
            <div className="circle" />
            <div className="card profile">
              <div className="avatar">👩🏾‍💼</div>
              <h3>Women supporting women</h3>
              <p style={{ fontSize: 12, color: '#756c7d' }}>
                Career &middot; Leadership &middot; Confidence
              </p>
              <span className="tag">Mentorship</span>
              <span className="tag">Leadership</span>
            </div>
            <div className="card match">
              <div style={{ fontSize: 11, fontWeight: 800 }}>AI MATCH PREVIEW</div>
              <div className="score">94% match</div>
              <div className="matchbar"><span /></div>
              <div style={{ fontSize: 11, color: '#756c7d' }}>
                Leadership &middot; Career growth &middot; Networking
              </div>
            </div>
          </div>
        </section>

        <section className="section center" id="program">
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
                Our prototype AI compares your goals and preferences with mentor
                expertise and produces ranked matches.
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
              <button className="btn primary" onClick={() => setApplyOpen(true)}>
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

        <section className="section center" id="mentors">
          <div className="eyebrow">Mentor community</div>
          <h2>Meet the kind of mentors you can connect with</h2>
          <p className="lead">
            The prototype uses mentor expertise, goals and interests to
            demonstrate how intelligent matching could work.
          </p>
          <div className="cards">
            {MENTORS.map((m) => (
              <div className="person" key={m.name}>
                <div className="photo">{m.icon}</div>
                <div className="body">
                  <h3>{m.role}</h3>
                  <p>{m.reason}</p>
                  {m.tags.map((t) => (
                    <span className="pill" key={t}>{t}</span>
                  ))}
                </div>
              </div>
            ))}
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
                key={s.title}
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
            <button className="btn primary" onClick={() => setActiveView('match')}>
              Find My Mentor &rarr;
            </button>
          </div>
        </section>

        <div className="cta">
          <div>
            <h2>Ready to find your direction?</h2>
            <p>
              Use the interactive matchmaking prototype to see how a mentee
              could move from her goals to a recommended mentor.
            </p>
          </div>
          <button className="btn yellow" onClick={() => setActiveView('match')}>
            Try the AI Matchmaker &rarr;
          </button>
        </div>
      </main>

      <main id="match" className={`page ${activeView === 'match' ? 'active' : ''}`}>
        <section className="matchpage">
          <div className="wizard">
            <div className="panel">
              <a className="back" href="#" onClick={(e) => { e.preventDefault(); setActiveView('home'); }}>
                &larr; Back to Academy
              </a>
              <h1 style={{ margin: '0 0 8px' }}>Find Your Mentor</h1>
              <p style={{ color: 'var(--muted)', fontSize: 14 }}>
                Tell us about your goals. This demo will simulate how AI could
                rank suitable mentors.
              </p>
              <div className="progress">
                <span className="active" />
                <span />
                <span />
              </div>
              <label>What best describes you?</label>
              <select
                id="role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option>Young professional</option>
                <option>Student</option>
                <option>Entrepreneur</option>
                <option>Job seeker</option>
              </select>
              <label>What are you hoping to grow?</label>
              <div className="checks">
                {[
                  { value: 'career', label: 'Career direction' },
                  { value: 'leadership', label: 'Leadership' },
                  { value: 'business', label: 'Business' },
                  { value: 'network', label: 'Networking' },
                  { value: 'confidence', label: 'Confidence' },
                  { value: 'skills', label: 'Skills' },
                ].map((g) => (
                  <label className="check" key={g.value}>
                    <input
                      type="checkbox"
                      className="goal"
                      value={g.value}
                      checked={form.goals.includes(g.value)}
                      onChange={() => toggleGoal(g.value)}
                    />
                    {g.label}
                  </label>
                ))}
              </div>
              <label>Tell us about your ambition</label>
              <textarea
                id="bio"
                placeholder="Example: I want to move into leadership and build my professional network."
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
              <label>Preferred mentor experience</label>
              <select
                id="experience"
                value={form.experience}
                onChange={(e) => setForm({ ...form, experience: e.target.value })}
              >
                <option>Leadership</option>
                <option>Entrepreneurship</option>
                <option>Corporate career</option>
                <option>General career guidance</option>
              </select>
              <button
                className="btn primary"
                style={{ marginTop: 22, width: '100%' }}
                onClick={runMatch}
              >
                Find My Matches &rarr;
              </button>
            </div>
            <div className="panel ai">
              <div className="orb">AI</div>
              <h2>Smart Matchmaking</h2>
              <p style={{ color: '#eadff0', lineHeight: 1.7 }}>
                The prototype scores mentors against the information you
                provide.
              </p>
              <ul>
                <li>Goal alignment</li>
                <li>Experience relevance</li>
                <li>Shared interests</li>
                <li>Mentor fit</li>
              </ul>
              <div
                style={{
                  marginTop: 30,
                  padding: 14,
                  border: '1px solid #8b62b0',
                  borderRadius: 12,
                  fontSize: 11,
                }}
              >
                This is a front-end simulation. A production system would
                connect these rules to your real mentor database and AI service.
              </div>
            </div>
          </div>
        </section>
      </main>

      <main id="results" className={`page ${activeView === 'results' ? 'active' : ''}`}>
        <section className="matchpage">
          <div className="results">
            <a className="back" href="#" onClick={(e) => { e.preventDefault(); setActiveView('match'); }}>
              &larr; Change my answers
            </a>
            <h1>Your Mentor Matches</h1>
            <p style={{ color: 'var(--muted)' }}>
              Based on the goals you selected, these mentors rank highest.
            </p>
            <div id="resultList">
              {results.map((m) => (
                <div className="result" key={m.name}>
                  <div className="avatar2">{m.icon}</div>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 17 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: '#756c7d', marginTop: 3 }}>
                      {m.role}
                    </div>
                    <div className="tags">
                      {m.tags.map((t) => (
                        <span className="pill" key={t}>{t}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: 12, color: '#756c7d' }}>
                      {m.reason}
                    </div>
                  </div>
                  <div>
                    <span className="score">{m.score}% match</span>
                    <div className="result-actions" style={{ marginTop: 10 }}>
                      <button
                        className="btn outline"
                        onClick={() => alert('Prototype: mentor profile opened.')}
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="btn outline"
              onClick={() => setActiveView('home')}
              style={{ marginTop: 20 }}
            >
              Return to Academy
            </button>
          </div>
        </section>
      </main>

      <div
        className={`modal${applyOpen ? ' show' : ''}`}
        id="apply"
      >
        <div className="modalbox">
          <button className="close" onClick={() => setApplyOpen(false)}>
            &times;
          </button>
          <div className="eyebrow">Academy application</div>
          <h2>Start your application</h2>
          <p style={{ color: 'var(--muted)', lineHeight: 1.6 }}>
            This prototype follows the live Academy's application structure:
            basic information, contact details, motivation questions and
            account setup.
          </p>
          <label>First name</label>
          <input placeholder="Your first name" />
          <label>Email address</label>
          <input placeholder="you@example.com" />
          <label>Why would mentorship benefit you?</label>
          <textarea placeholder="Tell us about your goals..." />
          <button
            className="btn primary"
            style={{ width: '100%', marginTop: 18 }}
            onClick={() => alert('Prototype only: application captured successfully.')}
          >
            Continue application &rarr;
          </button>
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
              onClick={() => { setStoryOpen(false); setActiveView('match'); }}
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
            <a>Apply Now</a>
            <a>Become a Mentor</a>
            <a>Become a Mentee</a>
          </div>
          <div>
            <h4>Support</h4>
            <a>Contact</a>
            <a>Resources</a>
            <a>FAQ</a>
          </div>
        </div>
        <div className="copy">
          &copy; The Mentorship Academy. E-mentorship for young women.
        </div>
      </footer>
    </div>
  );
}
