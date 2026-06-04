'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

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
  const hasCustomDomain = (asset) => asset.metadata?.custom_domain;

  return (
    <div style={{ minHeight: '100vh', background: '#09090B', color: '#FAFAFA', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-out', padding: 24 }}>
          <img src={lightbox} style={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 12, objectFit: 'contain' }} alt="" />
        </div>
      )}

      {/* Header */}
      <header style={{ borderBottom: '1px solid #27272A', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.03em' }}>Share Ventures</span>
          <span style={{ color: '#71717A', fontSize: 14 }}>/ Asset Explorer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {stats && (
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#A1A1AA', background: '#27272A', padding: '4px 10px', borderRadius: 8 }}>
              {stats.total?.toLocaleString()} assets indexed
            </span>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        {/* Stats Row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 32 }}>
            {Object.entries(stats.by_type || {}).map(([k, v]) => (
              <div key={k} style={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 16, padding: '16px 20px' }}>
                <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#71717A', textTransform: 'uppercase', marginBottom: 4 }}>{k}</div>
                <div style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.03em' }}>{v.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Search assets by name, path, or URL..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ width: '100%', background: '#18181B', border: '1px solid #3F3F46', borderRadius: 12, padding: '14px 16px 14px 44px', color: '#FAFAFA', fontSize: 14, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = '#2563EB'}
              onBlur={(e) => e.target.style.borderColor = '#3F3F46'}
            />
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#71717A', fontSize: 16 }}>⌕</span>
          </div>

          {/* Type Filters */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            {types.map(t => (
              <button
                key={t.key}
                onClick={() => setType(t.key)}
                style={{
                  background: type === t.key ? '#FAFAFA' : '#18181B',
                  color: type === t.key ? '#09090B' : '#A1A1AA',
                  border: `1px solid ${type === t.key ? '#FAFAFA' : '#3F3F46'}`,
                  borderRadius: 10,
                  padding: '8px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span style={{ fontSize: 12 }}>{t.icon}</span> {t.label}
                {stats?.by_type?.[t.key] && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, opacity: 0.7 }}>({stats.by_type[t.key]})</span>}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
              {/* Instance Filter */}
              <select
                value={instance}
                onChange={(e) => setInstance(e.target.value)}
                style={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 10, padding: '8px 12px', color: '#A1A1AA', fontSize: 13, cursor: 'pointer' }}
              >
                {instances.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
              </select>

              {/* View Mode */}
              <div style={{ display: 'flex', border: '1px solid #3F3F46', borderRadius: 10, overflow: 'hidden' }}>
                <button onClick={() => setViewMode('grid')} style={{ background: viewMode === 'grid' ? '#27272A' : '#18181B', color: viewMode === 'grid' ? '#FAFAFA' : '#71717A', border: 'none', padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>⊞</button>
                <button onClick={() => setViewMode('list')} style={{ background: viewMode === 'list' ? '#27272A' : '#18181B', color: viewMode === 'list' ? '#FAFAFA' : '#71717A', border: 'none', padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}>≡</button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Count + Pagination Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 13, color: '#71717A' }}>
            {loading ? 'Loading...' : `${total.toLocaleString()} results`}
            {total > limit && ` • Page ${page} of ${totalPages}`}
          </span>
        </div>

        {/* Asset Grid/List */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
            <div style={{ width: 32, height: 32, border: '2px solid #3F3F46', borderTopColor: '#FAFAFA', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          </div>
        ) : assets.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: '#71717A' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>∅</div>
            <div style={{ fontSize: 16 }}>No assets found</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters or search query</div>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: type === 'image' ? 'repeat(auto-fill, minmax(180px, 1fr))' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {assets.map((a, i) => (
              <AssetCard key={i} asset={a} onImageClick={setLightbox} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {assets.map((a, i) => (
              <AssetRow key={i} asset={a} onImageClick={setLightbox} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32, alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 10, padding: '8px 14px', color: page === 1 ? '#3F3F46' : '#FAFAFA', cursor: page === 1 ? 'default' : 'pointer', fontSize: 13 }}
            >← Prev</button>
            
            {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
              let p;
              if (totalPages <= 7) p = i + 1;
              else if (page <= 4) p = i + 1;
              else if (page >= totalPages - 3) p = totalPages - 6 + i;
              else p = page - 3 + i;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  style={{ background: page === p ? '#FAFAFA' : '#18181B', color: page === p ? '#09090B' : '#A1A1AA', border: `1px solid ${page === p ? '#FAFAFA' : '#3F3F46'}`, borderRadius: 10, padding: '8px 12px', minWidth: 36, cursor: 'pointer', fontSize: 13, fontWeight: page === p ? 600 : 400 }}
                >{p}</button>
              );
            })}
            
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              style={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 10, padding: '8px 14px', color: page === totalPages ? '#3F3F46' : '#FAFAFA', cursor: page === totalPages ? 'default' : 'pointer', fontSize: 13 }}
            >Next →</button>
          </div>
        )}
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        select option { background: #18181B; color: #FAFAFA; }
        ::selection { background: #2563EB; color: #FAFAFA; }
        a { color: #2563EB; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}

const IMAGE_PROXY = 'https://uiassetimages.loclx.io';

function AssetCard({ asset, onImageClick }) {
  const isImage = asset.asset_type === 'image';
  const isVercel = asset.asset_type === 'vercel';
  const isDesign = asset.asset_type === 'design';
  const customDomain = asset.metadata?.custom_domain;
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  
  // Build image URL from proxy
  const imageUrl = isImage && asset.path && asset.instance
    ? `${IMAGE_PROXY}/image?instance=${encodeURIComponent(asset.instance)}&path=${encodeURIComponent(asset.path)}`
    : asset.thumbnail_url;
  
  return (
    <div style={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s', cursor: isImage ? 'pointer' : 'default' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = '#71717A'}
      onMouseLeave={e => e.currentTarget.style.borderColor = '#3F3F46'}
    >
      {/* Image preview area */}
      {isImage && (
        <div style={{ height: 160, background: '#27272A', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}
          onClick={() => imageUrl && !imgError && onImageClick(imageUrl)}
        >
          {imageUrl && !imgError ? (
            <>
              {!imgLoaded && <span style={{ position: 'absolute', color: '#3F3F46', fontSize: 11, fontFamily: "'JetBrains Mono', monospace" }}>Loading...</span>}
              <img 
                src={imageUrl} 
                alt={asset.name} 
                loading="lazy"
                onLoad={() => setImgLoaded(true)}
                onError={() => setImgError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: imgLoaded ? 1 : 0, transition: 'opacity 0.3s' }} 
              />
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 20, opacity: 0.3 }}>◫</span>
              <span style={{ color: '#71717A', fontSize: 10, fontFamily: "'JetBrains Mono', monospace", textAlign: 'center', padding: '0 8px', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{asset.name}</span>
            </div>
          )}
        </div>
      )}

      {/* Vercel preview */}
      {isVercel && (
        <div style={{ height: 48, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #27272A' }}>
          <span style={{ fontSize: 24 }}>▲</span>
        </div>
      )}

      <div style={{ padding: '14px 16px' }}>
        {/* Type badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#A1A1AA', background: '#27272A', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase' }}>
            {asset.asset_type}
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#71717A' }}>{asset.instance}</span>
        </div>

        {/* Name */}
        <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {asset.url ? (
            <a href={asset.url} target="_blank" rel="noopener noreferrer" style={{ color: '#FAFAFA' }}>{asset.name}</a>
          ) : asset.name}
        </div>

        {/* Custom domain badge */}
        {customDomain && (
          <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#22C55E', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: 6, marginBottom: 6 }}>
            {customDomain}
          </a>
        )}

        {/* Path/URL */}
        {asset.path && (
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#71717A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {asset.path.replace(/^\/home\/[^/]+\//, '~/')}
          </div>
        )}

        {/* Framework tag */}
        {asset.metadata?.framework && (
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#A1A1AA', background: '#27272A', padding: '2px 6px', borderRadius: 4, marginTop: 6, display: 'inline-block' }}>
            {asset.metadata.framework}
          </span>
        )}
      </div>
    </div>
  );
}

function AssetRow({ asset, onImageClick }) {
  const customDomain = asset.metadata?.custom_domain;
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderRadius: 10, transition: 'background 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = '#18181B'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#A1A1AA', background: '#27272A', padding: '2px 8px', borderRadius: 6, textTransform: 'uppercase', minWidth: 70, textAlign: 'center' }}>
        {asset.asset_type}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#71717A', minWidth: 100 }}>{asset.instance}</span>
      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {asset.url ? (
          <a href={asset.url} target="_blank" rel="noopener noreferrer" style={{ color: '#FAFAFA' }}>{asset.name}</a>
        ) : asset.name}
      </span>
      {customDomain && (
        <a href={`https://${customDomain}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#22C55E' }}>
          {customDomain}
        </a>
      )}
      {asset.url && !customDomain && (
        <a href={asset.url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: '#2563EB' }}>
          ↗
        </a>
      )}
    </div>
  );
}
