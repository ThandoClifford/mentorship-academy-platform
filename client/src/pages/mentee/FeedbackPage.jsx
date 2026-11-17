import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import * as feedbackService from '../../services/feedbackService.js';
import * as mentorshipService from '../../services/mentorshipService.js';

const feedbackTypes = ['OVERALL', 'MENTORSHIP', 'PROGRESS', 'COMMUNICATION'];
const ratingFields = [
  ['communicationRating', 'Communication'],
  ['supportRating', 'Support'],
  ['progressRating', 'Progress'],
];

const emptyForm = {
  rating: '',
  communicationRating: '',
  supportRating: '',
  progressRating: '',
  comments: '',
  feedbackType: 'OVERALL',
};

function getId(value) {
  return typeof value === 'string' ? value : value?.id || value?._id || '';
}

function getPersonName(person, fallback) {
  return `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || fallback;
}

function formatLabel(value) {
  return String(value || '').toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString();
}

function apiFieldErrors(error) {
  const errors = error.response?.data?.errors;
  return errors && typeof errors === 'object' ? errors : {};
}

function RatingSelect({ id, label, value, onChange, required, error, disabled }) {
  return (
    <div className="form-field">
      <label className="form-label" htmlFor={id}>
        {label}{required && <span aria-hidden="true"> *</span>}
      </label>
      <select
        className="form-input"
        id={id}
        value={value}
        onChange={onChange}
        required={required}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">{required ? 'Choose a rating…' : 'Not rated'}</option>
        {[1, 2, 3, 4, 5].map((rating) => (
          <option key={rating} value={rating}>{rating} / 5</option>
        ))}
      </select>
      {error && <span className="form-error" id={`${id}-error`}>{error}</span>}
    </div>
  );
}

function FeedbackCard({ feedback, currentUserId }) {
  const isOwnFeedback = String(getId(feedback.submittedBy)) === String(currentUserId);
  const author = isOwnFeedback ? 'You' : getPersonName(feedback.submittedBy, 'Mentorship partner');
  const ratings = [
    ['Communication', feedback.communicationRating],
    ['Support', feedback.supportRating],
    ['Progress', feedback.progressRating],
  ].filter(([, rating]) => rating !== null && rating !== undefined);

  return (
    <article className="goal-card">
      <div className="goal-card-header">
        <div>
          <h3 className="goal-title">{author}</h3>
          <p className="goal-category">{formatLabel(feedback.feedbackType)} · {formatDate(feedback.createdAt)}</p>
        </div>
        <span className="relationship-status status-active">{feedback.rating} / 5 overall</span>
      </div>
      {ratings.length > 0 && (
        <p className="relationship-mentor-title">
          {ratings.map(([label, rating]) => `${label}: ${rating}/5`).join(' · ')}
        </p>
      )}
      {feedback.comments && <p>{feedback.comments}</p>}
    </article>
  );
}

export default function MenteeFeedbackPage() {
  const { user } = useAuth();
  const [relationships, setRelationships] = useState([]);
  const [relationshipsLoading, setRelationshipsLoading] = useState(true);
  const [relationshipsError, setRelationshipsError] = useState('');
  const [selectedRelationshipId, setSelectedRelationshipId] = useState('');
  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const [feedbackReload, setFeedbackReload] = useState(0);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadRelationships = useCallback(async () => {
    setRelationshipsLoading(true);
    setRelationshipsError('');
    try {
      const result = await mentorshipService.getMyMentorshipRelationships();
      const items = result.relationships || [];
      setRelationships(items);
      setSelectedRelationshipId((current) =>
        items.some((relationship) => String(relationship.id) === String(current))
          ? current
          : items[0]?.id || '',
      );
    } catch (error) {
      setRelationships([]);
      setSelectedRelationshipId('');
      setRelationshipsError(error.response?.data?.message || 'Could not load your mentorship relationships.');
    } finally {
      setRelationshipsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRelationships();
  }, [loadRelationships]);

  useEffect(() => {
    if (!selectedRelationshipId) {
      setFeedback([]);
      setFeedbackLoading(false);
      setFeedbackError('');
      return undefined;
    }

    let active = true;
    setFeedback([]);
    setFeedbackLoading(true);
    setFeedbackError('');
    setNotice('');
    setSubmitError('');
    setFormErrors({});

    feedbackService.listRelationshipFeedback(selectedRelationshipId)
      .then((result) => {
        if (active) setFeedback(result.feedback || []);
      })
      .catch((error) => {
        if (active) {
          setFeedbackError(error.response?.data?.message || 'Could not load feedback for this relationship.');
        }
      })
      .finally(() => {
        if (active) setFeedbackLoading(false);
      });

    return () => { active = false; };
  }, [feedbackReload, selectedRelationshipId]);

  const selectedRelationship = useMemo(
    () => relationships.find((relationship) => String(relationship.id) === String(selectedRelationshipId)),
    [relationships, selectedRelationshipId],
  );
  const ownFeedback = feedback.find(
    (item) => String(getId(item.submittedBy)) === String(getId(user)),
  );

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setFormErrors((current) => ({ ...current, [field]: '' }));
    setSubmitError('');
    setNotice('');
  }

  function validateForm() {
    const errors = {};
    if (!form.rating) {
      errors.rating = 'Choose an overall rating.';
    } else if (!Number.isInteger(Number(form.rating)) || Number(form.rating) < 1 || Number(form.rating) > 5) {
      errors.rating = 'Choose a rating from 1 to 5.';
    }
    for (const [field] of ratingFields) {
      if (form[field] && (!Number.isInteger(Number(form[field])) || Number(form[field]) < 1 || Number(form[field]) > 5)) {
        errors[field] = 'Choose a rating from 1 to 5.';
      }
    }
    if (form.comments.length > 4000) {
      errors.comments = 'Comments must be 4000 characters or fewer.';
    }
    if (!feedbackTypes.includes(form.feedbackType)) {
      errors.feedbackType = 'Choose a valid feedback type.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submit(event) {
    event.preventDefault();
    if (!validateForm() || !selectedRelationshipId || submitting) return;

    setSubmitting(true);
    setSubmitError('');
    setNotice('');
    try {
      const payload = {
        rating: Number(form.rating),
        feedbackType: form.feedbackType,
        comments: form.comments,
      };
      for (const [field] of ratingFields) {
        if (form[field]) payload[field] = Number(form[field]);
      }
      const result = await feedbackService.submitRelationshipFeedback(selectedRelationshipId, payload);
      if (result.feedback) setFeedback((current) => [result.feedback, ...current]);
      setForm(emptyForm);
      setNotice('Your feedback has been submitted.');
    } catch (error) {
      setFormErrors(apiFieldErrors(error));
      setSubmitError(error.response?.data?.message || 'Could not submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mentorship-page">
      <header className="mentorship-page-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Feedback</h1>
          <p>Share your experience with a mentor and review feedback for your mentorship relationships.</p>
        </div>
        <button
          className="button button-secondary"
          type="button"
          onClick={loadRelationships}
          disabled={relationshipsLoading}
        >
          {relationshipsLoading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {notice && <p className="mentorship-message" role="status">{notice}</p>}
      {relationshipsError && (
        <p className="mentorship-message mentorship-error" role="alert">
          {relationshipsError}{' '}
          <button className="text-link" type="button" onClick={loadRelationships}>Try again</button>
        </p>
      )}

      {relationshipsLoading ? (
        <p className="mentorship-loading" role="status">Loading your mentorship relationships…</p>
      ) : relationshipsError ? null : relationships.length === 0 ? (
        <div className="empty-state">
          <p>You need an accepted mentorship relationship before you can share or view feedback.</p>
          <Link className="button button-primary" to="/mentee/mentorship/request">Find a Mentor</Link>
        </div>
      ) : (
        <>
          <div className="relationship-selector">
            <label className="relationship-selector-label" htmlFor="feedback-relationship">
              Select mentorship relationship
            </label>
            <select
              className="relationship-selector-select"
              id="feedback-relationship"
              value={selectedRelationshipId}
              onChange={(event) => {
                setSelectedRelationshipId(event.target.value);
                setFeedback([]);
                setFeedbackLoading(true);
                setFeedbackError('');
                setForm(emptyForm);
              }}
            >
              {relationships.map((relationship) => (
                <option key={relationship.id} value={relationship.id}>
                  {getPersonName(relationship.mentor, 'Mentor')} · {formatLabel(relationship.status)}
                </option>
              ))}
            </select>
          </div>

          {feedbackLoading ? (
            <p className="mentorship-loading" role="status">Loading feedback…</p>
          ) : feedbackError ? (
            <p className="mentorship-message mentorship-error" role="alert">
              {feedbackError}{' '}
              <button className="text-link" type="button" onClick={() => setFeedbackReload((count) => count + 1)}>
                Try again
              </button>
            </p>
          ) : (
            <>
              <section aria-labelledby="feedback-history-heading">
                <div className="goals-section-header">
                  <div>
                    <h2 id="feedback-history-heading">Feedback history</h2>
                    {selectedRelationship && (
                      <p className="goal-category">
                        {getPersonName(selectedRelationship.mentor, 'Your mentor')} · {formatLabel(selectedRelationship.status)}
                      </p>
                    )}
                  </div>
                </div>
                {feedback.length ? (
                  <div className="relationship-list">
                    {feedback.map((item) => (
                      <FeedbackCard key={item.id} feedback={item} currentUserId={getId(user)} />
                    ))}
                  </div>
                ) : (
                  <div className="empty-state"><p>No feedback has been submitted for this relationship yet.</p></div>
                )}
              </section>

              {ownFeedback ? (
                <p className="mentorship-message">
                  You have already submitted feedback for this relationship. Feedback cannot be edited or submitted again.
                </p>
              ) : (
                <form className="goal-form-wrapper" onSubmit={submit} noValidate>
                  <div className="goals-section-header">
                    <div>
                      <h2>Share your feedback</h2>
                      <p className="goal-category">Your feedback is shared with your mentorship partner.</p>
                    </div>
                  </div>
                  {submitError && <p className="mentorship-message mentorship-error" role="alert">{submitError}</p>}

                  <RatingSelect
                    id="feedback-rating"
                    label="Overall rating"
                    value={form.rating}
                    onChange={(event) => updateForm('rating', event.target.value)}
                    required
                    error={formErrors.rating}
                    disabled={submitting}
                  />
                  <div className="form-row">
                    {ratingFields.map(([field, label]) => (
                      <RatingSelect
                        key={field}
                        id={`feedback-${field}`}
                        label={`${label} rating (optional)`}
                        value={form[field]}
                        onChange={(event) => updateForm(field, event.target.value)}
                        error={formErrors[field]}
                        disabled={submitting}
                      />
                    ))}
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="feedback-type">Feedback type</label>
                    <select
                      className="form-input"
                      id="feedback-type"
                      value={form.feedbackType}
                      onChange={(event) => updateForm('feedbackType', event.target.value)}
                      disabled={submitting}
                      aria-invalid={Boolean(formErrors.feedbackType)}
                    >
                      {feedbackTypes.map((type) => (
                        <option key={type} value={type}>{formatLabel(type)}</option>
                      ))}
                    </select>
                    {formErrors.feedbackType && <span className="form-error">{formErrors.feedbackType}</span>}
                  </div>
                  <div className="form-field">
                    <label className="form-label" htmlFor="feedback-comments">Comments (optional)</label>
                    <textarea
                      className="form-textarea"
                      id="feedback-comments"
                      value={form.comments}
                      onChange={(event) => updateForm('comments', event.target.value)}
                      maxLength={4000}
                      rows={5}
                      disabled={submitting}
                      aria-invalid={Boolean(formErrors.comments)}
                      aria-describedby={formErrors.comments ? 'feedback-comments-error' : undefined}
                    />
                    <span className="goal-category">{form.comments.length} / 4000</span>
                    {formErrors.comments && <span className="form-error" id="feedback-comments-error">{formErrors.comments}</span>}
                  </div>
                  <button
                    className="button button-primary"
                    type="submit"
                    disabled={submitting || feedbackLoading || Boolean(feedbackError)}
                  >
                    {submitting ? 'Submitting…' : 'Submit feedback'}
                  </button>
                </form>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
