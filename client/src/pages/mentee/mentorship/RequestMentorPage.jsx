import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import * as profileService from '../../../services/profileService.js';

const statusLabels = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const statusColors = {
  PENDING: 'status-pending',
  ACCEPTED: 'status-accepted',
  DECLINED: 'status-declined',
  ACTIVE: 'status-active',
  COMPLETED: 'status-completed',
  ARCHIVED: 'status-archived',
};

function MentorCard({ mentor }) {
  return (
    <article className="mentor-card">
      <div className="mentor-card-header">
        {mentor.profilePhoto ? (
          <img
            className="mentor-avatar"
            src={mentor.profilePhoto}
            alt=""
            loading="lazy"
          />
        ) : (
          <div className="mentor-avatar placeholder" aria-hidden="true">
            {mentor.firstName?.[0]}{mentor.lastName?.[0]}
          </div>
        )}
        <div className="mentor-info">
          <h3 className="mentor-name">
            {mentor.firstName} {mentor.lastName}
          </h3>
          <p className="mentor-title">
            {mentor.jobTitle || 'Mentor'}{' '}
            {mentor.company ? `at ${mentor.company}` : ''}
          </p>
          {mentor.industry && (
            <p className="mentor-industry">{mentor.industry}</p>
          )}
        </div>
      </div>
      {mentor.bio && (
        <p className="mentor-bio">{mentor.bio}</p>
      )}
      <div className="mentor-expertise">
        {mentor.expertise?.slice(0, 4).map((skill, idx) => (
          <span key={idx} className="mentor-skill-tag">
            {skill}
          </span>
        ))}
        {mentor.expertise?.length > 4 && (
          <span className="mentor-skill-tag more">
            +{mentor.expertise.length - 4} more
          </span>
        )}
      </div>
      <div className="mentor-card-actions">
        <Link
          className="button button-secondary"
          to={`/mentee/mentorship/request/${mentor.id}`}
        >
          Request Mentorship
        </Link>
      </div>
    </article>
  );
}

function MentorList({ mentors, emptyMessage }) {
  if (!mentors.length) {
    return (
      <div className="empty-state">
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="mentor-grid" role="list">
      {mentors.map((mentor) => (
        <MentorCard key={mentor.id} mentor={mentor} />
      ))}
    </div>
  );
}

export default function RequestMentorPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadMentors() {
      try {
        const data = await profileService.getApprovedMentors();
        if (active) setMentors(data.mentors || []);
      } catch (err) {
        if (active) setError('Could not load mentors. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMentors();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading mentors…</p>
      </section>
    );
  }

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Find a Mentor</h1>
          <p>Browse approved mentors and request a mentorship connection.</p>
        </div>
      </header>

      {error && (
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
      )}

      <MentorList
        mentors={mentors}
        emptyMessage="No approved mentors available at the moment. Please check back later."
      />
    </section>
  );
}