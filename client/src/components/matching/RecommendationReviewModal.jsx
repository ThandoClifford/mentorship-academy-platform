import { useEffect, useState } from 'react';
import {
  AdminFilter,
  AdminNotice,
} from '../admin/AdminUI.jsx';
import RecommendationDetails from './RecommendationDetails.jsx';

function listText(values = []) {
  return Array.isArray(values) ? values.join('\n') : '';
}

function idOf(reference) {
  return reference?._id ? String(reference._id) : String(reference || '');
}

function participantOptions(members, currentMembership) {
  const options = [...members];
  if (
    currentMembership?.id &&
    !options.some((member) => member.id === currentMembership.id)
  ) {
    options.unshift(currentMembership);
  }
  return options;
}

function makeInitialAdjustment(recommendation) {
  return {
    menteeMembership: idOf(recommendation.menteeMembership?.id),
    mentorMembership: idOf(recommendation.mentorMembership?.id),
    compatibilityScore: String(recommendation.compatibilityScore ?? ''),
    scoreBreakdown: JSON.stringify(recommendation.scoreBreakdown || {}, null, 2),
    sharedInterests: listText(recommendation.sharedInterests),
    developmentOpportunities: listText(recommendation.developmentOpportunities),
    reasons: listText(recommendation.reasons),
  };
}

function toLines(value) {
  return value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

export default function RecommendationReviewModal({
  open,
  recommendation,
  mentees = [],
  mentors = [],
  profiles,
  profilesLoading,
  profilesError,
  detailsLoading,
  detailsError,
  saving,
  actionError,
  onClose,
  onApprove,
  onReject,
  onAdjust,
}) {
  const [mode, setMode] = useState('');
  const [reason, setReason] = useState('');
  const [adjustment, setAdjustment] = useState({});
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!recommendation) return;
    setMode('');
    setReason('');
    setFormError('');
    setAdjustment(makeInitialAdjustment(recommendation));
  }, [recommendation]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape' && !saving) onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, saving, onClose]);

  if (!open || !recommendation) return null;

  const status = recommendation.reviewStatus;
  const canApprove = ['PENDING', 'ADJUSTED'].includes(status);
  const canReject = ['PENDING', 'ADJUSTED'].includes(status);
  const canAdjust = ['PENDING', 'APPROVED', 'ADJUSTED'].includes(status);
  const menteeOptions = participantOptions(mentees, recommendation.menteeMembership);
  const mentorOptions = participantOptions(mentors, recommendation.mentorMembership);
  const reviewReady = !detailsLoading && !detailsError;

  function updateAdjustment(field, value) {
    setAdjustment((current) => ({ ...current, [field]: value }));
    setFormError('');
  }

  async function submitAdjustment(event) {
    event.preventDefault();
    setFormError('');
    const payload = { reason: reason.trim() };
    if (!payload.reason) {
      setFormError('Provide a reason for this adjustment.');
      return;
    }

    const original = makeInitialAdjustment(recommendation);
    if (adjustment.menteeMembership !== original.menteeMembership) {
      payload.menteeMembership = adjustment.menteeMembership;
    }
    if (adjustment.mentorMembership !== original.mentorMembership) {
      payload.mentorMembership = adjustment.mentorMembership;
    }
    if (adjustment.compatibilityScore !== original.compatibilityScore) {
      const score = Number(adjustment.compatibilityScore);
      if (
        !adjustment.compatibilityScore.trim() ||
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100
      ) {
        setFormError('Compatibility score must be between 0 and 100.');
        return;
      }
      payload.compatibilityScore = score;
    }
    if (adjustment.scoreBreakdown !== original.scoreBreakdown) {
      try {
        payload.scoreBreakdown = JSON.parse(adjustment.scoreBreakdown || '{}');
      } catch {
        setFormError('Score breakdown must be valid JSON.');
        return;
      }
    }
    for (const field of ['sharedInterests', 'developmentOpportunities', 'reasons']) {
      if (adjustment[field] !== original[field]) payload[field] = toLines(adjustment[field]);
    }
    if (Object.keys(payload).length === 1) {
      setFormError('Change at least one recommendation field.');
      return;
    }
    await onAdjust(payload);
  }

  return (
    <div
      className="matching-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section
        aria-labelledby="recommendation-review-title"
        aria-modal="true"
        className="matching-review-modal"
        role="dialog"
      >
        <header className="matching-modal-header">
          <div>
            <span className="admin-eyebrow">Cohort matching</span>
            <h2 id="recommendation-review-title">Review recommendation</h2>
          </div>
          <button
            aria-label="Close recommendation review"
            className="matching-modal-close"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="matching-modal-content">
          <AdminNotice>{detailsError}</AdminNotice>
          {detailsLoading ? (
            <p className="matching-profile-note" role="status">Loading recommendation details…</p>
          ) : (
            <RecommendationDetails
              recommendation={recommendation}
              profiles={profiles}
              profilesLoading={profilesLoading}
              profilesError={profilesError}
            />
          )}

          <AdminNotice>{actionError || formError}</AdminNotice>

          {!mode && (
            <div className="matching-modal-actions">
              {canApprove && (
                <button className="button button-primary" disabled={!reviewReady || saving} onClick={() => setMode('approve')} type="button">
                  Approve
                </button>
              )}
              {canReject && (
                <button className="button button-secondary admin-button-danger" disabled={!reviewReady || saving} onClick={() => { setReason(''); setFormError(''); setMode('reject'); }} type="button">
                  Reject
                </button>
              )}
              {canAdjust && (
                <button className="button button-secondary" disabled={!reviewReady || saving} onClick={() => { setReason(''); setFormError(''); setMode('adjust'); }} type="button">
                  Adjust
                </button>
              )}
            </div>
          )}

          {mode === 'approve' && (
            <div className="matching-action-form">
              <p>Approve this recommendation and ask the backend to establish the fixed cohort pairing?</p>
              <div className="matching-modal-actions">
                <button className="button button-primary" disabled={saving} onClick={onApprove} type="button">
                  {saving ? 'Approving…' : 'Confirm approval'}
                </button>
                <button className="button button-secondary" disabled={saving} onClick={() => setMode('')} type="button">Cancel</button>
              </div>
            </div>
          )}

          {mode === 'reject' && (
            <form className="matching-action-form" onSubmit={(event) => { event.preventDefault(); onReject(reason.trim()); }}>
              <AdminFilter label="Rejection reason">
                <textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
              </AdminFilter>
              <div className="matching-modal-actions">
                <button className="button button-secondary admin-button-danger" disabled={saving || !reason.trim()} type="submit">
                  {saving ? 'Rejecting…' : 'Confirm rejection'}
                </button>
                <button className="button button-secondary" disabled={saving} onClick={() => setMode('')} type="button">Cancel</button>
              </div>
            </form>
          )}

          {mode === 'adjust' && (
            <form className="matching-action-form matching-adjustment-form" onSubmit={submitAdjustment}>
              <p className="matching-adjustment-warning">
                An adjustment does not change an existing fixed pairing. Re-approval is required.
              </p>
              <div className="matching-adjustment-grid">
                <AdminFilter label="Mentee membership">
                  <select
                    disabled={saving || status === 'APPROVED'}
                    value={adjustment.menteeMembership || ''}
                    onChange={(event) => updateAdjustment('menteeMembership', event.target.value)}
                  >
                    {menteeOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.user?.firstName} {member.user?.lastName}
                      </option>
                    ))}
                  </select>
                </AdminFilter>
                <AdminFilter label="Mentor membership">
                  <select
                    disabled={saving}
                    value={adjustment.mentorMembership || ''}
                    onChange={(event) => updateAdjustment('mentorMembership', event.target.value)}
                  >
                    {mentorOptions.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.user?.firstName} {member.user?.lastName}
                      </option>
                    ))}
                  </select>
                </AdminFilter>
                <AdminFilter label="Compatibility score (0–100)">
                  <input
                    max="100"
                    min="0"
                    required
                    type="number"
                    value={adjustment.compatibilityScore}
                    onChange={(event) => updateAdjustment('compatibilityScore', event.target.value)}
                  />
                </AdminFilter>
                <AdminFilter label="Score breakdown (JSON object)">
                  <textarea rows={4} value={adjustment.scoreBreakdown} onChange={(event) => updateAdjustment('scoreBreakdown', event.target.value)} />
                </AdminFilter>
                <AdminFilter label="Shared interests (one per line)">
                  <textarea rows={3} value={adjustment.sharedInterests} onChange={(event) => updateAdjustment('sharedInterests', event.target.value)} />
                </AdminFilter>
                <AdminFilter label="Development opportunities (one per line)">
                  <textarea rows={3} value={adjustment.developmentOpportunities} onChange={(event) => updateAdjustment('developmentOpportunities', event.target.value)} />
                </AdminFilter>
                <AdminFilter label="Reasons (one per line)">
                  <textarea rows={3} value={adjustment.reasons} onChange={(event) => updateAdjustment('reasons', event.target.value)} />
                </AdminFilter>
                <AdminFilter label="Adjustment reason">
                  <textarea required maxLength={1000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />
                </AdminFilter>
              </div>
              <div className="matching-modal-actions">
                <button className="button button-primary" disabled={saving || !reason.trim()} type="submit">
                  {saving ? 'Saving…' : 'Save adjustment'}
                </button>
                <button className="button button-secondary" disabled={saving} onClick={() => setMode('')} type="button">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
