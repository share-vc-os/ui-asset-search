'use client';

import { useState, useEffect, useCallback } from 'react';

export default function Home() {
  const [assets, setAssets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [instanceFilter, setInstanceFilter] = useState('all');
  const [view, setView] = useState('grid');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/assets').then(r => r.json()),
      fetch('/api/stats').then(r => r.json())
    ]).then(([assetsData, statsData]) => {
      setAssets(assetsData);
      setFiltered(assetsData);
      setStats(statsData);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filterAssets = useCallback(() => {
    let result = assets;
    if (typeFilter !== 'all') {
      result = result.filter(a => a.asset_type === typeFilter);
    }
    if (instanceFilter !== 'all') {
      result = result.filter(a => a.instance === instanceFilter);
    }
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(a => {
        const haystack = [a.name, a.description, a.project_name, a.url, a.path, ...(a.tags || [])].filter(Boolean).join(' ').toLowerCase();
        return haystack.includes(q);
      });
    }
    setFiltered(result);
  }, [assets, query, typeFilter, instanceFilter]);

  useEffect(() => { filterAssets(); }, [filterAssets]);

  const instances = ['all', 'sharehealth', 'feno', 'shareland', 'instill', 'shareos', 'shareos_meetings', 'hamet_clawos', 'trevor_clawos', 'dexter_clawos'];
  const types = ['all', 'dashboard', 'image', 'project', 'design', 'link'];
  const typeIcons = { dashboard: '🖥️', image: '📸', project: '📁', design: '🎨', link: '🔗', s3_upload: '☁️' };

  return (
    <div style={{ background: '#09090B', color: '#FAFAFA', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ padding: '32px 48px', borderBottom: '1px solid #3F3F46', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
            UI Assets <span style={{ color: '#71717A', fontWeight: 400 }}>/ search</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
          <span><span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', display: 'inline-block', marginRight: '6px' }}></span>Index active</span>
          <span>{stats ? `${stats.total} assets` : '—'}</span>
        </div>
      </header>

      {/* Search */}
      <section style={{ padding: '40px 48px', borderBottom: '1px solid #3F3F46' }}>
        <div style={{ display: 'flex', gap: '12px', maxWidth: '800px' }}>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search assets, dashboards, projects, URLs..."
            style={{ flex: 1, background: '#18181B', border: '1px solid #3F3F46', borderRadius: '12px', padding: '14px 20px', color: '#FAFAFA', fontSize: '15px', outline: 'none', fontFamily: "'Inter', sans-serif" }}
          />
        </div>

        {/* Type filters */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ background: typeFilter === t ? 'rgba(37,99,235,0.1)' : '#27272A', border: `1px solid ${typeFilter === t ? '#2563EB' : '#3F3F46'}`, borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: typeFilter === t ? '#FAFAFA' : '#A1A1AA', cursor: 'pointer' }}>
              {t === 'all' ? 'All' : `${typeIcons[t] || ''} ${t}`}
            </button>
          ))}
        </div>

        {/* Instance filters */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
          {instances.map(i => (
            <button key={i} onClick={() => setInstanceFilter(i)}
              style={{ background: instanceFilter === i ? 'rgba(37,99,235,0.1)' : '#27272A', border: `1px solid ${instanceFilter === i ? '#2563EB' : '#3F3F46'}`, borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: instanceFilter === i ? '#FAFAFA' : '#A1A1AA', cursor: 'pointer' }}>
              {i === 'all' ? 'All Instances' : i.replace('_', ' ')}
            </button>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <div style={{ padding: '16px 48px', display: 'flex', gap: '32px', borderBottom: '1px solid #3F3F46', fontSize: '12px', color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
          {Object.entries(stats.by_type || {}).map(([t, c]) => (
            <span key={t}><strong style={{ color: '#FAFAFA' }}>{c}</strong> {t}s</span>
          ))}
        </div>
      )}

      {/* Content */}
      <main style={{ padding: '40px 48px' }}>
        {/* View toggle + count */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <span style={{ fontSize: '13px', color: '#71717A' }}>{filtered.length} results</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setView('grid')} style={{ background: 'none', border: `1px solid ${view === 'grid' ? '#2563EB' : '#3F3F46'}`, borderRadius: '8px', padding: '8px 12px', color: view === 'grid' ? '#FAFAFA' : '#71717A', cursor: 'pointer', fontSize: '14px' }}>⊞</button>
            <button onClick={() => setView('list')} style={{ background: 'none', border: `1px solid ${view === 'list' ? '#2563EB' : '#3F3F46'}`, borderRadius: '8px', padding: '8px 12px', color: view === 'list' ? '#FAFAFA' : '#71717A', cursor: 'pointer', fontSize: '14px' }}>☰</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#71717A' }}>Loading assets...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#71717A' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#A1A1AA' }}>No assets found</h3>
            <p>Try a different search or filter.</p>
          </div>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {filtered.slice(0, 100).map((asset, idx) => (
              <div key={idx} style={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: '16px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#71717A', background: '#27272A', padding: '4px 10px', borderRadius: '6px', textTransform: 'uppercase' }}>{asset.asset_type}</span>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#71717A' }}>{asset.instance}</span>
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '6px', wordBreak: 'break-word' }}>{asset.name}</div>
                <div style={{ fontSize: '13px', color: '#A1A1AA', marginBottom: '12px' }}>{asset.description}</div>
                {asset.url && <a href={asset.url} target="_blank" rel="noopener" style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#2563EB', wordBreak: 'break-all', textDecoration: 'none' }}>{asset.url}</a>}
                {!asset.url && asset.path && <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#71717A', wordBreak: 'break-all' }}>{asset.path}</span>}
                {asset.tags && asset.tags.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', marginTop: '12px', flexWrap: 'wrap' }}>
                    {asset.tags.map((tag, ti) => (
                      <span key={ti} style={{ fontFamily: "'JetBrains Mono'", fontSize: '10px', color: '#71717A', background: '#27272A', padding: '3px 8px', borderRadius: '4px' }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {filtered.slice(0, 200).map((asset, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '100px 160px 1fr 200px', gap: '16px', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #27272A', fontSize: '13px' }}>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#71717A' }}>{asset.asset_type}</span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#A1A1AA' }}>{asset.instance}</span>
                <span style={{ fontWeight: 500 }}>{asset.name}</span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#2563EB', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.url || asset.path?.split('/').slice(-2).join('/') || '—'}</span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
