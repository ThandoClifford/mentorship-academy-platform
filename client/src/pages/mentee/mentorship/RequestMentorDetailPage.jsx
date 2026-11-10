import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import * as mentorshipService from '../../../services/mentorshipService.js';
import * as profileService from '../../../services/profileService.js';

export default function RequestMentorDetailPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: mentorId } = useParams();
  const [mentor, setMentor] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadMentor() {
      try {
        const data = await profileService.getApprovedMentors();
        const mentors = data.mentors || [];
        const foundMentor = mentors.find((m) => String(m.id) === String(mentorId));
        if (active) {
          if (foundMentor) {
            setMentor(foundMentor);
          } else {
            setError('Mentor not found or no longer available.');
          }
        }
      } catch (err) {
        if (active) setError('Could not load mentor details.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMentor();
    return () => { active = false; };
  }, [mentorId]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!requestMessage.trim()) {
      setError('Please enter a message for your mentorship request.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess(false);

    try {
      await mentorshipService.createMentorshipRequest({
        mentorId,
        requestMessage: requestMessage.trim(),
      });
      setSuccess(true);
      setRequestMessage('');
      setTimeout(() => {
        navigate('/mentee/mentorship/requests', { replace: true });
      }, 2000);
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not submit request. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">Loading mentor…</p>
      </section>
    );
  }

  if (!mentor) {
    return (
      <section className="mentorship-page">
        {error && (
          <p className="mentorship-message mentorship-error" role="alert">
            {error}
          </p>
        )}
        {!error && (
          <p className="mentorship-message mentorship-error" role="alert">
            Mentor not found.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Request Mentorship</h1>
          <p>Send a mentorship request to {mentor.firstName} {mentor.lastName}.</p>
        </div>
      </header>

      <article className="mentor-detail-card">
        <div className="mentor-detail-header">
          {mentor.profilePhoto ? (
            <img
              className="mentor-detail-avatar"
              src={mentor.profilePhoto}
              alt=""
              loading="lazy"
            />
          ) : (
            <div className="mentor-detail-avatar placeholder" aria-hidden="true">
              {mentor.firstName?.[0]}{mentor.lastName?.[0]}
            </div>
          )}
          <div className="mentor-detail-info">
            <h2 className="mentor-detail-name">
              {mentor.firstName} {mentor.lastName}
            </h2>
            <p className="mentor-detail-title">
              {mentor.jobTitle || 'Mentor'}{' '}
              {mentor.company ? `at ${mentor.company}` : ''}
            </p>
            {mentor.industry && (
              <p className="mentor-detail-industry">{mentor.industry}</p>
            )}
            {mentor.yearsOfExperience !== null && mentor.yearsOfExperience !== undefined && (
              <p className="mentor-detail-experience">
                {mentor.yearsOfExperience} years experience
              </p>
            )}
          </div>
        </div>
        {mentor.bio && (
          <p className="mentor-detail-bio">{mentor.bio}</p>
        )}
        <div className="mentor-detail-expertise">
          {mentor.expertise?.map((skill, idx) => (
            <span key={idx} className="mentor-skill-tag">{skill}</span>
          ))}
          {mentor.skills?.map((skill, idx) => (
            <span key={`skill-${idx}`} className="mentor-skill-tag">{skill}</span>
          ))}
        </div>
      </article>

      <form className="request-form" onSubmit={handleSubmit}>
        <fieldset className="request-fieldset">
          <legend>Your Message</legend>
          <label htmlFor="request-message" className="request-label">
            Tell this mentor why you would like to work with them, what you hope to learn, and any relevant background.
          </label>
          <textarea
            id="request-message"
            className="request-textarea"
            value={requestMessage}
            onChange={(e) => setRequestMessage(e.target.value)}
            rows={6}
            maxLength={2000}
            placeholder="Dear [Mentor Name], I am reaching out because…"
            disabled={submitting || success}
            required
          />
          <p className="request-char-count">
            {requestMessage.length}/2000 characters
          </p>
        </fieldset>

        {error && (
          <p className="mentorship-message mentorship-error" role="alert">
            {error}
          </p>
        )}
        {success && (
          <p className="mentorship-message mentorship-success" role="status">
            Your mentorship request has been sent! Redirecting to your requests…
          </p>
        )}

        <div className="request-form-actions">
          <button
            className="button button-primary"
            type="submit"
            disabled={submitting || success || !requestMessage.trim()}
          >
            {submitting ? 'Sending request…' : 'Send Request'}
          </button>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => navigate(-1)}
            disabled={submitting}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}