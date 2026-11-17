import { useCallback, useEffect, useMemo, useState } from 'react';
import * as resourceService from '../../services/resourceService.js';
import './ResourceLibraryPage.css';

const resourceTypes = ['ARTICLE', 'VIDEO', 'TOOL', 'GUIDE', 'CHECKLIST', 'WORKBOOK'];

function formatLabel(value) {
  return String(value || '')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function safeWebUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(value, window.location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
}

function ResourceCard({ resource }) {
  const image = safeWebUrl(resource.image);
  const url = safeWebUrl(resource.url);
  const createdAt = formatDate(resource.createdAt);

  return (
    <article className="resource-card">
      {image ? (
        <img className="resource-card-image" src={image} alt="" loading="lazy" />
      ) : (
        <div className="resource-card-art" aria-hidden="true">
          <span>{formatLabel(resource.type)}</span>
        </div>
      )}
      <div className="resource-card-body">
        <div className="resource-card-tags">
          <span className="resource-tag resource-tag--type">{formatLabel(resource.type)}</span>
          <span className="resource-tag">{formatLabel(resource.category)}</span>
        </div>
        <h2>{resource.title}</h2>
        {resource.description && <p className="resource-card-description">{resource.description}</p>}
        <div className="resource-card-footer">
          {createdAt && <span>Added {createdAt}</span>}
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer">
              Open resource <span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ResourceLibraryPage({ role }) {
  const [state, setState] = useState({ loading: true, error: '', resources: [] });
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: '' }));
    try {
      const result = await resourceService.listResources();
      setState({ loading: false, error: '', resources: result.resources || [] });
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error.response?.data?.message || 'Could not load resources. Please try again.',
      }));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(
    () => [...new Set(state.resources.map((resource) => resource.category).filter(Boolean))].sort(),
    [state.resources],
  );
  const filteredResources = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return state.resources.filter((resource) => {
      const matchesQuery = !normalizedQuery ||
        `${resource.title} ${resource.description} ${resource.category} ${resource.type}`
          .toLowerCase()
          .includes(normalizedQuery);
      return matchesQuery &&
        (!type || resource.type === type) &&
        (!category || resource.category === category);
    });
  }, [category, query, state.resources, type]);

  const description = role === 'MENTOR'
    ? 'Explore tools and ideas to support your mentoring practice.'
    : 'Find practical reads, guides, and tools for your learning journey.';

  return (
    <section className="resource-library">
      <header className="resource-library-header">
        <div>
          <span className="eyebrow">The Mentorship Academy</span>
          <h1>Resources</h1>
          <p>{description}</p>
        </div>
        <button className="button button-secondary" type="button" onClick={load} disabled={state.loading}>
          Refresh
        </button>
      </header>

      {state.error && (
        <div className="resource-library-error" role="alert">
          <span>{state.error}</span>
          <button type="button" onClick={load} disabled={state.loading}>Try again</button>
        </div>
      )}

      {!state.loading && !state.error && state.resources.length > 0 && (
        <div className="resource-filters" aria-label="Filter resources">
          <label>
            <span>Search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Title, topic, or keyword"
            />
          </label>
          <label>
            <span>Type</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">All types</option>
              {resourceTypes.map((option) => (
                <option key={option} value={option}>{formatLabel(option)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Category</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>{formatLabel(option)}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {state.loading ? (
        <div className="resource-library-state" role="status">
          <span className="resource-loading-spinner" aria-hidden="true" />
          Loading resources…
        </div>
      ) : !state.error && !state.resources.length ? (
        <div className="resource-library-empty">
          <span aria-hidden="true">✦</span>
          <h2>Resources are on their way</h2>
          <p>There are no published resources available for your workspace yet.</p>
        </div>
      ) : !state.error && !filteredResources.length ? (
        <div className="resource-library-empty">
          <h2>No matching resources</h2>
          <p>Try another search or clear one of the filters.</p>
          <button type="button" className="button button-secondary" onClick={() => {
            setQuery('');
            setType('');
            setCategory('');
          }}>
            Clear filters
          </button>
        </div>
      ) : state.error ? (
        state.resources.length > 0 && (
          <div className="resource-grid">
            {filteredResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
          </div>
        )
      ) : (
        <div className="resource-grid">
          {filteredResources.map((resource) => <ResourceCard key={resource.id} resource={resource} />)}
        </div>
      )}
    </section>
  );
}
