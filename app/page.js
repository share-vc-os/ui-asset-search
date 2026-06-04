'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

const IMAGE_PROXY = process.env.NEXT_PUBLIC_IMAGE_PROXY || 'https://uiassetimages.loclx.io';

export default function Home() {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [instance, setInstance] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState('grid');
  const [lightbox, setLightbox] = useState(null);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const limit = 60;
  const debounceRef = useRef(null);

  const types = [
    { key: 'all', label: 'All', icon: '◉' },
    { key: 'vercel', label: 'Vercel', icon: '▲' },
    { key: 'dashboard', label: 'Dashboards', icon: '◻' },
    { key: 'image', label: 'Images', icon: '◫' },
    { key: 'project', label: 'Projects', icon: '⊡' },
    { key: 'design', label: 'Designs', icon: '◈' },
  ];

  const instances = [
    { key: 'all', label: 'All Instances' },
    { key: 'shareos', label: 'ShareOS' },
    { key: 'feno', label: 'Feno' },
    { key: 'instill', label: 'Instill' },
    { key: 'sharehealth', label: 'ShareHealth' },
    { key: 'shareland', label: 'Shareland' },
    { key: '1440', label: '1440' },
    { key: 'shareos_meetings', label: 'Meetings' },
    { key: 'hamet_clawos', label: 'Hamet' },
    { key: 'trevor_clawos', label: 'Trevor' },
    { key: 'dexter_clawos', label: 'Dexter' },
    { key: 'celli', label: 'Celli' },
  ];

  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type !== 'all') params.set('type', type);
      if (instance !== 'all') params.set('instance', instance);
      if (debouncedQuery) params.set('query', debouncedQuery);
      params.set('limit', limit.toString());
      params.set('skip', ((page - 1) * limit).toString());
      const res = await fetch(`/api/assets?${params.toString()}`);
      const data = await res.json();
      setAssets(data.assets || []);
      setTotal(data.total || 0);
    } catch (e) {
      setAssets([]);
      setTotal(0);
    }
    setLoading(false);
  }, [type, instance, debouncedQuery, page]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);
  useEffect(() => { setPage(1); }, [type, instance, debouncedQuery]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="app">
      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
          <div className="lightbox-close">✕</div>
        </div>
      )}

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">Share Ventures</span>
          <span className="divider">/</span>
          <span className="page-title">Asset Explorer</span>
        </div>
        <div className="header-right">
          {stats && (
            <span className="badge mono">
              {stats.total?.toLocaleString()} assets indexed
            </span>
          )}
        </div>
      </header>

      <main className="main">
        {/* Stats Cards */}
        {stats && (
          <div className="stats-grid">
            {Object.entries(stats.by_type || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
              <button 
                key={k} 
                className={`stat-card ${type === k ? 'active' : ''}`}
                onClick={() => setType(type === k ? 'all' : k)}
              >
                <div className="stat-label">{k}</div>
                <div className="stat-value">{v.toLocaleString()}</div>
              </button>
            ))}
          </div>
        )}

        {/* Search Bar */}
        <div className="search-container">
          <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by name, URL, domain, path..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="search-input"
          />
          {query && (
            <button className="search-clear" onClick={() => setQuery('')}>✕</button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="filter-bar">
          <div className="filter-types">
            {types.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                className={`filter-btn ${type === t.key ? 'active' : ''}`}
              >
                <span className="filter-icon">{t.icon}</span>
                {t.label}
                {t.key !== 'all' && stats?.by_type?.[t.key] && (
                  <span className="filter-count">{stats.by_type[t.key].toLocaleString()}</span>
                )}
              </button>
            ))}
          </div>

          <div className="filter-actions">
            <select
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              className="instance-select"
            >
              {instances.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
            </select>

            <div className="view-toggle">
              <button onClick={() => setViewMode('grid')} className={viewMode === 'grid' ? 'active' : ''}>⊞</button>
              <button onClick={() => setViewMode('list')} className={viewMode === 'list' ? 'active' : ''}>≡</button>
            </div>
          </div>
        </div>

        {/* Results Bar */}
        <div className="results-bar">
          <span className="results-count">
            {loading ? 'Loading...' : `${total.toLocaleString()} results`}
            {!loading && total > limit && ` • Page ${page} of ${totalPages}`}
          </span>
          {instance !== 'all' && (
            <button className="clear-filter" onClick={() => setInstance('all')}>
              ✕ {instances.find(i => i.key === instance)?.label}
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading">
            <div className="spinner" />
          </div>
        ) : assets.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">∅</div>
            <div className="empty-title">No assets found</div>
            <div className="empty-sub">Try adjusting your filters or search query</div>
          </div>
        ) : viewMode === 'grid' ? (
          <div className={`grid ${type === 'image' ? 'grid-images' : 'grid-default'}`}>
            {assets.map((a, i) => (
              <AssetCard key={`${a.instance}-${a.name}-${i}`} asset={a} onImageClick={setLightbox} />
            ))}
          </div>
        ) : (
          <div className="list">
            <div className="list-header">
              <span className="list-col-type">Type</span>
              <span className="list-col-instance">Instance</span>
              <span className="list-col-name">Name</span>
              <span className="list-col-url">URL / Domain</span>
            </div>
            {assets.map((a, i) => (
              <AssetRow key={`${a.instance}-${a.name}-${i}`} asset={a} onImageClick={setLightbox} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="page-btn"
            >← Prev</button>
            
            {generatePageNumbers(page, totalPages).map((p, i) => (
              p === '...' ? (
                <span key={`dots-${i}`} className="page-dots">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`page-btn ${page === p ? 'active' : ''}`}
                >{p}</button>
              )
            ))}
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="page-btn"
            >Next →</button>
          </div>
        )}
      </main>

      <style>{styles}</style>
    </div>
  );
}

function generatePageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

function AssetCard({ asset, onImageClick }) {
  const isImage = asset.asset_type === 'image';
  const isVercel = asset.asset_type === 'vercel';
  const isDesign = asset.asset_type === 'design';
  const isDashboard = asset.asset_type === 'dashboard';
  const customDomain = asset.metadata?.custom_domain;
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  
  const imageUrl = isImage && asset.path && asset.instance
    ? `${IMAGE_PROXY}/image?instance=${encodeURIComponent(asset.instance)}&path=${encodeURIComponent(asset.path)}`
    : asset.thumbnail_url;

  const typeColors = { 
    vercel: { bg: 'rgba(250,250,250,0.06)', text: '#FAFAFA', icon: '▲' },
    dashboard: { bg: 'rgba(34,197,94,0.1)', text: '#22C55E', icon: '◻' },
    image: { bg: 'rgba(167,139,250,0.1)', text: '#A78BFA', icon: '◫' },
    project: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B', icon: '⊡' },
    design: { bg: 'rgba(236,72,153,0.1)', text: '#EC4899', icon: '◈' },
  };
  const tc = typeColors[asset.asset_type] || typeColors.project;

  return (
    <div className="card" onClick={() => isImage && imageUrl && !imgError && onImageClick(imageUrl)}>
      {/* Preview area */}
      {isImage && (
        <div className="card-preview">
          {imageUrl && !imgError ? (
            <>
              {!imgLoaded && <div className="card-preview-loading">⏳</div>}
              <img 
                src={imageUrl}
                alt={asset.name}
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                className={`card-img ${imgLoaded ? 'loaded' : ''}`}
              />
            </>
          ) : (
            <div className="card-preview-placeholder">
              <span className="placeholder-icon">◫</span>
              <span className="placeholder-name">{asset.name}</span>
            </div>
          )}
        </div>
      )}

      {isVercel && (
        <div className="card-preview card-preview-vercel">
          <span style={{ fontSize: 28, opacity: 0.8 }}>▲</span>
          {asset.metadata?.framework && (
            <span className="framework-badge">{asset.metadata.framework}</span>
          )}
        </div>
      )}

      {isDashboard && (
        <div className="card-preview card-preview-dashboard">
          <span style={{ fontSize: 24 }}>◻</span>
        </div>
      )}

      {isDesign && (
        <div className="card-preview card-preview-design">
          <span style={{ fontSize: 24 }}>◈</span>
        </div>
      )}

      {/* Card body */}
      <div className="card-body">
        <div className="card-meta">
          <span className="type-badge" style={{ background: tc.bg, color: tc.text }}>
            {tc.icon} {asset.asset_type}
          </span>
          <span className="instance-badge">{asset.instance}</span>
        </div>

        <div className="card-name">
          {asset.url ? (
            <a href={asset.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{asset.name}</a>
          ) : asset.name}
        </div>

        {customDomain && (
          <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer" className="custom-domain" onClick={e => e.stopPropagation()}>
            🌐 {customDomain}
          </a>
        )}

        {!customDomain && asset.path && (
          <div className="card-path">
            {asset.path.replace(/^\/home\/[^/]+\//, '~/')}
          </div>
        )}

        {asset.metadata?.framework && !isVercel && (
          <span className="framework-tag">{asset.metadata.framework}</span>
        )}
      </div>
    </div>
  );
}

function AssetRow({ asset, onImageClick }) {
  const customDomain = asset.metadata?.custom_domain;
  const typeColors = { 
    vercel: '#FAFAFA', dashboard: '#22C55E', image: '#A78BFA', 
    project: '#F59E0B', design: '#EC4899' 
  };
  
  return (
    <div className="list-row">
      <span className="list-type" style={{ color: typeColors[asset.asset_type] || '#A1A1AA' }}>
        {asset.asset_type}
      </span>
      <span className="list-instance">{asset.instance}</span>
      <span className="list-name">
        {asset.url ? (
          <a href={asset.url} target="_blank" rel="noopener noreferrer">{asset.name}</a>
        ) : asset.name}
      </span>
      <span className="list-url">
        {customDomain ? (
          <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer" className="domain-link">
            {customDomain}
          </a>
        ) : asset.url ? (
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="url-link">↗</a>
        ) : (
          <span className="path-text">{asset.path?.replace(/^\/home\/[^/]+\//, '~/').slice(-40)}</span>
        )}
      </span>
    </div>
  );
}

const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  .app {
    min-height: 100vh;
    background: #09090B;
    color: #FAFAFA;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Header */
  .header {
    border-bottom: 1px solid #27272A;
    padding: 18px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(9, 9, 11, 0.95);
    backdrop-filter: blur(8px);
  }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-right { display: flex; align-items: center; gap: 16px; }
  .logo { font-size: 18px; font-weight: 600; letter-spacing: -0.03em; }
  .divider { color: #3F3F46; font-size: 18px; font-weight: 300; }
  .page-title { color: #A1A1AA; font-size: 14px; font-weight: 400; }
  .badge { 
    font-family: 'JetBrains Mono', monospace; font-size: 11px; 
    color: #A1A1AA; background: #27272A; padding: 4px 10px; border-radius: 8px; 
  }
  .mono { font-family: 'JetBrains Mono', monospace; }

  /* Main */
  .main { max-width: 1440px; margin: 0 auto; padding: 28px 24px; }

  /* Stats */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
    margin-bottom: 28px;
  }
  .stat-card {
    background: #18181B;
    border: 1px solid #3F3F46;
    border-radius: 14px;
    padding: 14px 18px;
    text-align: left;
    cursor: pointer;
    transition: all 0.15s;
    font-family: inherit;
    color: inherit;
  }
  .stat-card:hover { border-color: #71717A; }
  .stat-card.active { border-color: #FAFAFA; background: #1a1a1f; }
  .stat-label { 
    font-family: 'JetBrains Mono', monospace; font-size: 10px; 
    color: #71717A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; 
  }
  .stat-value { font-size: 22px; font-weight: 600; letter-spacing: -0.03em; }

  /* Search */
  .search-container { position: relative; margin-bottom: 16px; }
  .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #71717A; }
  .search-input {
    width: 100%; background: #18181B; border: 1px solid #3F3F46; border-radius: 12px;
    padding: 13px 40px 13px 44px; color: #FAFAFA; font-size: 14px; outline: none;
    transition: border-color 0.2s; font-family: inherit;
  }
  .search-input:focus { border-color: #2563EB; }
  .search-input::placeholder { color: #71717A; }
  .search-clear {
    position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
    background: #27272A; border: none; color: #A1A1AA; width: 22px; height: 22px;
    border-radius: 6px; cursor: pointer; font-size: 11px; display: flex; align-items: center; justify-content: center;
  }

  /* Filters */
  .filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px; }
  .filter-types { display: flex; gap: 6px; flex-wrap: wrap; }
  .filter-btn {
    background: #18181B; color: #A1A1AA; border: 1px solid #3F3F46; border-radius: 10px;
    padding: 7px 12px; font-size: 12px; font-weight: 500; cursor: pointer;
    transition: all 0.15s; display: flex; align-items: center; gap: 5px; font-family: inherit;
  }
  .filter-btn:hover { border-color: #71717A; color: #FAFAFA; }
  .filter-btn.active { background: #FAFAFA; color: #09090B; border-color: #FAFAFA; }
  .filter-icon { font-size: 11px; }
  .filter-count { font-family: 'JetBrains Mono', monospace; font-size: 10px; opacity: 0.6; }
  .filter-actions { display: flex; gap: 8px; align-items: center; }
  .instance-select {
    background: #18181B; border: 1px solid #3F3F46; border-radius: 10px;
    padding: 7px 12px; color: #A1A1AA; font-size: 12px; cursor: pointer; font-family: inherit;
  }
  .instance-select option { background: #18181B; color: #FAFAFA; }
  .view-toggle { display: flex; border: 1px solid #3F3F46; border-radius: 10px; overflow: hidden; }
  .view-toggle button {
    background: #18181B; color: #71717A; border: none; padding: 7px 11px;
    cursor: pointer; font-size: 13px; transition: all 0.15s;
  }
  .view-toggle button.active { background: #27272A; color: #FAFAFA; }

  /* Results bar */
  .results-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .results-count { font-size: 12px; color: #71717A; }
  .clear-filter {
    font-size: 11px; color: #A1A1AA; background: #27272A; border: 1px solid #3F3F46;
    border-radius: 8px; padding: 3px 8px; cursor: pointer; font-family: inherit;
  }

  /* Loading / Empty */
  .loading { display: flex; justify-content: center; padding: 80px; }
  .spinner { width: 28px; height: 28px; border: 2px solid #3F3F46; border-top-color: #FAFAFA; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty { text-align: center; padding: 80px 20px; color: #71717A; }
  .empty-icon { font-size: 40px; margin-bottom: 12px; opacity: 0.5; }
  .empty-title { font-size: 15px; font-weight: 500; }
  .empty-sub { font-size: 12px; margin-top: 4px; }

  /* Grid */
  .grid { display: grid; gap: 10px; }
  .grid-default { grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
  .grid-images { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); }

  /* Card */
  .card {
    background: #18181B; border: 1px solid #3F3F46; border-radius: 14px;
    overflow: hidden; transition: border-color 0.2s, transform 0.15s;
  }
  .card:hover { border-color: #71717A; transform: translateY(-1px); }
  .card-preview {
    height: 140px; background: #111113; display: flex; align-items: center;
    justify-content: center; overflow: hidden; position: relative; border-bottom: 1px solid #27272A;
  }
  .card-preview-vercel { background: #000; height: 52px; }
  .card-preview-dashboard { background: linear-gradient(135deg, #0a1a0a 0%, #111 100%); height: 52px; }
  .card-preview-design { background: linear-gradient(135deg, #1a0a1a 0%, #111 100%); height: 52px; }
  .card-preview-loading { position: absolute; font-size: 14px; opacity: 0.3; }
  .card-img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s; }
  .card-img.loaded { opacity: 1; }
  .card-preview-placeholder { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .placeholder-icon { font-size: 20px; opacity: 0.2; }
  .placeholder-name { 
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #71717A;
    max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center;
  }
  .framework-badge {
    position: absolute; bottom: 8px; right: 8px;
    font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #A1A1AA;
    background: rgba(39, 39, 42, 0.9); padding: 2px 6px; border-radius: 4px;
  }
  .card-body { padding: 12px 14px; }
  .card-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
  .type-badge {
    font-family: 'JetBrains Mono', monospace; font-size: 9px; padding: 2px 7px;
    border-radius: 5px; text-transform: uppercase; letter-spacing: 0.02em; font-weight: 500;
  }
  .instance-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #71717A; }
  .card-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 4px; }
  .card-name a { color: #FAFAFA; text-decoration: none; }
  .card-name a:hover { color: #2563EB; }
  .custom-domain {
    display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 11px;
    color: #22C55E; text-decoration: none; margin-bottom: 4px;
  }
  .custom-domain:hover { text-decoration: underline; }
  .card-path {
    font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #52525B;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .framework-tag {
    display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 9px;
    color: #A1A1AA; background: #27272A; padding: 2px 6px; border-radius: 4px; margin-top: 4px;
  }

  /* List view */
  .list { border: 1px solid #3F3F46; border-radius: 14px; overflow: hidden; }
  .list-header {
    display: grid; grid-template-columns: 80px 100px 1fr 180px;
    padding: 10px 16px; background: #18181B; border-bottom: 1px solid #3F3F46;
    font-size: 11px; color: #71717A; font-weight: 500; text-transform: uppercase;
    letter-spacing: 0.05em; font-family: 'JetBrains Mono', monospace;
  }
  .list-row {
    display: grid; grid-template-columns: 80px 100px 1fr 180px;
    padding: 10px 16px; border-bottom: 1px solid #1a1a1f; align-items: center;
    transition: background 0.1s;
  }
  .list-row:hover { background: #18181B; }
  .list-row:last-child { border-bottom: none; }
  .list-type { font-family: 'JetBrains Mono', monospace; font-size: 10px; text-transform: uppercase; }
  .list-instance { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #71717A; }
  .list-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list-name a { color: #FAFAFA; text-decoration: none; }
  .list-name a:hover { color: #2563EB; }
  .list-url { text-align: right; }
  .domain-link { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #22C55E; text-decoration: none; }
  .domain-link:hover { text-decoration: underline; }
  .url-link { color: #2563EB; text-decoration: none; font-size: 14px; }
  .path-text { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #52525B; }

  /* Pagination */
  .pagination { display: flex; justify-content: center; gap: 6px; margin-top: 32px; align-items: center; flex-wrap: wrap; }
  .page-btn {
    background: #18181B; border: 1px solid #3F3F46; border-radius: 8px;
    padding: 7px 12px; min-width: 34px; color: #A1A1AA; font-size: 12px;
    cursor: pointer; font-family: inherit; font-weight: 400; transition: all 0.15s;
  }
  .page-btn:hover:not(:disabled) { border-color: #71717A; color: #FAFAFA; }
  .page-btn.active { background: #FAFAFA; color: #09090B; border-color: #FAFAFA; font-weight: 600; }
  .page-btn:disabled { color: #3F3F46; cursor: default; }
  .page-dots { color: #71717A; font-size: 12px; padding: 0 4px; }

  /* Lightbox */
  .lightbox {
    position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.94);
    display: flex; align-items: center; justify-content: center; cursor: zoom-out; padding: 24px;
  }
  .lightbox img { max-width: 92vw; max-height: 92vh; border-radius: 10px; object-fit: contain; box-shadow: 0 20px 60px rgba(0,0,0,0.5); }
  .lightbox-close { position: absolute; top: 20px; right: 24px; color: #FAFAFA; font-size: 20px; opacity: 0.7; }

  /* Links */
  a { color: #2563EB; text-decoration: none; }
  a:hover { text-decoration: underline; }
  ::selection { background: #2563EB; color: #FAFAFA; }

  /* Responsive */
  @media (max-width: 768px) {
    .header { padding: 14px 16px; }
    .main { padding: 20px 16px; }
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
    .filter-bar { flex-direction: column; align-items: stretch; }
    .filter-types { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
    .filter-actions { justify-content: space-between; }
    .grid-default { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); }
    .grid-images { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); }
    .list-header, .list-row { grid-template-columns: 60px 80px 1fr 120px; font-size: 10px; }
  }
  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .grid-default { grid-template-columns: 1fr; }
    .grid-images { grid-template-columns: repeat(2, 1fr); }
    .logo { font-size: 16px; }
  }
`;
