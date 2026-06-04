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
  const [chatOpen, setChatOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');
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
    debounceRef.current = setTimeout(() => setDebouncedQuery(query), 250);
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

  // Apply filters from AI chat
  const applyFilters = (filters) => {
    if (filters.type) setType(filters.type);
    if (filters.instance) setInstance(filters.instance);
    if (filters.query) setQuery(filters.query);
  };

  // Sync handler
  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const data = await res.json();
      setSyncMsg(data.message || 'Sync started');
      // Refresh stats after delay
      setTimeout(() => {
        fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
        fetchAssets();
        setSyncMsg('');
      }, 5000);
    } catch (e) {
      setSyncMsg('Sync triggered');
    }
    setSyncing(false);
  };

  return (
    <div className="app">
      {/* Lightbox */}
      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="" />
          <div className="lightbox-close">✕</div>
        </div>
      )}

      {/* AI Chat Bot */}
      <ChatBot isOpen={chatOpen} onToggle={() => setChatOpen(!chatOpen)} onApplyFilters={applyFilters} />

      {/* Header */}
      <header className="header">
        <div className="header-left">
          <span className="logo">Share Ventures</span>
          <span className="divider">/</span>
          <span className="page-title">Asset Explorer</span>
        </div>
        <div className="header-right">
          {syncMsg && <span className="sync-msg">{syncMsg}</span>}
          <button className={`sync-btn ${syncing ? 'syncing' : ''}`} onClick={handleSync} disabled={syncing}>
            <span className="sync-icon">⟳</span>
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          {stats && (
            <span className="badge mono">
              {stats.total?.toLocaleString()} assets
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
            placeholder="Search by name, URL, domain, path, tag..."
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
          <div className="active-filters">
            {type !== 'all' && (
              <button className="clear-filter" onClick={() => setType('all')}>✕ {type}</button>
            )}
            {instance !== 'all' && (
              <button className="clear-filter" onClick={() => setInstance('all')}>
                ✕ {instances.find(i => i.key === instance)?.label}
              </button>
            )}
            {query && (
              <button className="clear-filter" onClick={() => setQuery('')}>✕ &quot;{query}&quot;</button>
            )}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
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
              <span>Type</span>
              <span>Instance</span>
              <span>Name</span>
              <span>URL / Domain</span>
            </div>
            {assets.map((a, i) => (
              <AssetRow key={`${a.instance}-${a.name}-${i}`} asset={a} onImageClick={setLightbox} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="page-btn">← Prev</button>
            {generatePageNumbers(page, totalPages).map((p, i) => (
              p === '...' ? (
                <span key={`dots-${i}`} className="page-dots">...</span>
              ) : (
                <button key={p} onClick={() => setPage(p)} className={`page-btn ${page === p ? 'active' : ''}`}>{p}</button>
              )
            ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="page-btn">Next →</button>
          </div>
        )}
      </main>

      <style>{styles}</style>
    </div>
  );
}

/* ============ AI CHAT BOT ============ */
function ChatBot({ isOpen, onToggle, onApplyFilters }) {
  const [messages, setMessages] = useState([
    { role: 'bot', text: 'Hey! I can help you find assets across all instances. Try asking:\n• "Show me all Vercel deployments with custom domains"\n• "Find images from Feno"\n• "How many dashboards are running?"\n• "Search for anything related to 1440"' }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const sendMessage = async () => {
    if (!input.trim() || thinking) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setThinking(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      
      setMessages(prev => [...prev, { 
        role: 'bot', 
        text: data.response || 'No results found.',
        filters: data.filters,
        results: data.results?.slice(0, 8),
        total: data.total,
        suggestions: data.suggestions,
      }]);

      // Only apply filters if the AI explicitly returns dashboard filters
      // and there are actual results
      if (data.filters && Object.keys(data.filters).length > 0 && data.total > 0) {
        onApplyFilters(data.filters);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Something went wrong. Try again.' }]);
    }
    setThinking(false);
  };

  return (
    <>
      {/* Floating Button */}
      <button className="chat-fab" onClick={onToggle}>
        {isOpen ? '✕' : '✦'}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel">
          <div className="chat-header">
            <span className="chat-title">✦ Asset AI</span>
            <span className="chat-subtitle">Ask anything about your assets</span>
          </div>
          
          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-msg-text">
                  {msg.text.split('\n').map((line, j) => <p key={j}>{line}</p>)}
                </div>
                {msg.results && msg.results.length > 0 && (
                  <div className="chat-results">
                    {msg.results.map((r, j) => (
                      <a key={j} href={r.url || '#'} target="_blank" rel="noopener noreferrer" className="chat-result-item">
                        <span className="chat-result-type">{r.asset_type}</span>
                        <span className="chat-result-name">{r.name}</span>
                        {r.metadata?.custom_domain && <span className="chat-result-domain">{r.metadata.custom_domain}</span>}
                      </a>
                    ))}
                    {msg.total > 5 && <div className="chat-more">+{msg.total - 5} more results shown in dashboard →</div>}
                  </div>
                )}
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="chat-suggestions">
                    {msg.suggestions.map((s, j) => (
                      <button key={j} className="chat-suggestion" onClick={() => { setInput(s); }}>{s}</button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {thinking && (
              <div className="chat-msg bot">
                <div className="chat-thinking">●●●</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <input
              ref={inputRef}
              type="text"
              placeholder="Ask about your assets..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              className="chat-input"
            />
            <button onClick={sendMessage} disabled={!input.trim() || thinking} className="chat-send">→</button>
          </div>
        </div>
      )}
    </>
  );
}

/* ============ HELPERS ============ */
function generatePageNumbers(current, total) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = [];
  pages.push(1);
  if (current > 3) pages.push('...');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('...');
  pages.push(total);
  return pages;
}

/* ============ ASSET CARD ============ */
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
    vercel: { bg: 'rgba(250,250,250,0.06)', text: '#FAFAFA' },
    dashboard: { bg: 'rgba(34,197,94,0.1)', text: '#22C55E' },
    image: { bg: 'rgba(167,139,250,0.1)', text: '#A78BFA' },
    project: { bg: 'rgba(245,158,11,0.1)', text: '#F59E0B' },
    design: { bg: 'rgba(236,72,153,0.1)', text: '#EC4899' },
  };
  const tc = typeColors[asset.asset_type] || typeColors.project;

  return (
    <div className="card" onClick={() => isImage && imageUrl && !imgError && onImageClick(imageUrl)}>
      {/* Preview */}
      {isImage && (
        <div className="card-preview">
          {imageUrl && !imgError ? (
            <>
              {!imgLoaded && <div className="card-preview-loading">⏳</div>}
              <img src={imageUrl} alt={asset.name} loading="lazy"
                onLoad={() => setImgLoaded(true)} onError={() => setImgError(true)}
                className={`card-img ${imgLoaded ? 'loaded' : ''}`} />
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
          {asset.metadata?.framework && <span className="framework-badge">{asset.metadata.framework}</span>}
        </div>
      )}
      {isDashboard && <div className="card-preview card-preview-dashboard"><span style={{ fontSize: 24 }}>◻</span></div>}
      {isDesign && <div className="card-preview card-preview-design"><span style={{ fontSize: 24 }}>◈</span></div>}

      {/* Body */}
      <div className="card-body">
        <div className="card-meta">
          <span className="type-badge" style={{ background: tc.bg, color: tc.text }}>{asset.asset_type}</span>
          <span className="instance-badge">{asset.instance}</span>
        </div>
        <div className="card-name">
          {asset.url ? <a href={asset.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>{asset.name}</a> : asset.name}
        </div>
        {customDomain && (
          <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer" className="custom-domain" onClick={e => e.stopPropagation()}>
            🌐 {customDomain}
          </a>
        )}
        {!customDomain && asset.path && (
          <div className="card-path">{asset.path.replace(/^\/home\/[^/]+\//, '~/')}</div>
        )}
      </div>
    </div>
  );
}

/* ============ ASSET ROW ============ */
function AssetRow({ asset }) {
  const customDomain = asset.metadata?.custom_domain;
  const typeColors = { vercel: '#FAFAFA', dashboard: '#22C55E', image: '#A78BFA', project: '#F59E0B', design: '#EC4899' };
  
  return (
    <div className="list-row">
      <span className="list-type" style={{ color: typeColors[asset.asset_type] || '#A1A1AA' }}>{asset.asset_type}</span>
      <span className="list-instance">{asset.instance}</span>
      <span className="list-name">
        {asset.url ? <a href={asset.url} target="_blank" rel="noopener noreferrer">{asset.name}</a> : asset.name}
      </span>
      <span className="list-url">
        {customDomain ? (
          <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer" className="domain-link">{customDomain}</a>
        ) : asset.url ? (
          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="url-link">↗</a>
        ) : (
          <span className="path-text">{asset.path?.replace(/^\/home\/[^/]+\//, '~/').slice(-40)}</span>
        )}
      </span>
    </div>
  );
}

/* ============ STYLES ============ */
const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .app { min-height: 100vh; background: #09090B; color: #FAFAFA; font-family: 'Inter', -apple-system, sans-serif; }

  /* Header */
  .header { border-bottom: 1px solid #27272A; padding: 16px 28px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; background: rgba(9,9,11,0.96); backdrop-filter: blur(8px); }
  .header-left { display: flex; align-items: center; gap: 10px; }
  .header-right { display: flex; align-items: center; gap: 12px; }
  .logo { font-size: 17px; font-weight: 600; letter-spacing: -0.03em; }
  .divider { color: #3F3F46; font-size: 16px; }
  .page-title { color: #A1A1AA; font-size: 13px; }
  .badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #A1A1AA; background: #27272A; padding: 4px 10px; border-radius: 8px; }
  .mono { font-family: 'JetBrains Mono', monospace; }

  /* Sync */
  .sync-btn { display: flex; align-items: center; gap: 5px; background: #18181B; border: 1px solid #3F3F46; border-radius: 8px; padding: 6px 12px; color: #A1A1AA; font-size: 12px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
  .sync-btn:hover { border-color: #71717A; color: #FAFAFA; }
  .sync-btn.syncing { opacity: 0.6; cursor: wait; }
  .sync-btn.syncing .sync-icon { animation: spin 1s linear infinite; }
  .sync-msg { font-size: 11px; color: #22C55E; font-family: 'JetBrains Mono', monospace; }

  /* Main */
  .main { max-width: 1440px; margin: 0 auto; padding: 24px 24px; }

  /* Stats */
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; margin-bottom: 24px; }
  .stat-card { background: #18181B; border: 1px solid #3F3F46; border-radius: 12px; padding: 12px 16px; text-align: left; cursor: pointer; transition: all 0.15s; font-family: inherit; color: inherit; }
  .stat-card:hover { border-color: #71717A; }
  .stat-card.active { border-color: #FAFAFA; background: #1a1a1f; }
  .stat-label { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #71717A; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
  .stat-value { font-size: 20px; font-weight: 600; letter-spacing: -0.03em; }

  /* Search */
  .search-container { position: relative; margin-bottom: 14px; }
  .search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: #71717A; }
  .search-input { width: 100%; background: #18181B; border: 1px solid #3F3F46; border-radius: 11px; padding: 12px 36px 12px 40px; color: #FAFAFA; font-size: 13px; outline: none; transition: border-color 0.2s; font-family: inherit; }
  .search-input:focus { border-color: #2563EB; }
  .search-input::placeholder { color: #52525B; }
  .search-clear { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: #27272A; border: none; color: #A1A1AA; width: 20px; height: 20px; border-radius: 5px; cursor: pointer; font-size: 10px; display: flex; align-items: center; justify-content: center; }

  /* Filters */
  .filter-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; flex-wrap: wrap; gap: 10px; }
  .filter-types { display: flex; gap: 5px; flex-wrap: wrap; }
  .filter-btn { background: #18181B; color: #A1A1AA; border: 1px solid #3F3F46; border-radius: 9px; padding: 6px 11px; font-size: 11px; font-weight: 500; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; gap: 4px; font-family: inherit; }
  .filter-btn:hover { border-color: #71717A; color: #FAFAFA; }
  .filter-btn.active { background: #FAFAFA; color: #09090B; border-color: #FAFAFA; }
  .filter-icon { font-size: 10px; }
  .filter-count { font-family: 'JetBrains Mono', monospace; font-size: 9px; opacity: 0.6; }
  .filter-actions { display: flex; gap: 6px; align-items: center; }
  .instance-select { background: #18181B; border: 1px solid #3F3F46; border-radius: 9px; padding: 6px 10px; color: #A1A1AA; font-size: 11px; cursor: pointer; font-family: inherit; }
  .instance-select option { background: #18181B; color: #FAFAFA; }
  .view-toggle { display: flex; border: 1px solid #3F3F46; border-radius: 9px; overflow: hidden; }
  .view-toggle button { background: #18181B; color: #71717A; border: none; padding: 6px 10px; cursor: pointer; font-size: 12px; }
  .view-toggle button.active { background: #27272A; color: #FAFAFA; }

  /* Results */
  .results-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; flex-wrap: wrap; }
  .results-count { font-size: 11px; color: #71717A; }
  .active-filters { display: flex; gap: 6px; flex-wrap: wrap; }
  .clear-filter { font-size: 10px; color: #A1A1AA; background: #27272A; border: 1px solid #3F3F46; border-radius: 6px; padding: 2px 7px; cursor: pointer; font-family: inherit; }

  /* Loading / Empty */
  .loading { display: flex; justify-content: center; padding: 80px; }
  .spinner { width: 24px; height: 24px; border: 2px solid #3F3F46; border-top-color: #FAFAFA; border-radius: 50%; animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .empty { text-align: center; padding: 80px 20px; color: #71717A; }
  .empty-icon { font-size: 36px; margin-bottom: 10px; opacity: 0.4; }
  .empty-title { font-size: 14px; font-weight: 500; }
  .empty-sub { font-size: 11px; margin-top: 3px; }

  /* Grid */
  .grid { display: grid; gap: 8px; }
  .grid-default { grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); }
  .grid-images { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }

  /* Card */
  .card { background: #18181B; border: 1px solid #3F3F46; border-radius: 12px; overflow: hidden; transition: border-color 0.2s, transform 0.1s; }
  .card:hover { border-color: #52525B; transform: translateY(-1px); }
  .card-preview { height: 130px; background: #111113; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; border-bottom: 1px solid #27272A; }
  .card-preview-vercel { background: #000; height: 48px; }
  .card-preview-dashboard { background: linear-gradient(135deg, #071a07 0%, #111 100%); height: 48px; }
  .card-preview-design { background: linear-gradient(135deg, #1a071a 0%, #111 100%); height: 48px; }
  .card-preview-loading { position: absolute; font-size: 12px; opacity: 0.3; }
  .card-img { width: 100%; height: 100%; object-fit: cover; opacity: 0; transition: opacity 0.3s; }
  .card-img.loaded { opacity: 1; }
  .card-preview-placeholder { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .placeholder-icon { font-size: 18px; opacity: 0.15; }
  .placeholder-name { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #52525B; max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .framework-badge { position: absolute; bottom: 6px; right: 6px; font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #A1A1AA; background: rgba(39,39,42,0.9); padding: 2px 5px; border-radius: 3px; }
  .card-body { padding: 10px 12px; }
  .card-meta { display: flex; align-items: center; gap: 6px; margin-bottom: 5px; }
  .type-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; padding: 1px 6px; border-radius: 4px; text-transform: uppercase; }
  .instance-badge { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #52525B; }
  .card-name { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 3px; }
  .card-name a { color: #FAFAFA; text-decoration: none; }
  .card-name a:hover { color: #2563EB; }
  .custom-domain { display: inline-block; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #22C55E; text-decoration: none; }
  .custom-domain:hover { text-decoration: underline; }
  .card-path { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #3F3F46; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* List */
  .list { border: 1px solid #3F3F46; border-radius: 12px; overflow: hidden; }
  .list-header { display: grid; grid-template-columns: 70px 90px 1fr 160px; padding: 8px 14px; background: #18181B; border-bottom: 1px solid #3F3F46; font-size: 10px; color: #52525B; font-weight: 500; text-transform: uppercase; letter-spacing: 0.05em; font-family: 'JetBrains Mono', monospace; }
  .list-row { display: grid; grid-template-columns: 70px 90px 1fr 160px; padding: 8px 14px; border-bottom: 1px solid #1a1a1f; align-items: center; transition: background 0.1s; }
  .list-row:hover { background: #18181B; }
  .list-row:last-child { border-bottom: none; }
  .list-type { font-family: 'JetBrains Mono', monospace; font-size: 9px; text-transform: uppercase; }
  .list-instance { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #52525B; }
  .list-name { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .list-name a { color: #FAFAFA; text-decoration: none; }
  .list-name a:hover { color: #2563EB; }
  .list-url { text-align: right; }
  .domain-link { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #22C55E; text-decoration: none; }
  .domain-link:hover { text-decoration: underline; }
  .url-link { color: #2563EB; text-decoration: none; font-size: 13px; }
  .path-text { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #3F3F46; }

  /* Pagination */
  .pagination { display: flex; justify-content: center; gap: 5px; margin-top: 28px; align-items: center; flex-wrap: wrap; }
  .page-btn { background: #18181B; border: 1px solid #3F3F46; border-radius: 7px; padding: 6px 10px; min-width: 32px; color: #A1A1AA; font-size: 11px; cursor: pointer; font-family: inherit; transition: all 0.15s; }
  .page-btn:hover:not(:disabled) { border-color: #71717A; color: #FAFAFA; }
  .page-btn.active { background: #FAFAFA; color: #09090B; border-color: #FAFAFA; font-weight: 600; }
  .page-btn:disabled { color: #3F3F46; cursor: default; }
  .page-dots { color: #52525B; font-size: 11px; }

  /* Lightbox */
  .lightbox { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,0.95); display: flex; align-items: center; justify-content: center; cursor: zoom-out; padding: 20px; }
  .lightbox img { max-width: 92vw; max-height: 92vh; border-radius: 8px; object-fit: contain; }
  .lightbox-close { position: absolute; top: 16px; right: 20px; color: #FAFAFA; font-size: 18px; opacity: 0.6; }

  /* Chat Bot */
  .chat-fab { position: fixed; bottom: 24px; right: 24px; width: 52px; height: 52px; border-radius: 50%; background: #FAFAFA; color: #09090B; border: none; font-size: 20px; cursor: pointer; z-index: 1000; box-shadow: 0 4px 20px rgba(0,0,0,0.4); transition: transform 0.2s, background 0.2s; display: flex; align-items: center; justify-content: center; }
  .chat-fab:hover { transform: scale(1.08); background: #E4E4E7; }

  .chat-panel { position: fixed; bottom: 88px; right: 24px; width: 380px; max-height: 520px; background: #18181B; border: 1px solid #3F3F46; border-radius: 16px; z-index: 1000; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 8px 40px rgba(0,0,0,0.5); }
  .chat-header { padding: 14px 16px; border-bottom: 1px solid #27272A; }
  .chat-title { font-size: 14px; font-weight: 600; display: block; }
  .chat-subtitle { font-size: 11px; color: #71717A; }

  .chat-messages { flex: 1; overflow-y: auto; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; max-height: 340px; }
  .chat-msg { max-width: 92%; }
  .chat-msg.user { align-self: flex-end; }
  .chat-msg.bot { align-self: flex-start; }
  .chat-msg-text { padding: 8px 12px; border-radius: 10px; font-size: 12px; line-height: 1.5; }
  .chat-msg.user .chat-msg-text { background: #2563EB; color: #FFF; }
  .chat-msg.bot .chat-msg-text { background: #27272A; color: #E4E4E7; }
  .chat-msg-text p { margin-bottom: 4px; }
  .chat-msg-text p:last-child { margin-bottom: 0; }
  .chat-thinking { padding: 8px 12px; background: #27272A; border-radius: 10px; font-size: 12px; color: #71717A; animation: pulse 1s infinite; }
  @keyframes pulse { 50% { opacity: 0.5; } }

  .chat-results { margin-top: 6px; display: flex; flex-direction: column; gap: 3px; }
  .chat-result-item { display: flex; gap: 6px; align-items: center; padding: 4px 8px; background: #1a1a1f; border-radius: 6px; text-decoration: none; font-size: 11px; }
  .chat-result-item:hover { background: #27272A; }
  .chat-result-type { font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #71717A; text-transform: uppercase; min-width: 50px; }
  .chat-result-name { color: #FAFAFA; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .chat-result-domain { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #22C55E; }
  .chat-more { font-size: 10px; color: #71717A; padding: 4px 8px; }

  .chat-suggestions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
  .chat-suggestion { font-size: 10px; background: #27272A; border: 1px solid #3F3F46; color: #A1A1AA; border-radius: 6px; padding: 3px 8px; cursor: pointer; font-family: inherit; }
  .chat-suggestion:hover { border-color: #71717A; color: #FAFAFA; }

  .chat-input-area { display: flex; gap: 8px; padding: 12px 14px; border-top: 1px solid #27272A; }
  .chat-input { flex: 1; background: #27272A; border: 1px solid #3F3F46; border-radius: 8px; padding: 8px 12px; color: #FAFAFA; font-size: 12px; outline: none; font-family: inherit; }
  .chat-input:focus { border-color: #2563EB; }
  .chat-input::placeholder { color: #52525B; }
  .chat-send { background: #FAFAFA; color: #09090B; border: none; border-radius: 8px; width: 34px; cursor: pointer; font-size: 14px; font-weight: 600; transition: opacity 0.15s; }
  .chat-send:disabled { opacity: 0.3; cursor: default; }

  /* Links */
  a { color: #2563EB; text-decoration: none; }
  a:hover { text-decoration: underline; }
  ::selection { background: #2563EB; color: #FAFAFA; }

  /* Responsive */
  @media (max-width: 768px) {
    .header { padding: 12px 16px; }
    .main { padding: 16px 14px; }
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
    .filter-bar { flex-direction: column; align-items: stretch; }
    .filter-types { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
    .filter-actions { justify-content: space-between; }
    .grid-default { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
    .grid-images { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
    .list-header, .list-row { grid-template-columns: 55px 70px 1fr 100px; }
    .chat-panel { width: calc(100vw - 32px); right: 16px; bottom: 80px; }
  }
  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 6px; }
    .grid-default { grid-template-columns: 1fr; }
    .grid-images { grid-template-columns: repeat(2, 1fr); }
    .logo { font-size: 15px; }
    .header-right .badge { display: none; }
  }
`;
