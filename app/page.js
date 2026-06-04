'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export default function Home() {
  const [assets, setAssets] = useState([]);
  const [stats, setStats] = useState(null);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [instanceFilter, setInstanceFilter] = useState('all');
  const [view, setView] = useState('grid');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  // Fetch stats once
  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  // Fetch assets with server-side filtering
  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (query) params.set('q', query);
    if (typeFilter !== 'all') params.set('type', typeFilter);
    if (instanceFilter !== 'all') params.set('instance', instanceFilter);
    params.set('limit', '500');

    try {
      const res = await fetch(`/api/assets?${params.toString()}`);
      const data = await res.json();
      setAssets(Array.isArray(data) ? data : []);
    } catch (e) {
      setAssets([]);
    }
    setLoading(false);
  }, [query, typeFilter, instanceFilter]);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  // Debounced search
  const handleSearchInput = (value) => {
    setQuery(value);
  };

  const instances = ['all', 'sharehealth', 'feno', 'shareland', 'instill', 'shareos', 'shareos_meetings', 'hamet_clawos', 'trevor_clawos', 'dexter_clawos'];
  const types = ['all', 'dashboard', 'image', 'project', 'design', 'link'];
  const typeIcons = { dashboard: '🖥️', image: '📸', project: '📁', design: '🎨', link: '🔗', s3_upload: '☁️' };
  const instanceLabels = { all: 'All Instances', sharehealth: 'ShareHealth', feno: 'Feno', shareland: 'Shareland', instill: 'Instill', shareos: 'ShareOS', shareos_meetings: 'Meetings', hamet_clawos: 'Hamet', trevor_clawos: 'Trevor', dexter_clawos: 'Dexter' };

  return (
    <div style={{ background: '#09090B', color: '#FAFAFA', minHeight: '100vh', fontFamily: "'Inter', sans-serif", fontSize: '14px' }}>
      {/* Header */}
      <header style={{ padding: '28px 48px', borderBottom: '1px solid #3F3F46', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.03em', margin: 0 }}>
            UI Assets <span style={{ color: '#71717A', fontWeight: 400 }}>/ search</span>
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }}></span>
            Index active
          </span>
          <span>{stats ? `${stats.total.toLocaleString()} assets` : '—'}</span>
        </div>
      </header>

      {/* Search + Filters */}
      <section style={{ padding: '32px 48px', borderBottom: '1px solid #3F3F46' }}>
        <div style={{ maxWidth: '700px' }}>
          <input
            type="text"
            value={query}
            onChange={e => handleSearchInput(e.target.value)}
            placeholder="Search assets, dashboards, projects, URLs..."
            style={{ width: '100%', background: '#18181B', border: '1px solid #3F3F46', borderRadius: '12px', padding: '14px 20px', color: '#FAFAFA', fontSize: '15px', outline: 'none', fontFamily: "'Inter', sans-serif", transition: 'border-color 0.2s' }}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = '#3F3F46'}
          />
        </div>

        {/* Type filters */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
          {types.map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              style={{ background: typeFilter === t ? 'rgba(37,99,235,0.12)' : '#27272A', border: `1px solid ${typeFilter === t ? '#2563EB' : '#3F3F46'}`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: typeFilter === t ? '#FAFAFA' : '#A1A1AA', cursor: 'pointer', transition: 'all 0.15s' }}>
              {t === 'all' ? 'All' : `${typeIcons[t] || ''} ${t}`}
            </button>
          ))}
        </div>

        {/* Instance filters */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
          {instances.map(i => (
            <button key={i} onClick={() => setInstanceFilter(i)}
              style={{ background: instanceFilter === i ? 'rgba(37,99,235,0.12)' : '#27272A', border: `1px solid ${instanceFilter === i ? '#2563EB' : '#3F3F46'}`, borderRadius: '8px', padding: '7px 14px', fontSize: '12px', fontFamily: "'JetBrains Mono', monospace", color: instanceFilter === i ? '#FAFAFA' : '#A1A1AA', cursor: 'pointer', transition: 'all 0.15s' }}>
              {instanceLabels[i] || i}
            </button>
          ))}
        </div>
      </section>

      {/* Stats bar */}
      {stats && (
        <div style={{ padding: '14px 48px', display: 'flex', gap: '28px', borderBottom: '1px solid #27272A', fontSize: '12px', color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
          {Object.entries(stats.by_type || {}).map(([t, c]) => (
            <span key={t}><strong style={{ color: '#FAFAFA', fontWeight: 600 }}>{c.toLocaleString()}</strong> {t}s</span>
          ))}
        </div>
      )}

      {/* Content */}
      <main style={{ padding: '32px 48px' }}>
        {/* Count + View toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', color: '#71717A', fontFamily: "'JetBrains Mono', monospace" }}>
            {loading ? 'Loading...' : `${assets.length} results`}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setView('grid')} style={{ background: 'none', border: `1px solid ${view === 'grid' ? '#2563EB' : '#3F3F46'}`, borderRadius: '8px', padding: '8px 12px', color: view === 'grid' ? '#FAFAFA' : '#71717A', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' }}>⊞</button>
            <button onClick={() => setView('list')} style={{ background: 'none', border: `1px solid ${view === 'list' ? '#2563EB' : '#3F3F46'}`, borderRadius: '8px', padding: '8px 12px', color: view === 'list' ? '#FAFAFA' : '#71717A', cursor: 'pointer', fontSize: '14px', transition: 'all 0.15s' }}>☰</button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#71717A' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid #3F3F46', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }}></div>
            <p>Loading assets...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px', color: '#71717A' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#A1A1AA', fontWeight: 500 }}>No assets found</h3>
            <p style={{ fontSize: '14px' }}>Try a different search or filter.</p>
          </div>
        ) : view === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {assets.slice(0, 200).map((asset, idx) => (
              <AssetCard key={idx} asset={asset} />
            ))}
          </div>
        ) : (
          <div>
            {/* List header */}
            <div style={{ display: 'grid', gridTemplateColumns: '90px 140px 1fr 220px', gap: '16px', padding: '10px 16px', fontSize: '11px', color: '#71717A', fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', borderBottom: '1px solid #27272A' }}>
              <span>Type</span>
              <span>Instance</span>
              <span>Name</span>
              <span style={{ textAlign: 'right' }}>Path / URL</span>
            </div>
            {assets.slice(0, 300).map((asset, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '90px 140px 1fr 220px', gap: '16px', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #1a1a1e', fontSize: '13px', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#18181B'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#71717A' }}>{typeIcons[asset.asset_type] || '📄'} {asset.asset_type}</span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#A1A1AA' }}>{instanceLabels[asset.instance] || asset.instance}</span>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</span>
                <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: asset.url ? '#2563EB' : '#71717A', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {asset.url ? <a href={asset.url} target="_blank" rel="noopener" style={{ color: '#2563EB', textDecoration: 'none' }}>{asset.url}</a> : (asset.path?.split('/').slice(-3).join('/') || '—')}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AssetCard({ asset }) {
  const typeIcons = { dashboard: '🖥️', image: '📸', project: '📁', design: '🎨', link: '🔗', s3_upload: '☁️' };
  const instanceLabels = { sharehealth: 'ShareHealth', feno: 'Feno', shareland: 'Shareland', instill: 'Instill', shareos: 'ShareOS', shareos_meetings: 'Meetings', hamet_clawos: 'Hamet', trevor_clawos: 'Trevor', dexter_clawos: 'Dexter' };

  const [hovered, setHovered] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div
      style={{ background: '#18181B', border: `1px solid ${hovered ? '#52525B' : '#3F3F46'}`, borderRadius: '16px', padding: '22px', transition: 'border-color 0.2s', position: 'relative' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '10px', fontWeight: 500, color: '#71717A', background: '#27272A', padding: '3px 8px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {typeIcons[asset.asset_type] || '📄'} {asset.asset_type}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '10px', color: '#52525B' }}>
          {instanceLabels[asset.instance] || asset.instance}
        </span>
      </div>

      <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '6px', wordBreak: 'break-word', lineHeight: '1.4', letterSpacing: '-0.01em' }}>{asset.name}</div>

      <div style={{ fontSize: '12px', color: '#A1A1AA', marginBottom: '12px', lineHeight: '1.5' }}>{asset.description}</div>

      {asset.url && (
        <a href={asset.url} target="_blank" rel="noopener" style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#2563EB', wordBreak: 'break-all', textDecoration: 'none', display: 'block', marginBottom: '4px' }}>
          {asset.url}
        </a>
      )}
      {!asset.url && asset.path && (
        <span style={{ fontFamily: "'JetBrains Mono'", fontSize: '11px', color: '#52525B', wordBreak: 'break-all', display: 'block', marginBottom: '4px' }}>
          {asset.path.split('/').slice(-3).join('/')}
        </span>
      )}

      {/* Copy button */}
      {(asset.url || asset.path) && hovered && (
        <button
          onClick={() => copyToClipboard(asset.url || asset.path)}
          style={{ position: 'absolute', top: '16px', right: '16px', background: '#27272A', border: '1px solid #3F3F46', borderRadius: '6px', padding: '4px 8px', color: '#A1A1AA', cursor: 'pointer', fontSize: '11px', fontFamily: "'JetBrains Mono'", transition: 'all 0.15s' }}
        >
          📋
        </button>
      )}

      {asset.tags && asset.tags.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', marginTop: '10px', flexWrap: 'wrap' }}>
          {asset.tags.slice(0, 4).map((tag, ti) => (
            <span key={ti} style={{ fontFamily: "'JetBrains Mono'", fontSize: '10px', color: '#52525B', background: '#27272A', padding: '2px 7px', borderRadius: '4px' }}>{tag}</span>
          ))}
        </div>
      )}
    </div>
  );
}
