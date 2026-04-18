import React, { useState, useCallback, useRef } from 'react';
import { useFetchClient } from '@strapi/strapi/admin';

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid = () => 'blk_' + Math.random().toString(36).slice(2, 9);
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

// Angular frontend URL — Strapi runs on :1337, Angular on :4200 in dev.
// In production both are typically on the same domain (different paths or subdomains).
const FRONTEND_URL: string = (() => {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  if (origin.includes(':1337')) return origin.replace(':1337', ':4200');
  // Production: Strapi and Angular are on the same domain
  return origin;
})();

const previewUrl = (slug: string) => `${FRONTEND_URL}/landing/${slug}`;

// ─── Types ────────────────────────────────────────────────────────────────────
type BlockType =
  | 'hero'
  | 'form'
  | 'text'
  | 'image'
  | 'stats'
  | 'cta'
  | 'property-listings'
  | 'testimonials'
  | 'agent-cards'
  | 'video-embed'
  | 'hero-form-card'
  | 'features-list'
  | 'amenities'
  | 'about-split'
  | 'luxury-flyer'
  | 'split-panel-flyer';

interface Block { id: string; type: BlockType; props: Record<string, any>; }
interface Page { id?: number; documentId?: string; title: string; slug: string; blocks: Block[]; is_published: boolean; }

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: '#f4f6f8', canvas: '#eef0f3', card: '#ffffff', border: '#e2e6ea',
  borderFocus: '#4945ff', text: '#212134', textMuted: '#666687', textLight: '#a5a5ba',
  accent: '#4945ff', accentHover: '#3d3dba', danger: '#d02b20', dangerLight: '#fcecea',
  gold: '#C9A96E', goldDark: '#1a1a2e',
  success: '#328048', successBg: '#eafbe7',
  shadow: '0 1px 4px rgba(33,33,52,0.1)', shadowMd: '0 4px 16px rgba(33,33,52,0.12)',
};

// ─── Default Block Props ──────────────────────────────────────────────────────
const DEFAULTS: Record<BlockType, Record<string, any>> = {
  hero: {
    heading: 'Exclusive Waterfront Residences',
    subheading: 'Starting from 730,000 QAR — Limited Units Available',
    backgroundImage: '',
    overlayColor: 'rgba(15,15,26,0.72)',
    ctaText: 'Book a Viewing',
    ctaScrollTo: 'form',
  },
  form: {},
  text: {
    heading: 'About This Property',
    body: 'Describe your property here. Add key features, location highlights, and unique selling points.',
    align: 'left',
    textColor: '#ffffff',
    bgColor: '#0f0f1a',
  },
  image: { src: '', alt: 'Property image', caption: '', borderRadius: '8px' },
  stats: {
    heading: 'Why Choose Us?',
    items: [
      { label: 'Properties Sold', value: '500+' },
      { label: 'Happy Clients', value: '1,200+' },
      { label: 'Years in Qatar', value: '10+' },
      { label: 'Expert Agents', value: '50+' },
    ],
    bgColor: '#1a1a2e', accentColor: '#C9A96E',
  },
  cta: {
    heading: "Don't Miss Out",
    subheading: 'Only a few units remaining. Book your slot today.',
    buttonText: 'BOOK NOW',
    buttonScrollTo: 'form',
    bgColor: '#C9A96E', textColor: '#1a1a2e',
  },
  'property-listings': {
    heading: 'Featured Properties',
    subheading: 'Handpicked listings for you',
    bgColor: '#0f0f1a', accentColor: '#C9A96E',
    properties: [
      { title: 'Pearl Tower A', price: '730,000 QAR', location: 'Lusail, Qatar', badge: 'New Launch', image: '' },
      { title: 'Marina Heights', price: '1,200,000 QAR', location: 'The Pearl, Qatar', badge: 'Hot Deal', image: '' },
      { title: 'West Bay Plaza', price: '2,500,000 QAR', location: 'West Bay, Qatar', badge: '', image: '' },
    ],
  },
  testimonials: {
    heading: 'What Our Clients Say',
    bgColor: '#1a1a2e', accentColor: '#C9A96E',
    items: [
      { name: 'Ahmed Al-Rashid', role: 'Property Buyer', text: 'Excellent service, found my dream home in Qatar!', rating: 5 },
      { name: 'Sarah Johnson', role: 'Investor', text: 'Professional team with deep market knowledge.', rating: 5 },
      { name: 'Khalid Mansoor', role: 'First-time Buyer', text: 'Seamless experience from start to finish.', rating: 5 },
    ],
  },
  'agent-cards': {
    heading: 'Meet Our Agents',
    subheading: 'Expert property consultants at your service',
    bgColor: '#0f0f1a', accentColor: '#C9A96E',
    agents: [
      { name: 'Mohammed Al-Ali', title: 'Senior Consultant', phone: '+974 3000 0001', speciality: 'Luxury Residential', image: '' },
      { name: 'James Wilson', title: 'Investment Specialist', phone: '+974 3000 0002', speciality: 'Commercial', image: '' },
    ],
  },
  'video-embed': {
    url: '',
    heading: 'Property Tour',
    caption: 'Watch our exclusive property walkthrough',
    bgColor: '#0f0f1a',
  },
  'hero-form-card': {
    heading: 'Prime Real Estate\nOpportunity',
    subtext: 'Your gateway to extraordinary properties in the most sought-after locations.',
    backgroundImage: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1400&q=80',
    overlayColor: 'rgba(0,0,0,0.55)',
    formLabel: 'Start to live in Your',
    formTitle: 'New Apartment',
    formDesc: 'Find your dream home with our carefully curated selection of premium properties.',
    submitLabel: 'Subscribe Now',
    accentColor: '#C9A84C',
  },
  'features-list': {
    heading: 'What is so great in our apartments?',
    bgColor: '#ffffff',
    accentColor: '#C9A84C',
    features: [
      'Premium finishes throughout',
      'Floor-to-ceiling windows',
      'Gourmet kitchen appliances',
      'Smart home technology',
      'Private underground parking',
      'Rooftop terrace access',
    ],
    slides: [
      { src: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&q=80', title: 'Modern Living Spaces', sub: 'Open plan kitchen and lounge area' },
      { src: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=800&q=80', title: 'Premium Finishes', sub: 'Contemporary design throughout' },
      { src: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&q=80', title: 'Elegant Master Suites', sub: 'Floor-to-ceiling windows throughout' },
    ],
  },
  'amenities': {
    bgColor: '#f8f6f2',
    accentColor: '#C9A84C',
    items: [
      { icon: 'location', title: 'Perfect Location', desc: "Prime spots in the city's most desirable neighbourhoods, close to everything that matters." },
      { icon: 'golf',     title: 'Golf Course',      desc: 'Exclusive access to championship golf courses right at your doorstep.' },
      { icon: 'valet',    title: 'Private Valet',    desc: 'Round-the-clock valet parking service for residents and their guests.' },
      { icon: 'clock',    title: '24/h Infoline',    desc: 'Our dedicated team is available around the clock to assist with any request.' },
    ],
  },
  'about-split': {
    heading: 'Why Choose Us',
    description: 'We are committed to providing an unparalleled real estate experience. Our expert team guides you through every step of the process, ensuring you find the perfect property that meets your unique needs and lifestyle.',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80',
    imagePosition: 'left',
    bgColor: '#222222',
    textColor: '#cccccc',
    accentColor: '#C9A84C',
  },
  'luxury-flyer': {
    heroImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=72&auto=format&fit=crop',
    titleLine1: 'REAL',
    titleLine2: 'ESTATE',
    titleLine3: 'HOUSE',
    pillText: 'FOR SALE',
    tagline: "Real homes. Real people. Homes you'll love, service you can trust.",
    features: ['Transparent Process', 'Fast & Efficient Transactions'],
    galleryImages: [
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=400&q=65&auto=format',
      'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=400&q=65&auto=format',
    ],
    specs: [
      { icon: 'bed',     label: '5 Bedrooms'  },
      { icon: 'bath',    label: '5 Bathrooms' },
      { icon: 'kitchen', label: 'Kitchen'     },
      { icon: 'garage',  label: 'Garage'      },
    ],
    ctaText: 'Book Now!',
    phone: '+123-456-7890',
    website: 'www.reallygreatsite.com',
    address: '123 Anywhere St., Any City, ST 12345',
  },
  'split-panel-flyer': {
    heroImage: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=900&q=72&auto=format&fit=crop',
    tag: 'Dream',
    titleLine1: 'House',
    titleLine2: 'For Sale',
    price: '$1,500,000',
    contact: ['+123-456-7890', 'hello@reallygreatsite.com', '@reallygreatsite', '123 Anywhere St., Any City, ST 12345'],
    ctaText: 'Book Now',
    galleryImages: [
      'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&q=65&auto=format',
      'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=600&q=65&auto=format',
    ],
  },
};

// ─── Block Library Definition ─────────────────────────────────────────────────
const BLOCK_LIBRARY: Array<{ type: BlockType; icon: string; label: string; desc: string }> = [
  { type: 'hero',              icon: '🏳️', label: 'Hero / Banner',       desc: 'Full-width banner with title & CTA' },
  { type: 'text',              icon: '☰',  label: 'Text Block',          desc: 'Rich text content area' },
  { type: 'image',             icon: '⬜', label: 'Image',               desc: 'Image with optional caption' },
  { type: 'form',              icon: '📄', label: 'Contact Form',        desc: 'Lead capture form' },
  { type: 'property-listings', icon: '🏠', label: 'Property Listings',   desc: 'Featured properties grid' },
  { type: 'testimonials',      icon: '💬', label: 'Testimonials',        desc: 'Client testimonials' },
  { type: 'cta',               icon: '⚡', label: 'Call To Action',      desc: 'Bold CTA section' },
  { type: 'stats',             icon: '📊', label: 'Stats / Numbers',     desc: 'Key achievement counters' },
  { type: 'agent-cards',       icon: '👤', label: 'Agent Cards',         desc: 'Agent showcase' },
  { type: 'video-embed',       icon: '▶️', label: 'Video Embed',         desc: 'YouTube / Vimeo embed' },
  { type: 'hero-form-card',   icon: '🏗', label: 'Hero + Form Card',    desc: 'Two-column hero with embedded form' },
  { type: 'features-list',    icon: '✅', label: 'Features List',       desc: 'Feature bullets with image slider' },
  { type: 'amenities',        icon: '⭐', label: 'Amenities Grid',      desc: 'Icon amenities (location, golf, valet…)' },
  { type: 'about-split',      icon: '◧',  label: 'About Split',         desc: 'Half image + half content panel' },
  { type: 'luxury-flyer',    icon: '🖤', label: 'Luxury Flyer Card',   desc: 'Dark flyer card with specs pill + gallery' },
  { type: 'split-panel-flyer', icon: '🥇', label: 'Split Panel Card',  desc: 'Gold/dark split card with gallery strip' },
];

// ─── Templates ────────────────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'book-viewing', label: 'Book a Viewing', icon: '🏠',
    desc: 'Hero banner + enquiry form',
    blocks: [{ type: 'hero' as BlockType, props: clone(DEFAULTS.hero) }, { type: 'form' as BlockType, props: {} }],
  },
  {
    id: 'form-only', label: 'Form Only', icon: '📋',
    desc: 'Clean page with just the form',
    blocks: [{ type: 'form' as BlockType, props: {} }],
  },
  {
    id: 'full-campaign', label: 'Full Campaign', icon: '🚀',
    desc: 'Hero · Stats · Listings · Form · CTA',
    blocks: [
      { type: 'hero' as BlockType, props: clone(DEFAULTS.hero) },
      { type: 'stats' as BlockType, props: clone(DEFAULTS.stats) },
      { type: 'property-listings' as BlockType, props: clone(DEFAULTS['property-listings']) },
      { type: 'testimonials' as BlockType, props: clone(DEFAULTS.testimonials) },
      { type: 'form' as BlockType, props: {} },
      { type: 'cta' as BlockType, props: clone(DEFAULTS.cta) },
    ],
  },
  {
    id: 'new-apartment', label: 'New Apartment', icon: '🏢',
    desc: 'Hero form card · Features · Amenities · About',
    blocks: [
      { type: 'hero-form-card' as BlockType, props: clone(DEFAULTS['hero-form-card']) },
      { type: 'features-list'  as BlockType, props: clone(DEFAULTS['features-list'])  },
      { type: 'amenities'      as BlockType, props: clone(DEFAULTS['amenities'])      },
      { type: 'about-split'    as BlockType, props: clone(DEFAULTS['about-split'])    },
    ],
  },
  {
    id: 'luxury-flyer-tpl', label: 'Dark Luxury Flyer', icon: '🖤',
    desc: 'Centered dark card with specs, gallery & booking modal',
    blocks: [{ type: 'luxury-flyer' as BlockType, props: clone(DEFAULTS['luxury-flyer']) }],
  },
  {
    id: 'split-panel-tpl', label: 'Split Panel Card', icon: '🥇',
    desc: 'Gold/dark split card with price, contacts & gallery strip',
    blocks: [{ type: 'split-panel-flyer' as BlockType, props: clone(DEFAULTS['split-panel-flyer']) }],
  },
  {
    id: 'blank', label: 'Blank', icon: '✨',
    desc: 'Start from scratch',
    blocks: [],
  },
];

// ─── Shared field components ──────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: 13, color: C.text,
  background: '#fff', border: `1px solid ${C.border}`, borderRadius: 6,
  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: C.textMuted,
  textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 5,
};
const fieldRow: React.CSSProperties = { marginBottom: 14 };
const sectionTitle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: C.textMuted, textTransform: 'uppercase',
  letterSpacing: '0.7px', margin: '18px 0 10px', paddingBottom: 6,
  borderBottom: `1px solid ${C.border}`,
};

function FInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div style={fieldRow}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
function FTextarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div style={fieldRow}>
      <label style={labelStyle}>{label}</label>
      <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={rows} value={value || ''} onChange={e => onChange(e.target.value)} />
    </div>
  );
}
function FColor({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={fieldRow}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input type="color" value={value || '#ffffff'} onChange={e => onChange(e.target.value)}
          style={{ width: 34, height: 34, border: `1px solid ${C.border}`, borderRadius: 6, padding: 2, cursor: 'pointer', background: 'white' }} />
        <input style={{ ...inputStyle, flex: 1 }} value={value || ''} onChange={e => onChange(e.target.value)} />
      </div>
    </div>
  );
}
function FSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={fieldRow}>
      <label style={labelStyle}>{label}</label>
      <select style={{ ...inputStyle, cursor: 'pointer' }} value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Block Canvas Previews ────────────────────────────────────────────────────
function HeroPreview({ p }: { p: any }) {
  return (
    <div style={{ background: p.overlayColor || '#1a1a2e', padding: '40px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden', minHeight: 160 }}>
      {p.backgroundImage && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${p.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }} />}
      <div style={{ position: 'relative' }}>
        <h1 style={{ margin: '0 0 8px', color: C.gold, fontSize: 20, fontWeight: 800 }}>{p.heading || 'Hero Heading'}</h1>
        <p style={{ margin: '0 0 16px', color: '#ddd', fontSize: 13 }}>{p.subheading}</p>
        <span style={{ display: 'inline-block', background: C.gold, color: C.goldDark, borderRadius: 5, padding: '8px 20px', fontWeight: 700, fontSize: 12 }}>{p.ctaText || 'Book a Viewing'}</span>
      </div>
    </div>
  );
}
function FormPreview() {
  return (
    <div style={{ background: C.goldDark }}>
      <div style={{ background: C.gold, padding: '12px 16px' }}>
        <strong style={{ color: C.goldDark, fontSize: 14 }}>Book a Viewing</strong>
        <p style={{ margin: '2px 0 0', color: C.goldDark, fontSize: 11, opacity: 0.75 }}>Fixed 8-field enquiry form</p>
      </div>
      <div style={{ padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {['First Name', 'Last Name'].map(f => (
          <div key={f} style={{ background: '#0f172a', border: '1px solid #2a2a4a', borderRadius: 4, padding: '5px 8px', color: '#555', fontSize: 11 }}>{f}</div>
        ))}
        {['Email', 'Phone', 'Preferred Date / Time', 'Budget'].map(f => (
          <div key={f} style={{ background: '#0f172a', border: '1px solid #2a2a4a', borderRadius: 4, padding: '5px 8px', color: '#555', fontSize: 11, gridColumn: '1/-1' }}>{f}</div>
        ))}
        <div style={{ gridColumn: '1/-1', background: C.gold, borderRadius: 4, padding: '7px', textAlign: 'center', color: C.goldDark, fontWeight: 700, fontSize: 11, marginTop: 4 }}>CONFIRM BOOKING</div>
      </div>
      <div style={{ padding: '6px 16px 10px', textAlign: 'center' }}>
        <span style={{ fontSize: 10, color: '#666', background: '#0d1117', border: `1px solid ${C.gold}44`, borderRadius: 3, padding: '2px 8px' }}>🔒 Fixed — not editable from canvas</span>
      </div>
    </div>
  );
}
function TextPreview({ p }: { p: any }) {
  return (
    <div style={{ background: p.bgColor || '#0f0f1a', padding: '28px 20px', textAlign: (p.align as any) || 'left' }}>
      {p.heading && <h3 style={{ margin: '0 0 8px', color: C.gold, fontSize: 15 }}>{p.heading}</h3>}
      <p style={{ margin: 0, color: p.textColor || '#ddd', fontSize: 12, lineHeight: 1.6 }}>{p.body}</p>
    </div>
  );
}
function ImagePreview({ p }: { p: any }) {
  return (
    <div style={{ background: '#111', padding: 16, textAlign: 'center' }}>
      {p.src
        ? <img src={p.src} alt={p.alt} style={{ maxWidth: '100%', borderRadius: p.borderRadius || 8, display: 'block', margin: '0 auto' }} />
        : <div style={{ background: '#1c1c2e', border: '2px dashed #333', borderRadius: 8, padding: '32px 20px', color: '#555', fontSize: 12 }}>🖼️ Set an image URL in settings</div>
      }
      {p.caption && <p style={{ margin: '8px 0 0', color: '#888', fontSize: 11 }}>{p.caption}</p>}
    </div>
  );
}
function StatsPreview({ p }: { p: any }) {
  return (
    <div style={{ background: p.bgColor || '#1a1a2e', padding: '24px 16px' }}>
      {p.heading && <h3 style={{ textAlign: 'center', margin: '0 0 16px', color: p.accentColor || C.gold, fontSize: 14 }}>{p.heading}</h3>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(p.items?.length || 4, 4)}, 1fr)`, gap: 8 }}>
        {(p.items || []).map((item: any, i: number) => (
          <div key={i} style={{ background: '#0f0f1a', borderRadius: 6, padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: p.accentColor || C.gold }}>{item.value}</div>
            <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function CtaPreview({ p }: { p: any }) {
  return (
    <div style={{ background: p.bgColor || C.gold, padding: '28px 20px', textAlign: 'center' }}>
      <h3 style={{ margin: '0 0 6px', color: p.textColor || C.goldDark, fontSize: 16, fontWeight: 800 }}>{p.heading}</h3>
      <p style={{ margin: '0 0 14px', color: p.textColor || C.goldDark, opacity: 0.8, fontSize: 12 }}>{p.subheading}</p>
      <span style={{ display: 'inline-block', background: p.textColor || C.goldDark, color: p.bgColor || C.gold, borderRadius: 5, padding: '8px 20px', fontWeight: 700, fontSize: 12 }}>{p.buttonText}</span>
    </div>
  );
}
function PropertyListingsPreview({ p }: { p: any }) {
  return (
    <div style={{ background: p.bgColor || '#0f0f1a', padding: '24px 16px' }}>
      {p.heading && <h3 style={{ margin: '0 0 4px', color: p.accentColor || C.gold, fontSize: 14, textAlign: 'center' }}>{p.heading}</h3>}
      {p.subheading && <p style={{ margin: '0 0 14px', color: '#888', fontSize: 11, textAlign: 'center' }}>{p.subheading}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {(p.properties || []).slice(0, 3).map((prop: any, i: number) => (
          <div key={i} style={{ background: '#1a1a2e', borderRadius: 6, overflow: 'hidden' }}>
            <div style={{ background: '#111', height: 60, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {prop.image
                ? <img src={prop.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                : <span style={{ color: '#333', fontSize: 18 }}>🏠</span>
              }
              {prop.badge && <span style={{ position: 'absolute', top: 4, left: 4, background: p.accentColor || C.gold, color: C.goldDark, fontSize: 8, padding: '1px 5px', borderRadius: 3, fontWeight: 700 }}>{prop.badge}</span>}
            </div>
            <div style={{ padding: '6px 8px' }}>
              <div style={{ color: '#ddd', fontSize: 10, fontWeight: 600, marginBottom: 2 }}>{prop.title}</div>
              <div style={{ color: p.accentColor || C.gold, fontSize: 10, fontWeight: 700 }}>{prop.price}</div>
              <div style={{ color: '#666', fontSize: 9, marginTop: 1 }}>📍 {prop.location}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function TestimonialsPreview({ p }: { p: any }) {
  return (
    <div style={{ background: p.bgColor || '#1a1a2e', padding: '24px 16px' }}>
      {p.heading && <h3 style={{ textAlign: 'center', margin: '0 0 14px', color: p.accentColor || C.gold, fontSize: 14 }}>{p.heading}</h3>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {(p.items || []).slice(0, 3).map((item: any, i: number) => (
          <div key={i} style={{ background: '#0f0f1a', borderRadius: 6, padding: '10px' }}>
            <div style={{ color: p.accentColor || C.gold, fontSize: 11, marginBottom: 6 }}>{'★'.repeat(item.rating || 5)}</div>
            <p style={{ color: '#ccc', fontSize: 10, margin: '0 0 8px', lineHeight: 1.5, fontStyle: 'italic' }}>"{item.text}"</p>
            <div style={{ color: '#ddd', fontSize: 10, fontWeight: 700 }}>{item.name}</div>
            <div style={{ color: '#666', fontSize: 9 }}>{item.role}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function AgentCardsPreview({ p }: { p: any }) {
  return (
    <div style={{ background: p.bgColor || '#0f0f1a', padding: '24px 16px' }}>
      {p.heading && <h3 style={{ textAlign: 'center', margin: '0 0 4px', color: p.accentColor || C.gold, fontSize: 14 }}>{p.heading}</h3>}
      {p.subheading && <p style={{ textAlign: 'center', margin: '0 0 14px', color: '#888', fontSize: 11 }}>{p.subheading}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(p.agents?.length || 2, 3)}, 1fr)`, gap: 10 }}>
        {(p.agents || []).slice(0, 3).map((agent: any, i: number) => (
          <div key={i} style={{ background: '#1a1a2e', borderRadius: 8, padding: '12px 10px', textAlign: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#111', border: `2px solid ${p.accentColor || C.gold}`, margin: '0 auto 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {agent.image ? <img src={agent.image} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : <span style={{ fontSize: 18 }}>👤</span>}
            </div>
            <div style={{ color: '#ddd', fontSize: 11, fontWeight: 700 }}>{agent.name}</div>
            <div style={{ color: p.accentColor || C.gold, fontSize: 10 }}>{agent.title}</div>
            <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>{agent.speciality}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
function VideoEmbedPreview({ p }: { p: any }) {
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
    const vm = url.match(/vimeo\.com\/(\d+)/);
    if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
    return url;
  };
  const embed = getEmbedUrl(p.url);
  return (
    <div style={{ background: p.bgColor || '#0f0f1a', padding: '24px 16px' }}>
      {p.heading && <h3 style={{ textAlign: 'center', margin: '0 0 12px', color: C.gold, fontSize: 14 }}>{p.heading}</h3>}
      <div style={{ background: '#111', borderRadius: 8, overflow: 'hidden', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {embed
          ? <iframe src={embed} style={{ width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={p.heading} />
          : <div style={{ textAlign: 'center', color: '#555' }}><div style={{ fontSize: 28, marginBottom: 6 }}>▶</div><div style={{ fontSize: 11 }}>Paste a YouTube or Vimeo URL in settings</div></div>
        }
      </div>
      {p.caption && <p style={{ textAlign: 'center', margin: '8px 0 0', color: '#888', fontSize: 11 }}>{p.caption}</p>}
    </div>
  );
}

// ─── New Template Preview Components ─────────────────────────────────────────

function HeroFormCardPreview({ p }: { p: any }) {
  const accent = p.accentColor || '#C9A84C';
  return (
    <div style={{ position: 'relative', background: p.overlayColor || 'rgba(0,0,0,0.55)', minHeight: 180, overflow: 'hidden' }}>
      {p.backgroundImage && <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${p.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.35 }} />}
      <div style={{ position: 'relative', display: 'flex', gap: 16, padding: '24px 20px', flexWrap: 'wrap' }}>
        {/* Left */}
        <div style={{ flex: 1, minWidth: 160 }}>
          <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 300, margin: '0 0 8px', lineHeight: 1.2, whiteSpace: 'pre-line', fontFamily: 'Georgia,serif' }}>{p.heading}</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: 0, lineHeight: 1.5 }}>{p.subtext}</p>
        </div>
        {/* Right — form card */}
        <div style={{ width: 200, background: '#222', borderRadius: 2, padding: '14px 14px 10px', flexShrink: 0 }}>
          <span style={{ fontSize: 9, color: '#aaa', letterSpacing: '0.05em', display: 'block', marginBottom: 2 }}>{p.formLabel}</span>
          <h4 style={{ color: '#fff', fontSize: 14, fontWeight: 400, margin: '0 0 6px', fontFamily: 'Georgia,serif' }}>{p.formTitle}</h4>
          <p style={{ fontSize: 9, color: '#aaa', margin: '0 0 10px', lineHeight: 1.4 }}>{p.formDesc}</p>
          {['Name', 'Email', 'Phone', 'Budget'].map(f => (
            <div key={f} style={{ borderBottom: '1px solid rgba(255,255,255,0.18)', marginBottom: 6, paddingBottom: 3 }}>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{f}…</span>
            </div>
          ))}
          <div style={{ background: accent, textAlign: 'center', padding: '5px', borderRadius: 1, marginTop: 8 }}>
            <span style={{ color: '#fff', fontSize: 9, fontWeight: 700, letterSpacing: '0.06em' }}>{p.submitLabel || 'SUBSCRIBE NOW'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeaturesListPreview({ p }: { p: any }) {
  const accent = p.accentColor || '#C9A84C';
  const slide = (p.slides || [])[0] || {};
  return (
    <div style={{ background: p.bgColor || '#fff', padding: '20px 16px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ flex: 1, minWidth: 160 }}>
        <h3 style={{ color: '#222', fontSize: 13, fontWeight: 400, margin: '0 0 12px', fontFamily: 'Georgia,serif' }}>{p.heading}</h3>
        {(p.features || []).slice(0, 5).map((f: string, i: number) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid #f0f0f0', fontSize: 11, color: '#555' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 6, color: accent }}>✓</span>
            </div>
            {f}
          </div>
        ))}
      </div>
      <div style={{ width: 180, flexShrink: 0 }}>
        <div style={{ borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
          {slide.src
            ? <img src={slide.src} alt="" style={{ width: '100%', height: 110, objectFit: 'cover', display: 'block' }} />
            : <div style={{ width: '100%', height: 110, background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 11 }}>No image</div>
          }
          <div style={{ background: 'rgba(0,0,0,0.7)', padding: '6px 8px' }}>
            <p style={{ color: '#fff', fontSize: 9, margin: 0 }}>{slide.title}</p>
            <span style={{ color: '#aaa', fontSize: 8 }}>{slide.sub}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  location: <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32 }}><path d="M24 4C16.27 4 10 10.27 10 18c0 10.5 14 26 14 26s14-15.5 14-26c0-7.73-6.27-14-14-14z"/><circle cx="24" cy="18" r="4"/></svg>,
  golf:     <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32 }}><line x1="24" y1="6" x2="24" y2="36"/><path d="M24 6L36 14L24 22"/><ellipse cx="24" cy="40" rx="12" ry="4"/></svg>,
  valet:    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32 }}><circle cx="24" cy="14" r="7"/><path d="M10 44c0-7.73 6.27-14 14-14s14 6.27 14 14"/></svg>,
  clock:    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32 }}><circle cx="24" cy="24" r="18"/><polyline points="24,12 24,24 32,28"/></svg>,
  pool:     <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32 }}><path d="M6 32c4 0 6-3 10-3s6 3 10 3 6-3 10-3"/><path d="M6 40c4 0 6-3 10-3s6 3 10 3 6-3 10-3"/><rect x="16" y="8" width="16" height="18" rx="2"/></svg>,
  gym:      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 32, height: 32 }}><rect x="4" y="20" width="8" height="8" rx="2"/><rect x="36" y="20" width="8" height="8" rx="2"/><line x1="12" y1="24" x2="36" y2="24"/><rect x="16" y="16" width="4" height="16" rx="1"/><rect x="28" y="16" width="4" height="16" rx="1"/></svg>,
};

function AmenitiesPreview({ p }: { p: any }) {
  const accent = p.accentColor || '#C9A84C';
  return (
    <div style={{ background: p.bgColor || '#f8f6f2', padding: '20px 12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {(p.items || []).slice(0, 4).map((item: any, i: number) => (
          <div key={i} style={{ textAlign: 'center', padding: '10px 6px' }}>
            <div style={{ color: accent, display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
              {AMENITY_ICONS[item.icon] || <span style={{ fontSize: 20 }}>⭐</span>}
            </div>
            <h5 style={{ fontSize: 10, fontWeight: 700, color: accent, margin: '0 0 4px', letterSpacing: '0.03em' }}>{item.title}</h5>
            <p style={{ fontSize: 9, color: '#777', lineHeight: 1.5, margin: 0 }}>{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AboutSplitPreview({ p }: { p: any }) {
  const accent = p.accentColor || '#C9A84C';
  const imgLeft = p.imagePosition !== 'right';
  const imgEl = (
    <div style={{ flex: 1, minWidth: 120, overflow: 'hidden' }}>
      {p.image
        ? <img src={p.image} alt="" style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', height: 130, background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>🖼️</div>
      }
    </div>
  );
  const contentEl = (
    <div style={{ flex: 1, minWidth: 120, background: p.bgColor || '#222', padding: '20px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <h3 style={{ color: '#fff', fontSize: 14, fontWeight: 400, margin: '0 0 8px', fontFamily: 'Georgia,serif' }}>{p.heading}</h3>
      <div style={{ width: 30, height: 2, background: accent, marginBottom: 10 }} />
      <p style={{ color: p.textColor || '#ccc', fontSize: 10, lineHeight: 1.6, margin: 0 }}>{p.description}</p>
    </div>
  );
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' }}>
      {imgLeft ? <>{imgEl}{contentEl}</> : <>{contentEl}{imgEl}</>}
    </div>
  );
}

// ─── Spec SVG icons for luxury flyer ─────────────────────────────────────────
const SPEC_ICONS: Record<string, React.ReactNode> = {
  bed:     <svg viewBox="0 0 64 64" style={{ width: 28, height: 28 }}><rect x="6" y="28" width="52" height="20" rx="3" fill="#111"/><rect x="6" y="20" width="52" height="10" rx="2" fill="#111"/><rect x="12" y="13" width="15" height="9" rx="2" fill="#111"/><rect x="37" y="13" width="15" height="9" rx="2" fill="#111"/><rect x="6" y="46" width="5" height="8" rx="1" fill="#111"/><rect x="53" y="46" width="5" height="8" rx="1" fill="#111"/></svg>,
  bath:    <svg viewBox="0 0 64 64" style={{ width: 28, height: 28 }}><path d="M10 32h44v6a8 8 0 01-8 8H18a8 8 0 01-8-8z" fill="#111"/><rect x="10" y="44" width="4" height="8" rx="1" fill="#111"/><rect x="50" y="44" width="4" height="8" rx="1" fill="#111"/><path d="M16 32V18a6 6 0 016-6 6 6 0 016 6v2" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/><rect x="22" y="26" width="8" height="4" rx="1" fill="#111"/></svg>,
  kitchen: <svg viewBox="0 0 64 64" style={{ width: 28, height: 28 }}><rect x="8" y="10" width="48" height="44" rx="3" fill="#111"/><rect x="12" y="14" width="18" height="22" rx="2" fill="#f5f0e8"/><rect x="34" y="14" width="18" height="10" rx="2" fill="#f5f0e8"/><rect x="34" y="28" width="18" height="8" rx="2" fill="#f5f0e8"/><rect x="8" y="40" width="48" height="14" rx="2" fill="#333"/><circle cx="32" cy="47" r="2" fill="#fff"/></svg>,
  garage:  <svg viewBox="0 0 64 64" style={{ width: 28, height: 28 }}><path d="M6 28L32 10l26 18v26H6z" fill="#111"/><rect x="14" y="34" width="36" height="20" rx="2" fill="#f5f0e8"/><line x1="14" y1="40" x2="50" y2="40" stroke="#111" strokeWidth="2"/><line x1="14" y1="46" x2="50" y2="46" stroke="#111" strokeWidth="2"/></svg>,
};

function LuxuryFlyerPreview({ p }: { p: any }) {
  const gold = '#C9A44A';
  return (
    <div style={{ background: '#0d0d0d', padding: 16, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#111', borderRadius: 6, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.7)' }}>
        {/* Hero */}
        <div style={{ position: 'relative', paddingTop: '50%', background: '#222', overflow: 'hidden' }}>
          {p.heroImage && <img src={p.heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.72)' }} />}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%', background: 'linear-gradient(transparent,#111)', pointerEvents: 'none' }} />
        </div>
        {/* Body */}
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          {/* Left */}
          <div style={{ flex: 1, padding: '12px 12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontFamily: 'Georgia,serif', fontSize: 28, fontWeight: 700, color: '#fff', lineHeight: 1, margin: 0, textTransform: 'uppercase' }}>
              {p.titleLine1}<br />{p.titleLine2}<br />{p.titleLine3}
            </h2>
            <span style={{ display: 'block', background: gold, borderRadius: 50, textAlign: 'center', padding: '7px 0', fontSize: 12, fontWeight: 600, letterSpacing: '0.22em', color: '#fff', textTransform: 'uppercase' }}>{p.pillText}</span>
            <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, margin: 0 }}>{p.tagline}</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(p.features || []).map((f: string, i: number) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
                  <div style={{ width: 14, height: 14, background: gold, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 7, color: '#1a1a2e' }}>✓</div>
                  {f}
                </li>
              ))}
            </ul>
            {/* Gallery thumbs */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(p.galleryImages || []).slice(0, 2).map((img: string, i: number) => (
                <div key={i} style={{ flex: 1, aspectRatio: '4/3', overflow: 'hidden', borderRadius: 4 }}>
                  <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.84)' }} />
                </div>
              ))}
            </div>
          </div>
          {/* Right pill */}
          <div style={{ width: 80, flexShrink: 0, background: gold, borderRadius: 999, margin: '-32px 8px 0 0', padding: '8px 0 10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {(p.specs || []).slice(0, 4).map((spec: any, i: number, arr: any[]) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', padding: '5px 0 2px' }}>
                <div style={{ width: 36, height: 36, background: '#f5f0e8', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
                  {SPEC_ICONS[spec.icon] || <span style={{ fontSize: 14 }}>🏠</span>}
                </div>
                <span style={{ fontSize: 6, fontWeight: 700, letterSpacing: '0.1em', color: '#111', textTransform: 'uppercase', textAlign: 'center', padding: '0 3px' }}>{spec.label}</span>
                {i < arr.length - 1 && <div style={{ width: '55%', height: 1, background: 'rgba(0,0,0,0.18)', margin: '3px auto 0' }} />}
              </div>
            ))}
          </div>
        </div>
        {/* Footer */}
        <div style={{ padding: '8px 12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: gold, border: 'none', borderRadius: 6, padding: '7px 12px', cursor: 'pointer' }}>
              <div style={{ width: 0, height: 0, borderTop: '4px solid transparent', borderBottom: '4px solid transparent', borderLeft: '7px solid #fff' }} />
              <span style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.1em', color: '#fff', textTransform: 'uppercase' }}>{p.ctaText}</span>
            </button>
          </div>
          {[p.phone, p.website, p.address].filter(Boolean).map((info: string, i: number) => (
            <div key={i} style={{ fontSize: 9, color: 'rgba(255,255,255,0.55)' }}>📞 {info}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SplitPanelFlyerPreview({ p }: { p: any }) {
  const gold = '#C9A44A';
  return (
    <div style={{ background: '#111', padding: 16, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400, background: '#1a1a1a', overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.7)', borderRadius: 4 }}>
        {/* Hero */}
        <div style={{ position: 'relative', paddingTop: '52%', background: '#1e1e1e', overflow: 'hidden' }}>
          {p.heroImage && <img src={p.heroImage} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 40%' }} />}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 30, background: 'linear-gradient(to bottom,rgba(64,164,196,0.25),rgba(30,120,160,0.45))', pointerEvents: 'none' }} />
        </div>
        {/* Mid split */}
        <div style={{ display: 'flex', minHeight: 110 }}>
          <div style={{ width: '47%', background: gold, padding: '14px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 9, letterSpacing: '0.42em', color: '#fff', textTransform: 'uppercase', marginBottom: 4 }}>{p.tag}</div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 22, fontWeight: 600, color: '#fff', textTransform: 'uppercase', lineHeight: 1 }}>{p.titleLine1}</div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{p.titleLine2}</div>
            </div>
            <div>
              <div style={{ fontSize: 7, letterSpacing: '0.28em', color: 'rgba(255,255,255,0.75)', textTransform: 'uppercase', marginBottom: 2 }}>Start Price</div>
              <div style={{ fontFamily: 'Georgia,serif', fontSize: 14, fontWeight: 600, color: '#fff' }}>{p.price}</div>
            </div>
          </div>
          <div style={{ width: '53%', background: '#222', padding: '14px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 10, letterSpacing: '0.14em', color: '#fff', textTransform: 'uppercase', textAlign: 'right', lineHeight: 1.3 }}>MORE<br />INFORMATION</div>
              <div style={{ textAlign: 'right', marginTop: 6 }}>
                {(p.contact || []).slice(0, 4).map((c: string, i: number) => (
                  <p key={i} style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: 0 }}>{c}</p>
                ))}
              </div>
            </div>
            <button style={{ display: 'block', width: '100%', background: 'transparent', border: `1.5px solid ${gold}`, color: '#fff', fontWeight: 700, fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', padding: '7px 8px', cursor: 'pointer', borderRadius: 3, marginTop: 6 }}>{p.ctaText}</button>
          </div>
        </div>
        {/* Gallery strip */}
        <div style={{ display: 'flex', height: 60, gap: 2 }}>
          {(p.galleryImages || []).slice(0, 2).map((img: string, i: number) => (
            <div key={i} style={{ flex: 1, overflow: 'hidden' }}>
              <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.88)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case 'hero': return <HeroPreview p={block.props} />;
    case 'form': return <FormPreview />;
    case 'text': return <TextPreview p={block.props} />;
    case 'image': return <ImagePreview p={block.props} />;
    case 'stats': return <StatsPreview p={block.props} />;
    case 'cta': return <CtaPreview p={block.props} />;
    case 'property-listings': return <PropertyListingsPreview p={block.props} />;
    case 'testimonials': return <TestimonialsPreview p={block.props} />;
    case 'agent-cards': return <AgentCardsPreview p={block.props} />;
    case 'video-embed': return <VideoEmbedPreview p={block.props} />;
    case 'hero-form-card': return <HeroFormCardPreview p={block.props} />;
    case 'features-list':  return <FeaturesListPreview p={block.props} />;
    case 'amenities':      return <AmenitiesPreview p={block.props} />;
    case 'about-split':    return <AboutSplitPreview p={block.props} />;
    case 'luxury-flyer':       return <LuxuryFlyerPreview p={block.props} />;
    case 'split-panel-flyer':  return <SplitPanelFlyerPreview p={block.props} />;
    default: return <div style={{ padding: 16, color: '#999' }}>Unknown block</div>;
  }
}

// ─── Block Settings Editors ───────────────────────────────────────────────────
function HeroEditor({ p, set }: { p: any; set: (k: string, v: any) => void }) {
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Heading" value={p.heading} onChange={v => set('heading', v)} />
    <FInput label="Subheading" value={p.subheading} onChange={v => set('subheading', v)} />
    <FInput label="Button Text" value={p.ctaText} onChange={v => set('ctaText', v)} />
    <FInput label="Scroll Target ID" value={p.ctaScrollTo} onChange={v => set('ctaScrollTo', v)} placeholder="e.g. form" />
    <p style={sectionTitle}>Appearance</p>
    <FInput label="Background Image URL" value={p.backgroundImage} onChange={v => set('backgroundImage', v)} placeholder="https://..." />
    <FColor label="Overlay Color" value={p.overlayColor} onChange={v => set('overlayColor', v)} />
  </>;
}
function TextEditor({ p, set }: { p: any; set: (k: string, v: any) => void }) {
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Heading" value={p.heading} onChange={v => set('heading', v)} />
    <FTextarea label="Body Text" value={p.body} onChange={v => set('body', v)} rows={4} />
    <FSelect label="Text Align" value={p.align || 'left'} options={['left', 'center', 'right']} onChange={v => set('align', v)} />
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Text Color" value={p.textColor} onChange={v => set('textColor', v)} />
    <FColor label="Background Color" value={p.bgColor} onChange={v => set('bgColor', v)} />
  </>;
}
function ImageEditor({ p, set }: { p: any; set: (k: string, v: any) => void }) {
  return <>
    <p style={sectionTitle}>Image</p>
    <FInput label="Image URL" value={p.src} onChange={v => set('src', v)} placeholder="https://..." />
    <FInput label="Alt Text" value={p.alt} onChange={v => set('alt', v)} />
    <FInput label="Caption" value={p.caption} onChange={v => set('caption', v)} />
    <FInput label="Border Radius" value={p.borderRadius} onChange={v => set('borderRadius', v)} placeholder="8px" />
  </>;
}
function StatsEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  const setItem = (i: number, key: string, val: string) => {
    const items = clone(p.items || []);
    items[i] = { ...items[i], [key]: val };
    onChange({ ...p, items });
  };
  const addItem = () => onChange({ ...p, items: [...(p.items || []), { label: 'New Stat', value: '0+' }] });
  const removeItem = (i: number) => onChange({ ...p, items: (p.items || []).filter((_: any, idx: number) => idx !== i) });
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Section Heading" value={p.heading} onChange={v => set('heading', v)} />
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Accent Color" value={p.accentColor} onChange={v => set('accentColor', v)} />
    <FColor label="Background" value={p.bgColor} onChange={v => set('bgColor', v)} />
    <p style={sectionTitle}>Stat Items</p>
    {(p.items || []).map((item: any, i: number) => (
      <div key={i} style={{ background: C.bg, borderRadius: 6, padding: 10, marginBottom: 8, border: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Stat #{i + 1}</span>
          <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 12, padding: '2px 4px' }}>Remove</button>
        </div>
        <FInput label="Value" value={item.value} onChange={v => setItem(i, 'value', v)} />
        <FInput label="Label" value={item.label} onChange={v => setItem(i, 'label', v)} />
      </div>
    ))}
    <button onClick={addItem} style={{ width: '100%', padding: '8px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, marginTop: 4 }}>+ Add Stat</button>
  </>;
}
function CtaEditor({ p, set }: { p: any; set: (k: string, v: any) => void }) {
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Heading" value={p.heading} onChange={v => set('heading', v)} />
    <FInput label="Subheading" value={p.subheading} onChange={v => set('subheading', v)} />
    <FInput label="Button Text" value={p.buttonText} onChange={v => set('buttonText', v)} />
    <FInput label="Scroll Target ID" value={p.buttonScrollTo} onChange={v => set('buttonScrollTo', v)} placeholder="e.g. form" />
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Background Color" value={p.bgColor} onChange={v => set('bgColor', v)} />
    <FColor label="Text Color" value={p.textColor} onChange={v => set('textColor', v)} />
  </>;
}
function PropertyListingsEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  const setProp = (i: number, key: string, val: string) => {
    const properties = clone(p.properties || []);
    properties[i] = { ...properties[i], [key]: val };
    onChange({ ...p, properties });
  };
  const addProp = () => onChange({ ...p, properties: [...(p.properties || []), { title: 'New Property', price: '0 QAR', location: 'Qatar', badge: '', image: '' }] });
  const removeProp = (i: number) => onChange({ ...p, properties: (p.properties || []).filter((_: any, idx: number) => idx !== i) });
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Section Heading" value={p.heading} onChange={v => set('heading', v)} />
    <FInput label="Subheading" value={p.subheading} onChange={v => set('subheading', v)} />
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Accent Color" value={p.accentColor} onChange={v => set('accentColor', v)} />
    <FColor label="Background" value={p.bgColor} onChange={v => set('bgColor', v)} />
    <p style={sectionTitle}>Properties</p>
    {(p.properties || []).map((prop: any, i: number) => (
      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Property #{i + 1}</span>
          <button onClick={() => removeProp(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 12 }}>Remove</button>
        </div>
        <FInput label="Title" value={prop.title} onChange={v => setProp(i, 'title', v)} />
        <FInput label="Price" value={prop.price} onChange={v => setProp(i, 'price', v)} />
        <FInput label="Location" value={prop.location} onChange={v => setProp(i, 'location', v)} />
        <FInput label="Badge (optional)" value={prop.badge} onChange={v => setProp(i, 'badge', v)} placeholder="e.g. New Launch" />
        <FInput label="Image URL" value={prop.image} onChange={v => setProp(i, 'image', v)} placeholder="https://..." />
      </div>
    ))}
    <button onClick={addProp} style={{ width: '100%', padding: '8px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12 }}>+ Add Property</button>
  </>;
}
function TestimonialsEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  const setItem = (i: number, key: string, val: any) => {
    const items = clone(p.items || []);
    items[i] = { ...items[i], [key]: val };
    onChange({ ...p, items });
  };
  const addItem = () => onChange({ ...p, items: [...(p.items || []), { name: 'Client Name', role: 'Buyer', text: 'Great experience!', rating: 5 }] });
  const removeItem = (i: number) => onChange({ ...p, items: (p.items || []).filter((_: any, idx: number) => idx !== i) });
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Section Heading" value={p.heading} onChange={v => set('heading', v)} />
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Accent Color" value={p.accentColor} onChange={v => set('accentColor', v)} />
    <FColor label="Background" value={p.bgColor} onChange={v => set('bgColor', v)} />
    <p style={sectionTitle}>Testimonials</p>
    {(p.items || []).map((item: any, i: number) => (
      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Review #{i + 1}</span>
          <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 12 }}>Remove</button>
        </div>
        <FInput label="Name" value={item.name} onChange={v => setItem(i, 'name', v)} />
        <FInput label="Role / Title" value={item.role} onChange={v => setItem(i, 'role', v)} />
        <FTextarea label="Testimonial Text" value={item.text} onChange={v => setItem(i, 'text', v)} rows={2} />
        <FSelect label="Rating" value={String(item.rating || 5)} options={['5', '4', '3', '2', '1']} onChange={v => setItem(i, 'rating', Number(v))} />
      </div>
    ))}
    <button onClick={addItem} style={{ width: '100%', padding: '8px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12 }}>+ Add Testimonial</button>
  </>;
}
function AgentCardsEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  const setAgent = (i: number, key: string, val: string) => {
    const agents = clone(p.agents || []);
    agents[i] = { ...agents[i], [key]: val };
    onChange({ ...p, agents });
  };
  const addAgent = () => onChange({ ...p, agents: [...(p.agents || []), { name: 'Agent Name', title: 'Consultant', phone: '', speciality: '', image: '' }] });
  const removeAgent = (i: number) => onChange({ ...p, agents: (p.agents || []).filter((_: any, idx: number) => idx !== i) });
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Section Heading" value={p.heading} onChange={v => set('heading', v)} />
    <FInput label="Subheading" value={p.subheading} onChange={v => set('subheading', v)} />
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Accent Color" value={p.accentColor} onChange={v => set('accentColor', v)} />
    <FColor label="Background" value={p.bgColor} onChange={v => set('bgColor', v)} />
    <p style={sectionTitle}>Agents</p>
    {(p.agents || []).map((agent: any, i: number) => (
      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Agent #{i + 1}</span>
          <button onClick={() => removeAgent(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 12 }}>Remove</button>
        </div>
        <FInput label="Name" value={agent.name} onChange={v => setAgent(i, 'name', v)} />
        <FInput label="Title" value={agent.title} onChange={v => setAgent(i, 'title', v)} />
        <FInput label="Phone" value={agent.phone} onChange={v => setAgent(i, 'phone', v)} />
        <FInput label="Speciality" value={agent.speciality} onChange={v => setAgent(i, 'speciality', v)} />
        <FInput label="Photo URL" value={agent.image} onChange={v => setAgent(i, 'image', v)} placeholder="https://..." />
      </div>
    ))}
    <button onClick={addAgent} style={{ width: '100%', padding: '8px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12 }}>+ Add Agent</button>
  </>;
}
function VideoEmbedEditor({ p, set }: { p: any; set: (k: string, v: any) => void }) {
  return <>
    <p style={sectionTitle}>Video</p>
    <FInput label="YouTube or Vimeo URL" value={p.url} onChange={v => set('url', v)} placeholder="https://youtube.com/watch?v=..." />
    <FInput label="Heading" value={p.heading} onChange={v => set('heading', v)} />
    <FInput label="Caption" value={p.caption} onChange={v => set('caption', v)} />
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Background" value={p.bgColor} onChange={v => set('bgColor', v)} />
  </>;
}
function FormFixedEditor() {
  return (
    <div style={{ textAlign: 'center', padding: '24px 12px' }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>🔒</div>
      <p style={{ fontWeight: 700, color: C.text, fontSize: 13, margin: '0 0 6px' }}>Fixed Block</p>
      <p style={{ color: C.textMuted, fontSize: 12, margin: 0, lineHeight: 1.7 }}>
        The <strong>Book a Viewing</strong> form is fixed. It always renders the same 8-field enquiry form on the live page.
      </p>
      <div style={{ marginTop: 16, background: C.bg, borderRadius: 8, padding: 12, textAlign: 'left', border: `1px solid ${C.border}` }}>
        <p style={{ ...sectionTitle, margin: '0 0 8px' }}>Fields included</p>
        {['First Name', 'Last Name', 'Email', 'Phone', 'Preferred Date', 'Preferred Time', 'Budget (QAR)', 'Message'].map(f => (
          <div key={f} style={{ fontSize: 12, color: C.textMuted, padding: '4px 0', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: C.success }}>✓</span> {f}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── New Block Settings Editors ───────────────────────────────────────────────

function HeroFormCardEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  return <>
    <p style={sectionTitle}>Hero Content</p>
    <FTextarea label="Heading (use \\n for line break)" value={p.heading} onChange={v => set('heading', v)} rows={2} />
    <FTextarea label="Subtext" value={p.subtext} onChange={v => set('subtext', v)} rows={2} />
    <FInput label="Background Image URL" value={p.backgroundImage} onChange={v => set('backgroundImage', v)} placeholder="https://..." />
    <FColor label="Overlay Color" value={p.overlayColor} onChange={v => set('overlayColor', v)} />
    <p style={sectionTitle}>Form Card</p>
    <FInput label="Small Label" value={p.formLabel} onChange={v => set('formLabel', v)} />
    <FInput label="Form Title" value={p.formTitle} onChange={v => set('formTitle', v)} />
    <FTextarea label="Form Description" value={p.formDesc} onChange={v => set('formDesc', v)} rows={2} />
    <FInput label="Submit Button Text" value={p.submitLabel} onChange={v => set('submitLabel', v)} />
    <FColor label="Accent Color" value={p.accentColor} onChange={v => set('accentColor', v)} />
  </>;
}

function FeaturesListEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  const setFeature = (i: number, v: string) => { const f = clone(p.features || []); f[i] = v; onChange({ ...p, features: f }); };
  const addFeature = () => onChange({ ...p, features: [...(p.features || []), 'New feature'] });
  const removeFeature = (i: number) => onChange({ ...p, features: (p.features || []).filter((_: any, idx: number) => idx !== i) });
  const setSlide = (i: number, k: string, v: string) => { const s = clone(p.slides || []); s[i] = { ...s[i], [k]: v }; onChange({ ...p, slides: s }); };
  const addSlide = () => onChange({ ...p, slides: [...(p.slides || []), { src: '', title: 'New Slide', sub: '' }] });
  const removeSlide = (i: number) => onChange({ ...p, slides: (p.slides || []).filter((_: any, idx: number) => idx !== i) });
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Section Heading" value={p.heading} onChange={v => set('heading', v)} />
    <FColor label="Accent Color" value={p.accentColor} onChange={v => set('accentColor', v)} />
    <FColor label="Background" value={p.bgColor} onChange={v => set('bgColor', v)} />
    <p style={sectionTitle}>Feature Bullets</p>
    {(p.features || []).map((f: string, i: number) => (
      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={f} onChange={e => setFeature(i, e.target.value)} />
        <button onClick={() => removeFeature(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
    ))}
    <button onClick={addFeature} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, marginBottom: 4 }}>+ Add Feature</button>
    <p style={sectionTitle}>Image Slides</p>
    {(p.slides || []).map((slide: any, i: number) => (
      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Slide #{i + 1}</span>
          <button onClick={() => removeSlide(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 12 }}>Remove</button>
        </div>
        <FInput label="Image URL" value={slide.src} onChange={v => setSlide(i, 'src', v)} placeholder="https://..." />
        <FInput label="Title" value={slide.title} onChange={v => setSlide(i, 'title', v)} />
        <FInput label="Subtitle" value={slide.sub} onChange={v => setSlide(i, 'sub', v)} />
      </div>
    ))}
    <button onClick={addSlide} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12 }}>+ Add Slide</button>
  </>;
}

function AmenitiesEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  const iconOptions = ['location', 'golf', 'valet', 'clock', 'pool', 'gym'];
  const setItem = (i: number, k: string, v: string) => { const items = clone(p.items || []); items[i] = { ...items[i], [k]: v }; onChange({ ...p, items }); };
  const addItem = () => onChange({ ...p, items: [...(p.items || []), { icon: 'location', title: 'New Amenity', desc: 'Description here.' }] });
  const removeItem = (i: number) => onChange({ ...p, items: (p.items || []).filter((_: any, idx: number) => idx !== i) });
  return <>
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Accent Color" value={p.accentColor} onChange={v => set('accentColor', v)} />
    <FColor label="Background" value={p.bgColor} onChange={v => set('bgColor', v)} />
    <p style={sectionTitle}>Amenity Items</p>
    {(p.items || []).map((item: any, i: number) => (
      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Item #{i + 1}</span>
          <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 12 }}>Remove</button>
        </div>
        <FSelect label="Icon" value={item.icon} options={iconOptions} onChange={v => setItem(i, 'icon', v)} />
        <FInput label="Title" value={item.title} onChange={v => setItem(i, 'title', v)} />
        <FTextarea label="Description" value={item.desc} onChange={v => setItem(i, 'desc', v)} rows={2} />
      </div>
    ))}
    <button onClick={addItem} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12 }}>+ Add Amenity</button>
  </>;
}

function AboutSplitEditor({ p, set }: { p: any; set: (k: string, v: any) => void }) {
  return <>
    <p style={sectionTitle}>Content</p>
    <FInput label="Heading" value={p.heading} onChange={v => set('heading', v)} />
    <FTextarea label="Description" value={p.description} onChange={v => set('description', v)} rows={4} />
    <FInput label="Image URL" value={p.image} onChange={v => set('image', v)} placeholder="https://..." />
    <FSelect label="Image Position" value={p.imagePosition || 'left'} options={['left', 'right']} onChange={v => set('imagePosition', v)} />
    <p style={sectionTitle}>Appearance</p>
    <FColor label="Panel Background" value={p.bgColor} onChange={v => set('bgColor', v)} />
    <FColor label="Text Color" value={p.textColor} onChange={v => set('textColor', v)} />
    <FColor label="Accent Color" value={p.accentColor} onChange={v => set('accentColor', v)} />
  </>;
}

function LuxuryFlyerEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  const setSpec = (i: number, k: string, v: string) => { const s = clone(p.specs || []); s[i] = { ...s[i], [k]: v }; onChange({ ...p, specs: s }); };
  const addSpec = () => onChange({ ...p, specs: [...(p.specs || []), { icon: 'bed', label: 'New Spec' }] });
  const rmSpec = (i: number) => onChange({ ...p, specs: (p.specs || []).filter((_: any, idx: number) => idx !== i) });
  const setFeature = (i: number, v: string) => { const f = clone(p.features || []); f[i] = v; onChange({ ...p, features: f }); };
  const addFeature = () => onChange({ ...p, features: [...(p.features || []), 'New feature'] });
  const rmFeature = (i: number) => onChange({ ...p, features: (p.features || []).filter((_: any, idx: number) => idx !== i) });
  const setGallery = (i: number, v: string) => { const g = clone(p.galleryImages || []); g[i] = v; onChange({ ...p, galleryImages: g }); };
  const addGallery = () => onChange({ ...p, galleryImages: [...(p.galleryImages || []), ''] });
  const rmGallery = (i: number) => onChange({ ...p, galleryImages: (p.galleryImages || []).filter((_: any, idx: number) => idx !== i) });
  return <>
    <p style={sectionTitle}>Hero Image</p>
    <FInput label="Hero Image URL" value={p.heroImage} onChange={v => set('heroImage', v)} placeholder="https://..." />
    <p style={sectionTitle}>Title</p>
    <FInput label="Title Line 1" value={p.titleLine1} onChange={v => set('titleLine1', v)} />
    <FInput label="Title Line 2" value={p.titleLine2} onChange={v => set('titleLine2', v)} />
    <FInput label="Title Line 3" value={p.titleLine3} onChange={v => set('titleLine3', v)} />
    <FInput label="Pill Text (e.g. FOR SALE)" value={p.pillText} onChange={v => set('pillText', v)} />
    <FInput label="Tagline" value={p.tagline} onChange={v => set('tagline', v)} />
    <p style={sectionTitle}>Feature Bullets</p>
    {(p.features || []).map((f: string, i: number) => (
      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={f} onChange={e => setFeature(i, e.target.value)} />
        <button onClick={() => rmFeature(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
    ))}
    <button onClick={addFeature} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, marginBottom: 4 }}>+ Add Feature</button>
    <p style={sectionTitle}>Specs Pill (up to 4)</p>
    {(p.specs || []).map((spec: any, i: number) => (
      <div key={i} style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: 10, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: C.textMuted, fontWeight: 600 }}>Spec #{i + 1}</span>
          <button onClick={() => rmSpec(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 12 }}>Remove</button>
        </div>
        <FSelect label="Icon" value={spec.icon} options={['bed', 'bath', 'kitchen', 'garage']} onChange={v => setSpec(i, 'icon', v)} />
        <FInput label="Label" value={spec.label} onChange={v => setSpec(i, 'label', v)} />
      </div>
    ))}
    <button onClick={addSpec} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, marginBottom: 4 }}>+ Add Spec</button>
    <p style={sectionTitle}>Gallery Thumbnails</p>
    {(p.galleryImages || []).map((img: string, i: number) => (
      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={img} placeholder="https://..." onChange={e => setGallery(i, e.target.value)} />
        <button onClick={() => rmGallery(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
    ))}
    <button onClick={addGallery} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, marginBottom: 4 }}>+ Add Gallery Image</button>
    <p style={sectionTitle}>Contact & CTA</p>
    <FInput label="CTA Button Text" value={p.ctaText} onChange={v => set('ctaText', v)} />
    <FInput label="Phone" value={p.phone} onChange={v => set('phone', v)} />
    <FInput label="Website" value={p.website} onChange={v => set('website', v)} />
    <FInput label="Address" value={p.address} onChange={v => set('address', v)} />
  </>;
}

function SplitPanelFlyerEditor({ p, set, onChange }: { p: any; set: (k: string, v: any) => void; onChange: (np: any) => void }) {
  const setContact = (i: number, v: string) => { const c = clone(p.contact || []); c[i] = v; onChange({ ...p, contact: c }); };
  const addContact = () => onChange({ ...p, contact: [...(p.contact || []), ''] });
  const rmContact = (i: number) => onChange({ ...p, contact: (p.contact || []).filter((_: any, idx: number) => idx !== i) });
  const setGallery = (i: number, v: string) => { const g = clone(p.galleryImages || []); g[i] = v; onChange({ ...p, galleryImages: g }); };
  const addGallery = () => onChange({ ...p, galleryImages: [...(p.galleryImages || []), ''] });
  const rmGallery = (i: number) => onChange({ ...p, galleryImages: (p.galleryImages || []).filter((_: any, idx: number) => idx !== i) });
  return <>
    <p style={sectionTitle}>Hero Image</p>
    <FInput label="Hero Image URL" value={p.heroImage} onChange={v => set('heroImage', v)} placeholder="https://..." />
    <p style={sectionTitle}>Gold Panel</p>
    <FInput label="Tag Line (e.g. Dream)" value={p.tag} onChange={v => set('tag', v)} />
    <FInput label="Title Line 1 (large)" value={p.titleLine1} onChange={v => set('titleLine1', v)} />
    <FInput label="Title Line 2 (small)" value={p.titleLine2} onChange={v => set('titleLine2', v)} />
    <FInput label="Start Price" value={p.price} onChange={v => set('price', v)} placeholder="$1,500,000" />
    <p style={sectionTitle}>Dark Panel — Contact Info</p>
    {(p.contact || []).map((c: string, i: number) => (
      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={c} placeholder="Phone / Email / Address…" onChange={e => setContact(i, e.target.value)} />
        <button onClick={() => rmContact(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
    ))}
    <button onClick={addContact} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12, marginBottom: 4 }}>+ Add Contact Line</button>
    <FInput label="CTA Button Text" value={p.ctaText} onChange={v => set('ctaText', v)} />
    <p style={sectionTitle}>Gallery Strip</p>
    {(p.galleryImages || []).map((img: string, i: number) => (
      <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input style={{ ...inputStyle, flex: 1 }} value={img} placeholder="https://..." onChange={e => setGallery(i, e.target.value)} />
        <button onClick={() => rmGallery(i)} style={{ background: 'none', border: 'none', color: C.danger, cursor: 'pointer', fontSize: 14 }}>✕</button>
      </div>
    ))}
    <button onClick={addGallery} style={{ width: '100%', padding: '7px', border: `1px dashed ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 12 }}>+ Add Gallery Image</button>
  </>;
}

function BlockSettingsEditor({ block, onChange }: { block: Block; onChange: (b: Block) => void }) {
  const set = (k: string, v: any) => onChange({ ...block, props: { ...block.props, [k]: v } });
  switch (block.type) {
    case 'hero': return <HeroEditor p={block.props} set={set} />;
    case 'form': return <FormFixedEditor />;
    case 'text': return <TextEditor p={block.props} set={set} />;
    case 'image': return <ImageEditor p={block.props} set={set} />;
    case 'stats': return <StatsEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    case 'cta': return <CtaEditor p={block.props} set={set} />;
    case 'property-listings': return <PropertyListingsEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    case 'testimonials': return <TestimonialsEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    case 'agent-cards': return <AgentCardsEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    case 'video-embed': return <VideoEmbedEditor p={block.props} set={set} />;
    case 'hero-form-card': return <HeroFormCardEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    case 'features-list':  return <FeaturesListEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    case 'amenities':      return <AmenitiesEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    case 'about-split':    return <AboutSplitEditor p={block.props} set={set} />;
    case 'luxury-flyer':       return <LuxuryFlyerEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    case 'split-panel-flyer':  return <SplitPanelFlyerEditor p={block.props} set={set} onChange={np => onChange({ ...block, props: np })} />;
    default: return null;
  }
}

// ─── Template Picker ──────────────────────────────────────────────────────────
function TemplateModal({ onSelect, onClose }: { onSelect: (t: typeof TEMPLATES[0]) => void; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(33,33,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 620, maxWidth: '90vw', boxShadow: '0 16px 48px rgba(33,33,52,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h2 style={{ margin: 0, color: C.text, fontSize: 18 }}>Choose a Template</h2>
            <p style={{ margin: '3px 0 0', color: C.textMuted, fontSize: 13 }}>Pick a starting point for your landing page</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {TEMPLATES.map(t => (
            <div key={t.id} onClick={() => onSelect(t)}
              style={{ border: `2px solid ${C.border}`, borderRadius: 10, padding: 18, cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accent; (e.currentTarget as HTMLElement).style.background = '#f0f0ff'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
              <h3 style={{ margin: '0 0 4px', color: C.text, fontSize: 14, fontWeight: 700 }}>{t.label}</h3>
              <p style={{ margin: '0 0 10px', color: C.textMuted, fontSize: 12 }}>{t.desc}</p>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {t.blocks.map((b, i) => (
                  <span key={i} style={{ background: '#ededff', color: C.accent, borderRadius: 4, padding: '2px 7px', fontSize: 10, fontWeight: 600 }}>{b.type}</span>
                ))}
                {t.blocks.length === 0 && <span style={{ color: C.textLight, fontSize: 11 }}>Empty canvas</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NewPageModal({ template, onConfirm, onBack }: { template: typeof TEMPLATES[0]; onConfirm: (title: string, slug: string) => void; onBack: () => void; }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const handleTitle = (v: string) => {
    setTitle(v);
    setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  };
  const valid = title.trim().length > 0 && slug.trim().length > 0;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(33,33,52,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 480, maxWidth: '90vw', boxShadow: '0 16px 48px rgba(33,33,52,0.3)' }}>
        <h2 style={{ margin: '0 0 4px', color: C.text, fontSize: 18 }}>Name Your Page</h2>
        <p style={{ margin: '0 0 24px', color: C.textMuted, fontSize: 13 }}>Template: <strong style={{ color: C.accent }}>{template.label}</strong></p>
        <div style={fieldRow}>
          <label style={labelStyle}>Page Title</label>
          <input style={inputStyle} placeholder="e.g. Pearl Gates Tower A Campaign" value={title} onChange={e => handleTitle(e.target.value)} autoFocus />
        </div>
        <div style={fieldRow}>
          <label style={labelStyle}>URL Slug</label>
          <div style={{ display: 'flex', alignItems: 'center', border: `1px solid ${C.border}`, borderRadius: 6, overflow: 'hidden', background: '#fff' }}>
            <span style={{ padding: '8px 10px', background: C.bg, color: C.textLight, fontSize: 12, whiteSpace: 'nowrap', borderRight: `1px solid ${C.border}` }}>/landing/</span>
            <input style={{ ...inputStyle, border: 'none', borderRadius: 0, flex: 1 }} value={slug} onChange={e => setSlug(e.target.value)} />
          </div>
          {slug && <p style={{ margin: '4px 0 0', color: C.textMuted, fontSize: 11 }}>Live at: <strong>{previewUrl(slug)}</strong></p>}
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <button onClick={onBack} style={{ padding: '9px 18px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13 }}>← Back</button>
          <button onClick={() => valid && onConfirm(title, slug)}
            style={{ padding: '9px 20px', border: 'none', borderRadius: 6, background: valid ? C.accent : C.border, color: '#fff', cursor: valid ? 'pointer' : 'default', fontSize: 13, fontWeight: 600 }}>
            Create Page →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function PageBuilderApp() {
  const { get, post, put, del } = useFetchClient();

  const [view, setView] = useState<'list' | 'editor'>('list');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<typeof TEMPLATES[0] | null>(null);

  const [pages, setPages] = useState<Page[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState<Page | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // drag state
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const dragItem = useRef<number | null>(null);

  // ── API — uses dedicated plugin routes that verify admin JWT directly ──────
  const CM = '/page-builder/pages';

  const loadPages = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await get(`${CM}?sort=createdAt:desc&pageSize=100`);
      const raw = res.data as any;
      // Strapi v5 Content Manager returns { results: [...], pagination: {...} }
      // Strapi v4-style may return { data: [...] }
      const items: any[] = raw?.results ?? raw?.data ?? (Array.isArray(raw) ? raw : []);
      setPages(items.map((item: any) => ({
        id: item.id,
        // documentId is the Strapi v5 stable identifier used for PUT/DELETE
        documentId: item.documentId ?? undefined,
        title: item.title ?? '',
        slug: item.slug ?? '',
        blocks: Array.isArray(item.blocks) ? item.blocks : [],
        is_published: item.is_published ?? false,
      })));
    } catch { setPages([]); }
    setListLoading(false);
  }, [get]);

  React.useEffect(() => { if (view === 'list') loadPages(); }, [view, loadPages]);

  const savePage = async (publish?: boolean) => {
    if (!currentPage) return;
    setSaving(true); setSaveMsg('');
    const newPublished = publish !== undefined ? publish : currentPage.is_published;
    // Content Manager API takes a flat body — no { data: ... } wrapper
    const body = {
      title: currentPage.title,
      slug: currentPage.slug,
      blocks: currentPage.blocks,
      is_published: newPublished,
    };
    try {
      // Prefer documentId (Strapi v5), fall back to numeric id (Strapi v4)
      const docRef = currentPage.documentId || (currentPage.id ? String(currentPage.id) : null);
      if (docRef) {
        // UPDATE existing record
        await put(`${CM}/${docRef}`, body);
        setCurrentPage(p => p ? { ...p, is_published: newPublished } : p);
      } else {
        // CREATE new record
        const res = await post(CM, body);
        // Content Manager may return { data: {...} } or the object directly
        const raw = (res.data as any);
        const created = raw?.data ?? raw;
        const newDocId: string | undefined = created?.documentId;
        const newId: number | undefined = created?.id;
        if (!newDocId && !newId) {
          // Unexpected response — try to recover by reloading pages list
          setSaveMsg('Saved (refresh to continue editing)');
          setView('list');
          setTimeout(() => setSaveMsg(''), 3000);
          setSaving(false);
          return;
        }
        setCurrentPage(p => p ? {
          ...p,
          id: newId,
          documentId: newDocId,
          is_published: newPublished,
        } : p);
      }
      setSaveMsg(publish === true ? 'Published!' : publish === false ? 'Unpublished' : 'Saved!');
      setTimeout(() => setSaveMsg(''), 2500);
    } catch (e: any) {
      const detail =
        e?.response?.data?.error?.details?.errors?.[0]?.message
        ?? e?.response?.data?.error?.message
        ?? e?.response?.data?.message
        ?? e?.message
        ?? 'Save failed';
      setSaveMsg('Error: ' + detail);
    }
    setSaving(false);
  };

  const deletePage = async (page: Page) => {
    if (!confirm('Delete this landing page?')) return;
    const docRef = page.documentId || String(page.id);
    try { await del(`${CM}/${docRef}`); loadPages(); } catch { /* ignore */ }
  };

  // ── Block operations ──────────────────────────────────────────────────────
  const addBlock = (type: BlockType) => {
    if (!currentPage) return;
    const block: Block = { id: uid(), type, props: clone(DEFAULTS[type]) };
    setCurrentPage({ ...currentPage, blocks: [...currentPage.blocks, block] });
    if (type !== 'form') setSelectedId(block.id);
  };
  const updateBlock = (updated: Block) => {
    if (!currentPage) return;
    setCurrentPage({ ...currentPage, blocks: currentPage.blocks.map(b => b.id === updated.id ? updated : b) });
  };
  const deleteBlock = (id: string) => {
    if (!currentPage) return;
    setCurrentPage({ ...currentPage, blocks: currentPage.blocks.filter(b => b.id !== id) });
    if (selectedId === id) setSelectedId(null);
  };
  const duplicateBlock = (id: string) => {
    if (!currentPage) return;
    const idx = currentPage.blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const copy = { ...clone(currentPage.blocks[idx]), id: uid() };
    const blocks = [...currentPage.blocks];
    blocks.splice(idx + 1, 0, copy);
    setCurrentPage({ ...currentPage, blocks });
    if (copy.type !== 'form') setSelectedId(copy.id);
  };
  const moveBlock = (from: number, to: number) => {
    if (!currentPage || from === to) return;
    const blocks = [...currentPage.blocks];
    const [moved] = blocks.splice(from, 1);
    blocks.splice(to, 0, moved);
    setCurrentPage({ ...currentPage, blocks });
  };

  const selectedBlock = currentPage?.blocks.find(b => b.id === selectedId) ?? null;

  // ── List View ─────────────────────────────────────────────────────────────
  if (view === 'list') {
    return (
      <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: C.bg, minHeight: '100vh', color: C.text }}>
        {showTemplatePicker && !pendingTemplate && <TemplateModal onSelect={t => setPendingTemplate(t)} onClose={() => setShowTemplatePicker(false)} />}
        {pendingTemplate && (
          <NewPageModal
            template={pendingTemplate}
            onConfirm={(title, slug) => {
              const blocks: Block[] = pendingTemplate.blocks.map(b => ({ ...b, id: uid() }));
              setCurrentPage({ title, slug, blocks, is_published: false });
              setSelectedId(null);
              setShowTemplatePicker(false);
              setPendingTemplate(null);
              setView('editor');
            }}
            onBack={() => setPendingTemplate(null)}
          />
        )}

        {/* List header */}
        <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: C.shadow }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: C.text }}>Page Builder</h1>
            <p style={{ margin: '2px 0 0', color: C.textMuted, fontSize: 13 }}>Create and manage custom landing pages</p>
          </div>
          <button onClick={() => setShowTemplatePicker(true)}
            style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            + New Page
          </button>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
          {listLoading ? (
            <div style={{ textAlign: 'center', padding: 60, color: C.textMuted }}>Loading...</div>
          ) : pages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 20px', background: '#fff', borderRadius: 12, border: `2px dashed ${C.border}` }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🏗️</div>
              <h3 style={{ margin: '0 0 8px', color: C.text }}>No landing pages yet</h3>
              <p style={{ color: C.textMuted, margin: '0 0 24px' }}>Create your first page to get started</p>
              <button onClick={() => setShowTemplatePicker(true)}
                style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontWeight: 600, cursor: 'pointer' }}>
                + Create Page
              </button>
            </div>
          ) : pages.map(page => (
            <div key={page.id}
              style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10, padding: '16px 20px', marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: C.shadow, transition: 'box-shadow 0.15s, border-color 0.15s', cursor: 'pointer' }}
              onClick={() => { setCurrentPage(clone(page)); setSelectedId(null); setView('editor'); }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = C.accent; (e.currentTarget as HTMLElement).style.boxShadow = C.shadowMd; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = C.border; (e.currentTarget as HTMLElement).style.boxShadow = C.shadow; }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 8, background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏗️</div>
                <div>
                  <div style={{ fontWeight: 600, color: C.text, fontSize: 15 }}>{page.title}</div>
                  <div style={{ color: C.textMuted, fontSize: 12, marginTop: 2 }}>
                    /landing/<span style={{ color: C.accent }}>{page.slug}</span>
                    <span style={{ margin: '0 8px', color: C.border }}>|</span>
                    <span style={{ color: page.is_published ? C.success : C.textMuted }}>{page.is_published ? '● Live' : '○ Draft'}</span>
                    <span style={{ margin: '0 8px', color: C.border }}>|</span>
                    {page.blocks?.length || 0} blocks
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }} onClick={e => e.stopPropagation()}>
                <a href={previewUrl(page.slug)} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '7px 14px', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 12, textDecoration: 'none', display: 'inline-block' }}>Preview</a>
                <button onClick={() => { setCurrentPage(clone(page)); setSelectedId(null); setView('editor'); }}
                  style={{ padding: '7px 14px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', color: C.text, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                <button onClick={() => deletePage(page)}
                  style={{ padding: '7px 14px', border: `1px solid ${C.dangerLight}`, borderRadius: 6, background: C.dangerLight, color: C.danger, fontSize: 12, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Editor View ───────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: 'system-ui,-apple-system,sans-serif', background: C.bg, minHeight: '100vh', color: C.text, display: 'flex', flexDirection: 'column' }}>

      {/* Top bar */}
      <div style={{ background: '#fff', borderBottom: `1px solid ${C.border}`, padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 12, boxShadow: C.shadow, flexShrink: 0, zIndex: 50 }}>
        <button onClick={() => { setView('list'); setCurrentPage(null); }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
          ← Back
        </button>

        {/* Editable title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {isEditingTitle ? (
            <input
              value={currentPage?.title || ''}
              onChange={e => setCurrentPage(p => p ? { ...p, title: e.target.value } : p)}
              onBlur={() => setIsEditingTitle(false)}
              onKeyDown={e => e.key === 'Enter' && setIsEditingTitle(false)}
              autoFocus
              style={{ fontSize: 15, fontWeight: 600, color: C.text, border: 'none', borderBottom: `2px solid ${C.accent}`, outline: 'none', background: 'none', width: '100%', maxWidth: 300, padding: '2px 0' }}
            />
          ) : (
            <button onClick={() => setIsEditingTitle(true)}
              style={{ background: 'none', border: 'none', cursor: 'text', fontSize: 15, fontWeight: 600, color: C.text, padding: '4px 8px', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 6, maxWidth: 300, overflow: 'hidden' }}
              title="Click to rename">
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentPage?.title}</span>
              <span style={{ fontSize: 11, color: C.textLight }}>✎</span>
            </button>
          )}
          <div style={{ fontSize: 11, color: C.textLight, paddingLeft: 8 }}>{previewUrl(currentPage?.slug ?? '')}</div>
        </div>

        {/* Block count badge */}
        <span style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 12, color: C.textMuted, whiteSpace: 'nowrap' }}>
          {currentPage?.blocks.length || 0} block{(currentPage?.blocks.length || 0) !== 1 ? 's' : ''}
        </span>

        {/* Published toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            onClick={() => savePage(!currentPage?.is_published)}
            style={{ width: 40, height: 22, borderRadius: 11, background: currentPage?.is_published ? '#328048' : C.border, cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
          >
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: currentPage?.is_published ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
          </div>
          <span style={{ fontSize: 12, color: currentPage?.is_published ? C.success : C.textMuted, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {currentPage?.is_published ? 'Published' : 'Draft'}
          </span>
        </div>

        {/* Template picker */}
        <button onClick={() => setShowTemplatePicker(true)}
          style={{ padding: '7px 14px', border: `1px solid ${C.border}`, borderRadius: 6, background: 'none', color: C.textMuted, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
          ☰ Template
        </button>

        {/* Preview */}
        <a href={previewUrl(currentPage?.slug ?? '')} target="_blank" rel="noopener noreferrer"
          style={{ padding: '7px 14px', border: `1px solid ${C.border}`, borderRadius: 6, color: C.textMuted, fontSize: 12, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
          👁 Preview
        </a>

        {/* Save */}
        {saveMsg && <span style={{ fontSize: 12, color: saveMsg.startsWith('Error') ? C.danger : C.success, whiteSpace: 'nowrap' }}>{saveMsg}</span>}
        <button onClick={() => savePage()} disabled={saving}
          style={{ padding: '8px 20px', border: 'none', borderRadius: 6, background: saving ? C.textLight : C.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
          {saving ? 'Saving...' : '💾 Save Page'}
        </button>
      </div>

      {/* 3-column editor body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 56px)' }}>

        {/* LEFT: Block Library */}
        <div style={{ width: 240, background: '#fff', borderRight: `1px solid ${C.border}`, overflowY: 'auto', flexShrink: 0 }}>
          <div style={{ padding: '14px 16px 8px' }}>
            <p style={{ ...sectionTitle, margin: 0, marginBottom: 6 }}>BLOCK LIBRARY</p>
            <p style={{ margin: '0 0 10px', color: C.textLight, fontSize: 11 }}>Drag a block onto the canvas</p>
          </div>
          {BLOCK_LIBRARY.map(item => (
            <div key={item.type}
              draggable
              onDragStart={e => e.dataTransfer.setData('new-block-type', item.type)}
              onClick={() => addBlock(item.type)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', cursor: 'grab', transition: 'background 0.1s', borderBottom: `1px solid ${C.bg}`, userSelect: 'none' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.bg}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ width: 34, height: 34, borderRadius: 6, background: C.bg, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{item.label}</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginTop: 1 }}>{item.desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', color: C.textLight, fontSize: 14, flexShrink: 0 }}>⣿</div>
            </div>
          ))}
        </div>

        {/* CENTER: Canvas */}
        <div
          style={{ flex: 1, overflowY: 'auto', padding: '24px', background: C.canvas }}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            const newType = e.dataTransfer.getData('new-block-type') as BlockType;
            if (newType && DEFAULTS[newType] !== undefined) addBlock(newType);
          }}
        >
          {/* Canvas header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 11, color: C.textLight }}>
              Canvas — click a block to edit · drag handle to reorder · drop from library to add
            </span>
          </div>

          {/* Empty state */}
          {(currentPage?.blocks.length || 0) === 0 && (
            <div style={{ border: `2px dashed ${C.border}`, borderRadius: 12, padding: '60px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.5)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>+</div>
              <p style={{ color: C.textMuted, margin: 0, fontSize: 13 }}>Click a block from the library, or drag it here</p>
            </div>
          )}

          {/* Blocks */}
          {currentPage?.blocks.map((block, idx) => {
            const isSelected = selectedId === block.id;
            const isForm = block.type === 'form';
            const isDraggingThis = draggingIdx === idx;
            const isDropTarget = dragOverIdx === idx && draggingIdx !== idx;
            return (
              <div key={block.id}
                draggable
                onDragStart={e => { dragItem.current = idx; setDraggingIdx(idx); e.dataTransfer.effectAllowed = 'move'; }}
                onDragOver={e => { e.preventDefault(); setDragOverIdx(idx); }}
                onDrop={e => { e.preventDefault(); if (dragItem.current !== null) moveBlock(dragItem.current, idx); dragItem.current = null; setDraggingIdx(null); setDragOverIdx(null); }}
                onDragEnd={() => { dragItem.current = null; setDraggingIdx(null); setDragOverIdx(null); }}
                onClick={() => !isForm && setSelectedId(isSelected ? null : block.id)}
                style={{
                  marginBottom: 12, borderRadius: 8, overflow: 'hidden',
                  border: `2px solid ${isSelected ? C.accent : isDropTarget ? C.accent + '88' : C.border}`,
                  background: '#fff', boxShadow: isSelected ? `0 0 0 3px ${C.accent}22` : C.shadow,
                  opacity: isDraggingThis ? 0.45 : 1,
                  transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
                  cursor: isForm ? 'default' : 'pointer',
                  position: 'relative',
                }}
              >
                {/* Block header bar */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px', background: isSelected ? '#f0f0ff' : C.bg, borderBottom: `1px solid ${C.border}`, gap: 8 }}>
                  <span style={{ fontSize: 14, cursor: 'grab' }} title="Drag to reorder">⣿</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: isSelected ? C.accent : C.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px', flex: 1 }}>
                    {BLOCK_LIBRARY.find(b => b.type === block.type)?.label || block.type}
                  </span>
                  {isForm && <span style={{ fontSize: 10, color: '#999', background: '#eee', borderRadius: 3, padding: '1px 6px' }}>🔒 Fixed</span>}

                  {/* Controls */}
                  <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                    <button title="Move up" onClick={() => moveBlock(idx, Math.max(0, idx - 1))}
                      style={{ width: 26, height: 26, border: `1px solid ${C.border}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
                    <button title="Move down" onClick={() => moveBlock(idx, Math.min((currentPage?.blocks.length || 1) - 1, idx + 1))}
                      style={{ width: 26, height: 26, border: `1px solid ${C.border}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↓</button>
                    <button title="Duplicate" onClick={() => duplicateBlock(block.id)}
                      style={{ width: 26, height: 26, border: `1px solid ${C.border}`, borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 11, color: C.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⧉</button>
                    <button title="Delete block" onClick={() => deleteBlock(block.id)}
                      style={{ width: 26, height: 26, border: `1px solid ${C.dangerLight}`, borderRadius: 4, background: C.dangerLight, cursor: 'pointer', fontSize: 11, color: C.danger, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                  </div>
                </div>

                {/* Block preview */}
                <div style={{ pointerEvents: 'none', userSelect: 'none' }}>
                  <BlockPreview block={block} />
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT: Settings Panel */}
        <div style={{ width: 280, background: '#fff', borderLeft: `1px solid ${C.border}`, overflowY: 'auto', flexShrink: 0 }}>
          {selectedBlock ? (
            <div style={{ padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.text }}>
                  {BLOCK_LIBRARY.find(b => b.type === selectedBlock.type)?.label}
                </h3>
                <button onClick={() => setSelectedId(null)}
                  style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 11, color: C.textMuted }}>{BLOCK_LIBRARY.find(b => b.type === selectedBlock.type)?.desc}</p>
              <BlockSettingsEditor block={selectedBlock} onChange={updateBlock} />
            </div>
          ) : (
            <>
              {/* Page settings when nothing selected */}
              <div style={{ padding: '16px', borderBottom: `1px solid ${C.border}` }}>
                <p style={{ ...sectionTitle, margin: '0 0 12px' }}>PAGE SETTINGS</p>
                <div style={fieldRow}>
                  <label style={labelStyle}>Title</label>
                  <input style={inputStyle} value={currentPage?.title || ''} onChange={e => setCurrentPage(p => p ? { ...p, title: e.target.value } : p)} />
                </div>
                <div style={fieldRow}>
                  <label style={labelStyle}>URL Slug</label>
                  <input style={inputStyle} value={currentPage?.slug || ''} onChange={e => setCurrentPage(p => p ? { ...p, slug: e.target.value } : p)} />
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: C.textLight }}>Live at: {previewUrl(currentPage?.slug ?? '')}</p>
                </div>
              </div>
              <div style={{ padding: '16px' }}>
                <p style={{ ...sectionTitle, margin: '0 0 12px' }}>VISIBILITY</p>
                <div
                  onClick={() => savePage(!currentPage?.is_published)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', border: `1px solid ${currentPage?.is_published ? '#c6f0d3' : C.border}`, borderRadius: 8, background: currentPage?.is_published ? '#eafbe7' : C.bg, cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ width: 40, height: 22, borderRadius: 11, background: currentPage?.is_published ? C.success : C.border, position: 'relative', flexShrink: 0 }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: currentPage?.is_published ? 20 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{currentPage?.is_published ? 'Published' : 'Draft'}</div>
                    <div style={{ fontSize: 11, color: C.textMuted }}>{currentPage?.is_published ? 'Visible in navbar & to visitors' : 'Only visible to admins'}</div>
                  </div>
                </div>
              </div>
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ background: C.bg, borderRadius: 8, padding: 14, textAlign: 'center' }}>
                  <p style={{ margin: '0 0 6px', fontSize: 12, color: C.textMuted }}>👆 Click any block on the canvas to edit its settings here</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Template modal (in editor) */}
      {showTemplatePicker && !pendingTemplate && (
        <TemplateModal
          onSelect={t => setPendingTemplate(t)}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}
      {pendingTemplate && (
        <NewPageModal
          template={pendingTemplate}
          onConfirm={(title, slug) => {
            const blocks: Block[] = pendingTemplate.blocks.map(b => ({ ...b, id: uid() }));
            setCurrentPage(p => p ? { ...p, title, slug, blocks } : { title, slug, blocks, is_published: false });
            setSelectedId(null);
            setShowTemplatePicker(false);
            setPendingTemplate(null);
          }}
          onBack={() => setPendingTemplate(null)}
        />
      )}
    </div>
  );
}
