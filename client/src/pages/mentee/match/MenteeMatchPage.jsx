import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext.jsx';
import * as matchingService from '../../../services/matchingService.js';
import * as mentorshipService from '../../../services/mentorshipService.js';
import MentorMatchCard from '../../../components/matching/MentorMatchCard.jsx';

export default function MenteeMatchPage() {
  const { user, loading: authLoading } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalCandidates, setTotalCandidates] = useState(0);
  const [requestingMentorId, setRequestingMentorId] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestError, setRequestError] = useState('');
  const [requestSuccess, setRequestSuccess] = useState(null);

  const loadMatches = useCallback(async () => {
    try {
      setError('');
      const data = await matchingService.getMentorMatches();
      setMatches(data.matches || []);
      setTotalCandidates(data.totalCandidates || 0);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('INCOMPLETE_PROFILE');
      } else {
        setError(
          err.response?.data?.message ||
            'Could not load mentor matches. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function init() {
      if (authLoading) return;

      if (!user) {
        setError('Authentication required.');
        setLoading(false);
        return;
      }

      await loadMatches();
    }

    init();
    return () => { active = false; };
  }, [user, authLoading, loadMatches]);

  function openRequestModal(mentorId) {
    setRequestingMentorId(mentorId);
    setRequestMessage('');
    setRequestError('');
    setShowRequestModal(true);
  }

  function closeRequestModal() {
    setShowRequestModal(false);
    setRequestingMentorId(null);
    setRequestMessage('');
    setRequestError('');
  }

  async function handleRequestMentorship() {
    if (!requestingMentorId) return;

    setRequestError('');

    try {
      await mentorshipService.createMentorshipRequest({
        mentorId: requestingMentorId,
        requestMessage: requestMessage.trim(),
      });
      setRequestSuccess(requestingMentorId);
      setMatches((prev) =>
        prev.map((match) =>
          match.mentorId === requestingMentorId
            ? { ...match, hasPendingRequest: true }
            : match,
        ),
      );
      closeRequestModal();
    } catch (err) {
      setRequestError(
        err.response?.data?.message ||
          'Could not send request. Please try again.',
      );
    }
  }

  if (authLoading || loading) {
    return (
      <section className="mentorship-page" role="status">
        <p className="mentorship-loading">
          Finding your best mentor matches…
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mentorship-page">
        <p className="mentorship-message mentorship-error" role="alert">
          Please log in to view mentor matches.
        </p>
      </section>
    );
  }

  if (error === 'INCOMPLETE_PROFILE') {
    return (
      <section className="mentorship-page">
        <header className="mentorship-page-header">
          <div>
            <span className="eyebrow">The Mentorship Academy</span>
            <h1>Find Your Match</h1>
            <p>
              AI-powered mentor matching based on your profile, goals, and preferences.
            </p>
          </div>
        </header>
        <div className="empty-state">
          <p>Complete your profile to unlock AI mentor matching.</p>
          <Link className="button button-primary" to="/mentee/profile">
            Complete Your Profile
          </Link>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="mentorship-page">
        <header className="mentorship-page-header">
          <div>
            <span className="eyebrow">The Mentorship Academy</span>
            <h1>Find Your Match</h1>
            <p>
              AI-powered mentor matching based on your profile, goals, and preferences.
              {totalCandidates > 0 && (
                <span> Found {totalCandidates} compatible mentor{totalCandidates !== 1 ? 's' : ''}.</span>
              )}
            </p>
          </div>
        </header>
        <p className="mentorship-message mentorship-error" role="alert">
          {error}
        </p>
        <div className="empty-state">
          <button className="button button-primary" onClick={loadMatches}>
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Find Your Match</h1>
          <p>
            AI-powered mentor matching based on your profile, goals, and preferences.
            {totalCandidates > 0 && (
              <span> Found {totalCandidates} compatible mentor{totalCandidates !== 1 ? 's' : ''}.</span>
            )}
          </p>
        </div>
      </header>

      {requestError && (
        <p className="mentorship-message mentorship-error" role="alert">
          {requestError}
        </p>
      )}
      {requestSuccess && (
        <p className="mentorship-message mentorship-success" role="status">
          Mentorship request sent! The mentor will review your request.
        </p>
      )}

      {!matches.length ? (
        <div className="empty-state">
          <p>No mentor matches found at this time.</p>
          <p className="empty-state-note">
            Check back later as new mentors join the platform, or
            <Link to="/mentee/mentorship/request">browse all mentors</Link>.
          </p>
        </div>
      ) : (
        <div className="mentor-grid" role="list">
          {matches.map((match) => (
            <MentorMatchCard
              key={match.mentorId}
              mentor={match}
              onRequestMentorship={openRequestModal}
              requestingMentorId={showRequestModal ? requestingMentorId : null}
            />
          ))}
        </div>
      )}

      {showRequestModal && requestingMentorId && (
        <div className="modal-overlay" onClick={closeRequestModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header className="modal-header">
              <h2>Request Mentorship</h2>
              <button className="modal-close" onClick={closeRequestModal} type="button" aria-label="Close">
                ×
              </button>
            </header>
            <form onSubmit={(e) => { e.preventDefault(); handleRequestMentorship(); }}>
              <div className="modal-body">
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
                />
                <p className="request-char-count">
                  {requestMessage.length}/2000 characters
                </p>
                {requestError && (
                  <p className="mentorship-message mentorship-error" role="alert">
                    {requestError}
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={closeRequestModal}
                >
                  Cancel
                </button>
                <button
                  className="button button-primary"
                  type="submit"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}