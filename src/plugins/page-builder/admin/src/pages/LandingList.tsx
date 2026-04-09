import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetchClient } from '@strapi/admin/strapi-admin';

interface LandingPage {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  is_published: boolean;
  blocks: any[];
  updatedAt: string;
}

const C = {
  blue:      '#4361EE',
  blueLight: 'rgba(67,97,238,0.10)',
  dark:      '#1a1a2e',
  danger:    '#EF4444',
  success:   '#22C55E',
  border:    '#E8E8EE',
  text:      '#1A1A2E',
  muted:     '#9CA3AF',
  bg:        '#F4F5F7',
  surface:   '#FFFFFF',
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const Ico = ({ d, size = 14 }: { d: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  edit:    <Ico d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7 M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />,
  eye:     <Ico d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />,
  copy:    <Ico d="M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />,
  trash:   <Ico d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  plus:    <Ico d="M12 5v14 M5 12h14" size={16} />,
  pages:   <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" size={18} />,
};

function IconBtn({ icon, onClick, title, color = C.muted, hoverColor = C.blue, danger = false }: {
  icon: React.ReactNode; onClick: () => void; title: string;
  color?: string; hoverColor?: string; danger?: boolean;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: 'none', background: hover ? (danger ? 'rgba(239,68,68,.1)' : C.blueLight) : 'transparent',
        cursor: 'pointer', color: hover ? (danger ? C.danger : C.blue) : color,
        width: 30, height: 30, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all .12s',
      }}
    >
      {icon}
    </button>
  );
}

export function LandingList() {
  const navigate = useNavigate();
  const { get, del, post } = useFetchClient();
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const CM = 'content-manager/collection-types/api::landing-page.landing-page';

  const loadPages = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await get(`/${CM}?sort=createdAt:desc&pageSize=100`);
      // CM API returns { results: [...], pagination: {...} }
      setPages(res?.data?.results || res?.results || res?.data?.data || res?.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => { loadPages(); }, [loadPages]);

  const deletePage = async (page: LandingPage) => {
    if (!window.confirm(`Delete "${page.title}"? This cannot be undone.`)) return;
    setDeletingId(page.documentId);
    try {
      await del(`/${CM}/${page.documentId}`);
      setPages(prev => prev.filter(p => p.documentId !== page.documentId));
    } catch (e) {
      alert('Failed to delete page.');
    } finally {
      setDeletingId(null);
    }
  };

  const duplicatePage = async (page: LandingPage) => {
    try {
      await post(`/${CM}`, {
        title: `${page.title} (Copy)`, blocks: page.blocks, is_published: false
      });
      loadPages();
    } catch (e) {
      alert('Failed to duplicate page.');
    }
  };

  const getBlockCount = (page: LandingPage) => Array.isArray(page.blocks) ? page.blocks.length : 0;

  return (
    <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: C.blueLight, border: `1.5px solid ${C.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue, flexShrink: 0 }}>
            {Icons.pages}
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: C.dark, margin: 0, letterSpacing: '-.3px' }}>Landing Pages</h1>
            <p style={{ color: C.muted, fontSize: 12, margin: '3px 0 0' }}>Build & manage drag-drop pages. Published pages appear in the website navbar.</p>
          </div>
        </div>
        <button
          onClick={() => navigate('new')}
          style={{
            padding: '10px 20px', background: C.blue, color: '#fff', border: 'none',
            borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            boxShadow: '0 2px 8px rgba(67,97,238,.35)', fontFamily: 'inherit',
          }}
        >
          {Icons.plus} New Page
        </button>
      </div>

      {/* Stats bar */}
      {!loading && pages.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total', value: pages.length, color: C.blue, bg: C.blueLight },
            { label: 'Published', value: pages.filter(p => p.is_published).length, color: '#059669', bg: '#dcfce7' },
            { label: 'Drafts', value: pages.filter(p => !p.is_published).length, color: '#D97706', bg: '#FEF3C7' },
          ].map(stat => (
            <div key={stat.label} style={{ padding: '10px 18px', background: stat.bg, border: `1px solid ${stat.color}30`, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20, fontWeight: 800, color: stat.color }}>{stat.value}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: stat.color, textTransform: 'uppercase', letterSpacing: '.4px' }}>{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>
          <div style={{ width: 36, height: 36, border: `3px solid ${C.border}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'pb-spin 1s linear infinite', margin: '0 auto 14px' }} />
          <style>{`@keyframes pb-spin{to{transform:rotate(360deg)}}`}</style>
          Loading pages…
        </div>
      ) : pages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 24px', background: C.surface, borderRadius: 12, border: `2px dashed ${C.border}` }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: C.blueLight, border: `2px dashed ${C.blue}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.blue, margin: '0 auto 16px' }}>
            {Icons.pages}
          </div>
          <p style={{ fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 6 }}>No landing pages yet</p>
          <p style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Create your first drag-drop landing page to get started.</p>
          <button
            onClick={() => navigate('new')}
            style={{ padding: '10px 24px', background: C.blue, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}
          >
            Create Your First Page
          </button>
        </div>
      ) : (
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,.06)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#FAFAFA' }}>
                {['Title', 'URL Slug', 'Blocks', 'Status', 'Last Updated', ''].map((h, i) => (
                  <th key={i} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', color: C.muted, letterSpacing: '.5px', borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pages.map((page, idx) => (
                <tr
                  key={page.documentId}
                  style={{ borderBottom: idx < pages.length - 1 ? `1px solid ${C.border}` : 'none', transition: 'background .12s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FAFBFF')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Title */}
                  <td style={{ padding: '14px 16px' }}>
                    <div
                      style={{ fontWeight: 700, color: C.dark, cursor: 'pointer', fontSize: 13 }}
                      onClick={() => navigate(page.documentId)}
                    >
                      {page.title}
                    </div>
                  </td>

                  {/* Slug */}
                  <td style={{ padding: '14px 16px' }}>
                    {page.slug
                      ? <span style={{ fontFamily: 'monospace', fontSize: 11, background: C.blueLight, color: C.blue, padding: '3px 8px', borderRadius: 4, border: `1px solid rgba(67,97,238,.2)` }}>/landing/{page.slug}</span>
                      : <span style={{ color: C.muted, fontSize: 11 }}>—</span>
                    }
                  </td>

                  {/* Block count */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: getBlockCount(page) > 0 ? C.blueLight : '#F3F4F6', color: getBlockCount(page) > 0 ? C.blue : C.muted, fontWeight: 700, fontSize: 12, border: `1px solid ${getBlockCount(page) > 0 ? 'rgba(67,97,238,.2)' : C.border}` }}>
                      {getBlockCount(page)}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                      background: page.is_published ? '#dcfce7' : '#F3F4F6',
                      color: page.is_published ? '#059669' : '#6B7280',
                      border: `1px solid ${page.is_published ? '#bbf7d0' : C.border}`,
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: page.is_published ? '#059669' : '#D1D5DB', display: 'inline-block' }} />
                      {page.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>

                  {/* Date */}
                  <td style={{ padding: '14px 16px', color: C.muted, fontSize: 12 }}>
                    {new Date(page.updatedAt).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                      <IconBtn icon={Icons.edit}  title="Edit page"    onClick={() => navigate(page.documentId)} />
                      {page.slug && (
                        <IconBtn icon={Icons.eye} title="Preview page"  onClick={() => window.open(`http://localhost:4200/landing/${page.slug}`, '_blank')} />
                      )}
                      <IconBtn icon={Icons.copy}  title="Duplicate"    onClick={() => duplicatePage(page)} />
                      <IconBtn icon={Icons.trash} title="Delete page"  onClick={() => deletePage(page)} danger />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
