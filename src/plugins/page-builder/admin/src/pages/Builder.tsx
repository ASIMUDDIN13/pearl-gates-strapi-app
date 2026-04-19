import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext, DragOverlay, useDraggable, useDroppable,
  useSensor, useSensors, PointerSensor, KeyboardSensor,
  pointerWithin, rectIntersection,
  type DragStartEvent, type DragEndEvent, type DragOverEvent,
  type CollisionDetection,
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  arrayMove, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useFetchClient } from '@strapi/admin/strapi-admin';

// ─── Theme ───────────────────────────────────────────────────────────────────

const C = {
  blue:      '#4361EE',
  blueLight: 'rgba(67,97,238,0.10)',
  blueMid:   'rgba(67,97,238,0.20)',
  dark:      '#1a1a2e',
  danger:    '#EF4444',
  success:   '#22C55E',
  bg:        '#F4F5F7',
  surface:   '#FFFFFF',
  border:    '#E8E8EE',
  text:      '#1A1A2E',
  muted:     '#9CA3AF',
  panelHdr:  '#FAFAFA',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type BlockType = 'hero'|'text'|'image'|'form'|'properties'|'testimonials'|'cta'|'stats'|'agent'|'video';

interface FormField { id:string; type:string; label:string; placeholder?:string; required:boolean; options?:string[]; }
interface PageBlock  { id:string; type:BlockType; props:Record<string,any>; }
interface LibBlock   { type:BlockType; label:string; icon:React.ReactNode; description:string; }

// ─── SVG Icon set ─────────────────────────────────────────────────────────────

const Ico = ({ d, size=16 }: { d:string; size?:number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
);

const Icons = {
  hero:         <Ico d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z M4 22v-7" />,
  text:         <Ico d="M17 6.1H3 M21 12.1H3 M15.1 18H3" />,
  image:        <Ico d="M3 3h18v18H3z M3 9l4-4 4 4 4-4 4 4 M9 21l4-4 4 4" />,
  form:         <Ico d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" />,
  properties:   <Ico d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10" />,
  testimonials: <Ico d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  cta:          <Ico d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  stats:        <Ico d="M18 20V10 M12 20V4 M6 20v-6" />,
  agent:        <Ico d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />,
  video:        <Ico d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.95C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z M9.75 15.02l5.75-3.02-5.75-3.02v6.04z" />,
  drag:         <Ico d="M9 3h1v1H9z M14 3h1v1h-1z M9 8h1v1H9z M14 8h1v1h-1z M9 13h1v1H9z M14 13h1v1h-1z" size={14} />,
  save:         <Ico d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z M17 21v-8H7v8 M7 3v5h8" />,
  eye:          <Ico d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 12m-3 0a3 3 0 1 0 6 0 3 3 0 0 0-6 0" />,
  back:         <Ico d="M19 12H5 M12 19l-7-7 7-7" />,
  copy:         <Ico d="M20 9H11a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2z M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />,
  trash:        <Ico d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />,
  up:           <Ico d="M18 15l-6-6-6 6" />,
  down:         <Ico d="M6 9l6 6 6-6" />,
  settings:     <Ico d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 8v4 M12 16h.01" />,
  wand:         <Ico d="M15 4V2 M15 16v-2 M8 9h2 M20 9h2 M17.8 11.8L19 13 M15 9h0 M17.8 6.2L19 5 M3 21l9-9 M12.2 6.2L11 5" />,
  plus:         <Ico d="M12 5v14 M5 12h14" />,
};

// ─── Library definition ───────────────────────────────────────────────────────

const LIBRARY: LibBlock[] = [
  { type:'hero',         label:'Hero / Banner',    icon:Icons.hero,         description:'Full-width banner with title & CTA' },
  { type:'text',         label:'Text Block',        icon:Icons.text,         description:'Rich text content area' },
  { type:'image',        label:'Image',             icon:Icons.image,        description:'Image with optional caption' },
  { type:'form',         label:'Contact Form',      icon:Icons.form,         description:'Lead capture form' },
  { type:'properties',   label:'Property Listings', icon:Icons.properties,   description:'Featured properties grid' },
  { type:'testimonials', label:'Testimonials',      icon:Icons.testimonials, description:'Client testimonials' },
  { type:'cta',          label:'Call To Action',    icon:Icons.cta,          description:'Bold CTA section' },
  { type:'stats',        label:'Stats / Numbers',   icon:Icons.stats,        description:'Key achievement counters' },
  { type:'agent',        label:'Agent Cards',       icon:Icons.agent,        description:'Agent showcase' },
  { type:'video',        label:'Video Embed',       icon:Icons.video,        description:'YouTube / Vimeo embed' },
];

function getLib(type: BlockType): LibBlock {
  return LIBRARY.find(b => b.type === type) ?? LIBRARY[0];
}

// ─── Default props ────────────────────────────────────────────────────────────

function defaultProps(type: BlockType): Record<string,any> {
  switch (type) {
    case 'hero':         return { title:'Find Your Dream Home', subtitle:'Discover premium properties in Qatar', background_image_url:'', overlay_opacity:0.5, button_text:'Explore Properties', button_link:'/properties' };
    case 'text':         return { content:'Enter your text content here...', alignment:'left', font_size:'normal' };
    case 'image':        return { src:'', alt:'', caption:'', width:'full' };
    case 'form':         return { form_title:'Get In Touch', form_subtitle:'Fill in the form and our team will contact you', submit_button_text:'Submit', success_message:'Thank you! We will be in touch shortly.', lead_type:'general', fields:[{id:'f1',type:'text',label:'Full Name',placeholder:'Your name',required:true},{id:'f2',type:'email',label:'Email Address',placeholder:'your@email.com',required:true},{id:'f3',type:'phone',label:'Phone Number',placeholder:'+974 xxxx xxxx',required:false},{id:'f4',type:'textarea',label:'Message',placeholder:'How can we help?',required:false}] as FormField[] };
    case 'properties':   return { title:'Featured Properties', filter_type:'all', count:6 };
    case 'testimonials': return { title:'What Our Clients Say', count:3 };
    case 'cta':          return { title:'Ready to Find Your Perfect Property?', subtitle:'Contact our expert team today', button_text:'Contact Us', button_link:'/contact', background_color:C.dark };
    case 'stats':        return { title:'Our Achievements', items:[{number:'500+',label:'Properties Sold'},{number:'1200+',label:'Happy Clients'},{number:'15+',label:'Years Experience'},{number:'50+',label:'Agents'}] };
    case 'agent':        return { title:'Meet Our Agents', featured_only:true };
    case 'video':        return { url:'', title:'Watch Our Video', autoplay:false };
  }
}

const newId = () => `b_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
const CANVAS_DROP_ID = 'canvas-droppable';

// ─── Collision detection ──────────────────────────────────────────────────────

const collision: CollisionDetection = args => {
  const pw = pointerWithin(args);
  return pw.length > 0 ? pw : rectIntersection(args);
};

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const S = {
  inp: (extra?: React.CSSProperties): React.CSSProperties => ({
    width:'100%', padding:'8px 10px', border:`1px solid ${C.border}`,
    borderRadius:6, fontSize:13, boxSizing:'border-box' as const,
    outline:'none', fontFamily:'inherit', background:C.surface, color:C.text,
    transition:'border-color .15s', ...extra,
  }),
  label: { fontSize:11, fontWeight:700 as const, color:C.muted, marginBottom:5, textTransform:'uppercase' as const, letterSpacing:'.4px', display:'block' as const },
  divider: { height:1, background:C.border, margin:'14px 0' } as React.CSSProperties,
};

function FG({ label, hint, children }: { label?:string; hint?:string; children:React.ReactNode }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <span style={S.label}>{label}</span>}
      {children}
      {hint && <div style={{ fontSize:11, color:C.muted, marginTop:4 }}>{hint}</div>}
    </div>
  );
}

function PBtn({ children, onClick, color=C.blue, textColor='#fff', outline=false, disabled=false, full=false, sm=false, style={} }: {
  children:React.ReactNode; onClick?:()=>void; color?:string; textColor?:string;
  outline?:boolean; disabled?:boolean; full?:boolean; sm?:boolean; style?:React.CSSProperties;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      padding: sm ? '5px 10px' : '8px 16px', border:`1.5px solid ${outline ? color : 'transparent'}`,
      borderRadius:6, background: outline ? 'transparent' : disabled ? '#e0e0e0' : color,
      color: outline ? color : disabled ? '#999' : textColor, cursor: disabled ? 'not-allowed' : 'pointer',
      fontSize: sm ? 11 : 13, fontWeight:600, display:'inline-flex', alignItems:'center', gap:5,
      width: full ? '100%' : undefined, justifyContent: full ? 'center' : undefined,
      fontFamily:'inherit', opacity: disabled ? 0.7 : 1, transition:'all .15s', ...style,
    }}>{children}</button>
  );
}

function IconButton({ icon, onClick, title, danger=false, disabled=false }: {
  icon:React.ReactNode; onClick:()=>void; title:string; danger?:boolean; disabled?:boolean;
}) {
  return (
    <button title={title} onClick={onClick} disabled={disabled} style={{
      border:'none', background:'none', cursor: disabled ? 'default' : 'pointer',
      color: disabled ? C.border : danger ? C.danger : C.muted,
      width:28, height:28, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
      transition:'all .12s', fontFamily:'inherit', opacity: disabled ? 0.4 : 1,
    }}>{icon}</button>
  );
}

function Toggle({ label, checked, onChange }: { label:string; checked:boolean; onChange:(v:boolean)=>void }) {
  return (
    <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', userSelect:'none', marginBottom:14 }}>
      <div onClick={() => onChange(!checked)} style={{
        width:36, height:20, borderRadius:10, background: checked ? C.blue : '#D1D5DB',
        position:'relative', transition:'background .2s', flexShrink:0, cursor:'pointer',
      }}>
        <div style={{
          width:16, height:16, borderRadius:'50%', background:'#fff',
          position:'absolute', top:2, left: checked ? 18 : 2,
          transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.25)',
        }} />
      </div>
      <span style={{ fontSize:13, color:C.text }}>{label}</span>
    </label>
  );
}

function SectionTag({ label }: { label:string }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, margin:'16px 0 12px' }}>
      <span style={{ fontSize:10, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:'.5px', whiteSpace:'nowrap' }}>{label}</span>
      <div style={{ flex:1, height:1, background:C.border }} />
    </div>
  );
}

// ─── Block icon badge ─────────────────────────────────────────────────────────

function BlockBadge({ type, size=28, selected=false }: { type:BlockType; size?:number; selected?:boolean }) {
  const lib = getLib(type);
  return (
    <div style={{
      width:size, height:size, borderRadius:7, flexShrink:0,
      background: selected ? C.blueLight : '#F3F4F6',
      border:`1.5px solid ${selected ? C.blue : C.border}`,
      display:'flex', alignItems:'center', justifyContent:'center',
      color: selected ? C.blue : '#6B7280',
    }}>
      {lib.icon}
    </div>
  );
}

// ─── Library Item ─────────────────────────────────────────────────────────────

function LibraryItem({ block }: { block:LibBlock }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `lib::${block.type}`,
    data: { isLibrary:true, blockType:block.type },
  });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{
      display:'flex', alignItems:'center', gap:10,
      padding:'9px 11px', marginBottom:5,
      background: isDragging ? C.blueLight : C.surface,
      border:`1.5px solid ${isDragging ? C.blue : C.border}`,
      borderRadius:8, cursor:'grab', opacity: isDragging ? 0.4 : 1,
      userSelect:'none', boxShadow: isDragging ? 'none' : '0 1px 2px rgba(0,0,0,.04)',
      transition:'all .15s', touchAction:'none',
    }}>
      <BlockBadge type={block.type} />
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:12, fontWeight:700, color:C.text, lineHeight:1.3 }}>{block.label}</div>
        <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>{block.description}</div>
      </div>
      <div style={{ marginLeft:'auto', color:C.border, flexShrink:0 }}>
        {Icons.drag}
      </div>
    </div>
  );
}

// ─── Block preview ────────────────────────────────────────────────────────────

function BlockPreview({ block }: { block:PageBlock }) {
  const p = block.props;
  switch (block.type) {
    case 'hero': return (
      <div>
        <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:2 }}>{p.title||'Untitled Hero'}</div>
        <div style={{ fontSize:11, color:C.muted }}>{String(p.subtitle||'').slice(0,70)}</div>
        {p.button_text && <span style={{ display:'inline-block', marginTop:5, background:C.blue, color:'#fff', borderRadius:4, padding:'2px 8px', fontSize:10, fontWeight:700 }}>{p.button_text}</span>}
      </div>
    );
    case 'text': return <div style={{ fontSize:12, color:'#555', lineHeight:1.5 }}>{String(p.content||'').slice(0,100)}{String(p.content||'').length>100?'…':''}</div>;
    case 'image': return <div style={{ fontSize:12, color:C.muted }}>{p.src ? `Image: ${String(p.src).slice(0,50)}` : 'No image URL set'}</div>;
    case 'form': return (
      <div>
        <div style={{ fontWeight:700, fontSize:13, color:C.text, marginBottom:5 }}>{p.form_title||'Contact Form'}</div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
          {(p.fields||[]).map((f:FormField) => (
            <span key={f.id} style={{ fontSize:10, background:'#F3F4F6', color:'#555', padding:'2px 7px', borderRadius:4, border:`1px solid ${C.border}` }}>{f.label}</span>
          ))}
        </div>
      </div>
    );
    case 'cta': return (
      <div style={{ padding:'7px 12px', background:p.background_color||C.dark, color:'#fff', borderRadius:6, fontSize:12, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span>{p.title||'Call To Action'}</span>
        {p.button_text && <span style={{ background:C.blue, borderRadius:4, padding:'2px 8px', fontSize:10 }}>{p.button_text}</span>}
      </div>
    );
    case 'stats': return (
      <div style={{ display:'flex', gap:16 }}>
        {(p.items||[]).slice(0,4).map((it:any,i:number) => (
          <div key={i} style={{ textAlign:'center' }}>
            <div style={{ fontWeight:800, fontSize:14, color:C.blue }}>{it.number}</div>
            <div style={{ fontSize:10, color:C.muted }}>{it.label}</div>
          </div>
        ))}
      </div>
    );
    case 'video': return <div style={{ fontSize:12, color:C.muted }}>Video: {p.url ? String(p.url).slice(0,50) : 'No URL set'}</div>;
    default: return <div style={{ fontSize:12, color:C.muted }}>{getLib(block.type).description}</div>;
  }
}

// ─── Sortable canvas block ────────────────────────────────────────────────────

function CanvasBlock({ block, selected, onSelect, onDelete, onDuplicate, onMoveUp, onMoveDown, isFirst, isLast }: {
  block:PageBlock; selected:boolean;
  onSelect:()=>void; onDelete:()=>void; onDuplicate:()=>void;
  onMoveUp:()=>void; onMoveDown:()=>void; isFirst:boolean; isLast:boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id, data: { isCanvas:true },
  });

  return (
    <div ref={setNodeRef} style={{ transform:CSS.Transform.toString(transform), transition: transition||'transform 200ms ease', opacity: isDragging ? 0 : 1, marginBottom:8 }}>
      <div style={{
        display:'flex', alignItems:'stretch',
        background:C.surface, borderRadius:10, overflow:'hidden',
        border:`2px solid ${selected ? C.blue : C.border}`,
        boxShadow: selected ? `0 0 0 3px ${C.blueLight}, 0 2px 8px rgba(67,97,238,.15)` : '0 1px 3px rgba(0,0,0,.06)',
        transition:'all .15s', cursor:'pointer',
      }} onClick={e => { e.stopPropagation(); onSelect(); }}>

        {/* Drag handle */}
        <div {...listeners} {...attributes} onClick={e => e.stopPropagation()} title="Drag to reorder" style={{
          display:'flex', alignItems:'center', justifyContent:'center',
          width:30, background: selected ? C.blueLight : C.panelHdr,
          borderRight:`1px solid ${selected ? C.blueMid : C.border}`,
          cursor:'grab', color: selected ? C.blue : C.border,
          transition:'all .15s', touchAction:'none', flexShrink:0,
        }}>
          {Icons.drag}
        </div>

        {/* Content */}
        <div style={{ flex:1, padding:'10px 14px', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:7 }}>
            <BlockBadge type={block.type} size={22} selected={selected} />
            <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color: selected ? C.blue : C.muted, letterSpacing:'.5px' }}>
              {getLib(block.type).label}
            </span>
            {selected && (
              <span style={{ marginLeft:'auto', fontSize:9, fontWeight:800, color:C.blue, background:C.blueLight, padding:'2px 7px', borderRadius:4, border:`1px solid ${C.blue}`, letterSpacing:'.4px' }}>
                EDITING
              </span>
            )}
          </div>
          <BlockPreview block={block} />
        </div>

        {/* Actions */}
        <div onClick={e => e.stopPropagation()} style={{
          display:'flex', flexDirection:'column', alignItems:'center',
          padding:'5px 4px', gap:1, flexShrink:0,
          background: selected ? C.blueLight : C.panelHdr,
          borderLeft:`1px solid ${selected ? C.blueMid : C.border}`,
        }}>
          <IconButton icon={Icons.up}    title="Move up"    onClick={onMoveUp}    disabled={isFirst} />
          <IconButton icon={Icons.down}  title="Move down"  onClick={onMoveDown}  disabled={isLast} />
          <div style={{ ...S.divider, margin:'3px 0', width:16 }} />
          <IconButton icon={Icons.copy}  title="Duplicate"  onClick={onDuplicate} />
          <IconButton icon={Icons.trash} title="Delete"     onClick={onDelete}    danger />
        </div>
      </div>
    </div>
  );
}

// ─── Canvas drop zone ─────────────────────────────────────────────────────────

function CanvasDrop({ children, isEmpty, isOver }: { children:React.ReactNode; isEmpty:boolean; isOver:boolean }) {
  const { setNodeRef } = useDroppable({ id: CANVAS_DROP_ID });
  return (
    <div ref={setNodeRef} style={{
      minHeight:300, border:`2px dashed ${isOver ? C.blue : isEmpty ? '#D1D5DB' : 'transparent'}`,
      borderRadius:12, background: isOver ? C.blueLight : 'transparent',
      transition:'all .2s', padding: isEmpty ? 0 : 4,
    }}>
      {isEmpty ? (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:300, color: isOver ? C.blue : '#9CA3AF', transition:'color .2s' }}>
          <div style={{ width:56, height:56, borderRadius:14, background: isOver ? C.blueLight : '#F3F4F6', border:`2px dashed ${isOver ? C.blue : '#D1D5DB'}`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, color: isOver ? C.blue : '#D1D5DB' }}>
            {Icons.plus}
          </div>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>{isOver ? 'Release to add block' : 'Canvas is empty'}</div>
          <div style={{ fontSize:12, color: isOver ? C.blue : '#9CA3AF' }}>{isOver ? '' : 'Drag any block from the library to start building'}</div>
        </div>
      ) : children}
    </div>
  );
}

// ─── Drag ghost card ──────────────────────────────────────────────────────────

function GhostCard({ lib }: { lib:LibBlock }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12, padding:'12px 18px',
      background:C.dark, color:'#fff', borderRadius:10,
      boxShadow:'0 16px 40px rgba(0,0,0,.35)',
      border:`2px solid ${C.blue}`, fontSize:13, fontWeight:700,
      cursor:'grabbing', userSelect:'none', minWidth:200,
    }}>
      <div style={{ width:30, height:30, borderRadius:8, background:C.blueLight, display:'flex', alignItems:'center', justifyContent:'center', color:C.blue }}>
        {lib.icon}
      </div>
      {lib.label}
      <span style={{ marginLeft:'auto', fontSize:9, color:C.blue, border:`1px solid ${C.blue}`, padding:'2px 6px', borderRadius:4, fontWeight:800 }}>DRAG</span>
    </div>
  );
}

// ─── Properties panel ─────────────────────────────────────────────────────────

function PropsPanel({ block, onChange, pageTitle, setPageTitle, pageSlug, setPageSlug, isPublished, setIsPublished }: {
  block:PageBlock|null; onChange:(p:Record<string,any>)=>void;
  pageTitle:string; setPageTitle:(v:string)=>void;
  pageSlug:string; setPageSlug:(v:string)=>void;
  isPublished:boolean; setIsPublished:(v:boolean)=>void;
}) {
  if (!block) return (
    <div style={{ padding:16 }}>
      <SectionTag label="Page Settings" />
      <FG label="Title">
        <input style={S.inp()} value={pageTitle} onChange={e => setPageTitle(e.target.value)} placeholder="e.g. General Inquiry" />
      </FG>
      <FG label="URL Slug" hint={`Will be live at: /landing/${pageSlug||'your-slug'}`}>
        <input style={S.inp()} value={pageSlug} onChange={e => setPageSlug(e.target.value)} placeholder="auto-generated from title" />
      </FG>
      <SectionTag label="Visibility" />
      <label style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 14px', background: isPublished ? C.blueLight : C.panelHdr, border:`1.5px solid ${isPublished ? C.blue : C.border}`, borderRadius:8, cursor:'pointer', transition:'all .15s' }}>
        <div onClick={() => setIsPublished(!isPublished)} style={{ width:36, height:20, borderRadius:10, background: isPublished ? C.blue : '#D1D5DB', position:'relative', transition:'background .2s', flexShrink:0, cursor:'pointer' }}>
          <div style={{ width:16, height:16, borderRadius:'50%', background:'#fff', position:'absolute', top:2, left: isPublished ? 18 : 2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.2)' }} />
        </div>
        <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} style={{ display:'none' }} />
        <div>
          <div style={{ fontSize:13, fontWeight:700, color: isPublished ? C.blue : '#6B7280' }}>{isPublished ? 'Published' : 'Draft'}</div>
          <div style={{ fontSize:11, color:C.muted, marginTop:1 }}>{isPublished ? 'Visible in navbar & to visitors' : 'Only visible to admin'}</div>
        </div>
      </label>
    </div>
  );

  const p = block.props;
  const set = (k:string, v:any) => onChange({ ...p, [k]:v });
  const lib = getLib(block.type);

  return (
    <div style={{ padding:16 }}>
      {/* Block header */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:C.blueLight, borderRadius:8, border:`1.5px solid ${C.blueMid}`, marginBottom:16 }}>
        <div style={{ color:C.blue }}>{lib.icon}</div>
        <div>
          <div style={{ fontSize:12, fontWeight:700, color:C.blue }}>{lib.label}</div>
          <div style={{ fontSize:10, color:C.muted }}>{lib.description}</div>
        </div>
      </div>

      {/* ── Hero ── */}
      {block.type==='hero' && <>
        <FG label="Title"><input style={S.inp()} value={p.title||''} onChange={e => set('title',e.target.value)} /></FG>
        <FG label="Subtitle"><textarea style={{ ...S.inp(), resize:'vertical' }} rows={2} value={p.subtitle||''} onChange={e => set('subtitle',e.target.value)} /></FG>
        <FG label="Background Image URL"><input style={S.inp()} value={p.background_image_url||''} onChange={e => set('background_image_url',e.target.value)} placeholder="https://..." /></FG>
        <FG label="Overlay Opacity (0–1)"><input style={S.inp()} type="number" min={0} max={1} step={0.05} value={p.overlay_opacity??0.5} onChange={e => set('overlay_opacity',parseFloat(e.target.value))} /></FG>
        <SectionTag label="CTA Button" />
        <FG label="Button Text"><input style={S.inp()} value={p.button_text||''} onChange={e => set('button_text',e.target.value)} /></FG>
        <FG label="Button Link"><input style={S.inp()} value={p.button_link||''} onChange={e => set('button_link',e.target.value)} /></FG>
      </>}

      {/* ── Text ── */}
      {block.type==='text' && <>
        <FG label="Content"><textarea style={{ ...S.inp(), resize:'vertical' }} rows={7} value={p.content||''} onChange={e => set('content',e.target.value)} /></FG>
        <FG label="Alignment">
          <div style={{ display:'flex', gap:6 }}>
            {['left','center','right'].map(a => (
              <button key={a} onClick={() => set('alignment',a)} style={{ flex:1, padding:'7px', border:`1.5px solid ${p.alignment===a ? C.blue : C.border}`, borderRadius:6, background: p.alignment===a ? C.blueLight : C.surface, color: p.alignment===a ? C.blue : C.muted, cursor:'pointer', fontSize:11, fontWeight:700, textTransform:'capitalize', fontFamily:'inherit' }}>{a}</button>
            ))}
          </div>
        </FG>
        <FG label="Font Size">
          <select style={S.inp()} value={p.font_size||'normal'} onChange={e => set('font_size',e.target.value)}>
            <option value="small">Small</option><option value="normal">Normal</option><option value="large">Large</option><option value="xlarge">X-Large</option>
          </select>
        </FG>
      </>}

      {/* ── Image ── */}
      {block.type==='image' && <>
        <FG label="Image URL"><input style={S.inp()} value={p.src||''} onChange={e => set('src',e.target.value)} placeholder="https://..." /></FG>
        {p.src && <div style={{ marginBottom:12, borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}` }}><img src={p.src} alt="" style={{ width:'100%', maxHeight:110, objectFit:'cover', display:'block' }} /></div>}
        <FG label="Alt Text"><input style={S.inp()} value={p.alt||''} onChange={e => set('alt',e.target.value)} /></FG>
        <FG label="Caption"><input style={S.inp()} value={p.caption||''} onChange={e => set('caption',e.target.value)} /></FG>
        <FG label="Width">
          <div style={{ display:'flex', gap:6 }}>
            {[{v:'full',l:'Full'},{v:'half',l:'Half'},{v:'quarter',l:'¼'}].map(w => (
              <button key={w.v} onClick={() => set('width',w.v)} style={{ flex:1, padding:'7px', border:`1.5px solid ${p.width===w.v ? C.blue : C.border}`, borderRadius:6, background: p.width===w.v ? C.blueLight : C.surface, color: p.width===w.v ? C.blue : C.muted, cursor:'pointer', fontSize:11, fontWeight:700, fontFamily:'inherit' }}>{w.l}</button>
            ))}
          </div>
        </FG>
      </>}

      {/* ── Form ── */}
      {block.type==='form' && <FormEditor p={p} set={set} />}

      {/* ── Properties ── */}
      {block.type==='properties' && <>
        <FG label="Section Title"><input style={S.inp()} value={p.title||''} onChange={e => set('title',e.target.value)} /></FG>
        <FG label="Filter">
          <select style={S.inp()} value={p.filter_type||'all'} onChange={e => set('filter_type',e.target.value)}>
            <option value="all">All Properties</option><option value="sale">For Sale</option><option value="rent">For Rent</option>
          </select>
        </FG>
        <FG label="Max Count"><input style={S.inp()} type="number" min={1} max={12} value={p.count||6} onChange={e => set('count',+e.target.value)} /></FG>
      </>}

      {/* ── Testimonials ── */}
      {block.type==='testimonials' && <>
        <FG label="Section Title"><input style={S.inp()} value={p.title||''} onChange={e => set('title',e.target.value)} /></FG>
        <FG label="Count to Show"><input style={S.inp()} type="number" min={1} max={10} value={p.count||3} onChange={e => set('count',+e.target.value)} /></FG>
      </>}

      {/* ── CTA ── */}
      {block.type==='cta' && <>
        <FG label="Title"><input style={S.inp()} value={p.title||''} onChange={e => set('title',e.target.value)} /></FG>
        <FG label="Subtitle"><input style={S.inp()} value={p.subtitle||''} onChange={e => set('subtitle',e.target.value)} /></FG>
        <SectionTag label="Button" />
        <FG label="Button Text"><input style={S.inp()} value={p.button_text||''} onChange={e => set('button_text',e.target.value)} /></FG>
        <FG label="Button Link"><input style={S.inp()} value={p.button_link||''} onChange={e => set('button_link',e.target.value)} /></FG>
        <SectionTag label="Style" />
        <FG label="Background Color">
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <input type="color" value={p.background_color||C.dark} onChange={e => set('background_color',e.target.value)} style={{ width:40, height:36, border:`1px solid ${C.border}`, borderRadius:6, cursor:'pointer', padding:2, flexShrink:0 }} />
            <input style={{ ...S.inp(), flex:1 }} value={p.background_color||C.dark} onChange={e => set('background_color',e.target.value)} />
          </div>
        </FG>
      </>}

      {/* ── Stats ── */}
      {block.type==='stats' && <StatsEditor p={p} set={set} />}

      {/* ── Agent ── */}
      {block.type==='agent' && <>
        <FG label="Section Title"><input style={S.inp()} value={p.title||''} onChange={e => set('title',e.target.value)} /></FG>
        <Toggle label="Featured agents only" checked={!!p.featured_only} onChange={v => set('featured_only',v)} />
      </>}

      {/* ── Video ── */}
      {block.type==='video' && <>
        <FG label="Video URL" hint="Supports YouTube and Vimeo links">
          <input style={S.inp()} value={p.url||''} onChange={e => set('url',e.target.value)} placeholder="https://youtube.com/watch?v=..." />
        </FG>
        <FG label="Section Title"><input style={S.inp()} value={p.title||''} onChange={e => set('title',e.target.value)} /></FG>
        <Toggle label="Autoplay" checked={!!p.autoplay} onChange={v => set('autoplay',v)} />
      </>}
    </div>
  );
}

// ─── Form editor ──────────────────────────────────────────────────────────────

function FormEditor({ p, set }: { p:any; set:(k:string,v:any)=>void }) {
  const fields:FormField[] = p.fields||[];
  const upd = (id:string, k:string, v:any) => set('fields', fields.map(f => f.id===id ? {...f,[k]:v} : f));
  const del = (id:string) => set('fields', fields.filter(f => f.id!==id));
  const add = () => set('fields', [...fields, { id:`f_${Date.now()}`, type:'text', label:'New Field', placeholder:'', required:false }]);

  return <>
    <FG label="Form Title"><input style={S.inp()} value={p.form_title||''} onChange={e => set('form_title',e.target.value)} /></FG>
    <FG label="Submit Button Text"><input style={S.inp()} value={p.submit_button_text||''} onChange={e => set('submit_button_text',e.target.value)} /></FG>
    <FG label="Success Message"><input style={S.inp()} value={p.success_message||''} onChange={e => set('success_message',e.target.value)} /></FG>
    <FG label="Lead Type">
      <select style={S.inp()} value={p.lead_type||'general'} onChange={e => set('lead_type',e.target.value)}>
        <option value="buyer">Buyer</option><option value="renter">Renter</option>
        <option value="investor">Investor</option><option value="general">General Inquiry</option>
      </select>
    </FG>
    <SectionTag label="Form Fields" />
    {fields.map((f,i) => (
      <div key={f.id} style={{ background:C.panelHdr, border:`1px solid ${C.border}`, borderRadius:8, padding:10, marginBottom:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
          <span style={{ fontSize:11, fontWeight:700, color:C.blue }}>Field {i+1}</span>
          <PBtn sm color={C.danger} outline onClick={() => del(f.id)}>✕ Remove</PBtn>
        </div>
        <FG label="Label"><input style={S.inp()} value={f.label} onChange={e => upd(f.id,'label',e.target.value)} /></FG>
        <FG label="Type">
          <select style={S.inp()} value={f.type} onChange={e => upd(f.id,'type',e.target.value)}>
            <option value="text">Text</option><option value="email">Email</option><option value="phone">Phone</option>
            <option value="textarea">Textarea</option><option value="select">Dropdown</option>
            <option value="radio">Radio Buttons</option><option value="number">Number</option>
          </select>
        </FG>
        <FG label="Placeholder"><input style={S.inp()} value={f.placeholder||''} onChange={e => upd(f.id,'placeholder',e.target.value)} /></FG>
        {['select','radio'].includes(f.type) && (
          <FG label="Options (one per line)">
            <textarea style={{ ...S.inp(), resize:'vertical' }} rows={3}
              value={(f.options||[]).join('\n')}
              onChange={e => upd(f.id,'options', e.target.value.split('\n').map((s:string) => s.trim()).filter(Boolean))} />
          </FG>
        )}
        <Toggle label="Required field" checked={f.required} onChange={v => upd(f.id,'required',v)} />
      </div>
    ))}
    <PBtn full outline color={C.blue} onClick={add}>{Icons.plus} Add Field</PBtn>
  </>;
}

// ─── Stats editor ─────────────────────────────────────────────────────────────

function StatsEditor({ p, set }: { p:any; set:(k:string,v:any)=>void }) {
  const items:{number:string; label:string}[] = p.items||[];
  const upd = (i:number, k:string, v:string) => set('items', items.map((it,idx) => idx===i ? {...it,[k]:v} : it));
  const del = (i:number) => set('items', items.filter((_,idx) => idx!==i));
  const add = () => set('items', [...items, {number:'0', label:'New Stat'}]);

  return <>
    <FG label="Section Title"><input style={S.inp()} value={p.title||''} onChange={e => set('title',e.target.value)} /></FG>
    <SectionTag label="Stat Items" />
    {items.map((it,i) => (
      <div key={i} style={{ display:'flex', gap:6, marginBottom:6, alignItems:'center' }}>
        <input style={{ ...S.inp(), flex:'0 0 70px' }} value={it.number} placeholder="500+" onChange={e => upd(i,'number',e.target.value)} />
        <input style={{ ...S.inp(), flex:1 }} value={it.label} placeholder="Properties Sold" onChange={e => upd(i,'label',e.target.value)} />
        <PBtn sm color={C.danger} outline onClick={() => del(i)}>✕</PBtn>
      </div>
    ))}
    <PBtn full outline color={C.blue} onClick={add} style={{ marginTop:4 }}>{Icons.plus} Add Stat</PBtn>
  </>;
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg:string; type:'ok'|'err' }) {
  return (
    <div style={{
      position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)',
      background: type==='ok' ? '#052e16' : '#450a0a',
      color: type==='ok' ? '#4ade80' : '#fca5a5',
      border:`1px solid ${type==='ok' ? '#4ade80' : '#fca5a5'}`,
      padding:'12px 24px', borderRadius:8, fontSize:13, fontWeight:700,
      boxShadow:'0 8px 32px rgba(0,0,0,.4)', zIndex:9999, fontFamily:'inherit',
    }}>{msg}</div>
  );
}

// ─── Main Builder ─────────────────────────────────────────────────────────────

const PB = 'page-builder/pages';

export function Builder() {
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId?:string }>();
  const { get, post, put } = useFetchClient();

  const [blocks, setBlocks]         = useState<PageBlock[]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [activeId, setActiveId]     = useState<string|null>(null);
  const [overId, setOverId]         = useState<string|null>(null);
  const [pageTitle, setPageTitle]   = useState('New Landing Page');
  const [pageSlug, setPageSlug]     = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [loading, setLoading]       = useState(false);
  const [savedDocId, setSavedDocId] = useState<string|null>(documentId||null);
  const [toast, setToast]           = useState<{msg:string; type:'ok'|'err'}|null>(null);

  const showToast = (msg:string, type:'ok'|'err'='ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint:{ distance:4 } }),
    useSensor(KeyboardSensor, { coordinateGetter:sortableKeyboardCoordinates }),
  );

  // Load existing page via Content Manager
  // CM API can return: { data: { id, documentId, ... } } OR { id, documentId, ... }
  // useFetchClient wraps in { data: responseBody }, so we may need 2 unwraps
  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    get(`/${PB}/${documentId}`)
      .then((res:any) => {
        // Try all possible nesting levels
        const d = res?.data?.data ?? res?.data ?? res;
        if (d && (d.title || d.documentId)) {
          setPageTitle(d.title || 'Untitled');
          setPageSlug(d.slug || '');
          setIsPublished(!!d.is_published);
          const rawBlocks = d.blocks;
          setBlocks(Array.isArray(rawBlocks) ? rawBlocks as PageBlock[] : []);
        }
      })
      .catch(err => {
        console.error('Failed to load page', err);
        showToast('Failed to load page data', 'err');
      })
      .finally(() => setLoading(false));
  }, [documentId]);

  const selectedBlock = blocks.find(b => b.id===selectedId) ?? null;
  const isDraggingFromLib = activeId?.startsWith('lib::') ?? false;
  const canvasIsOver = isDraggingFromLib && (overId===CANVAS_DROP_ID || blocks.some(b => b.id===overId));

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function onDragStart({ active }:DragStartEvent) {
    setActiveId(String(active.id));
  }

  function onDragOver({ over }:DragOverEvent) {
    setOverId(over ? String(over.id) : null);
  }

  function onDragEnd({ active, over }:DragEndEvent) {
    setActiveId(null);
    setOverId(null);
    if (!over) return;

    // ✅ Use data.current NOT id string — fixes "always Hero" bug
    const isLib  = active.data.current?.isLibrary === true;
    const bType  = active.data.current?.blockType as BlockType;
    const activeStr = String(active.id);
    const overStr   = String(over.id);

    if (isLib && bType) {
      // Drop from library → insert new block
      const newBlock:PageBlock = { id:newId(), type:bType, props:defaultProps(bType) };
      setBlocks(prev => {
        if (overStr===CANVAS_DROP_ID) return [...prev, newBlock];
        const idx = prev.findIndex(b => b.id===overStr);
        const arr = [...prev];
        arr.splice(idx>=0 ? idx : arr.length, 0, newBlock);
        return arr;
      });
      setSelectedId(newBlock.id);
      return;
    }

    // Reorder canvas blocks
    if (!isLib && activeStr!==overStr && overStr!==CANVAS_DROP_ID && !overStr.startsWith('lib::')) {
      setBlocks(prev => {
        const oi = prev.findIndex(b => b.id===activeStr);
        const ni = prev.findIndex(b => b.id===overStr);
        return (oi>=0 && ni>=0) ? arrayMove(prev,oi,ni) : prev;
      });
    }
  }

  // ── Block actions ──────────────────────────────────────────────────────────

  const deleteBlock = useCallback((id:string) => {
    setBlocks(prev => prev.filter(b => b.id!==id));
    if (selectedId===id) setSelectedId(null);
  }, [selectedId]);

  const duplicateBlock = useCallback((id:string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id===id);
      if (idx<0) return prev;
      const clone:PageBlock = { id:newId(), type:prev[idx].type, props:JSON.parse(JSON.stringify(prev[idx].props)) };
      const arr = [...prev];
      arr.splice(idx+1, 0, clone);
      return arr;
    });
  }, []);

  const moveBlock = useCallback((id:string, dir:'up'|'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id===id);
      const ni = dir==='up' ? idx-1 : idx+1;
      return (ni>=0 && ni<prev.length) ? arrayMove(prev,idx,ni) : prev;
    });
  }, []);

  const updateProps = useCallback((id:string, props:Record<string,any>) => {
    setBlocks(prev => prev.map(b => b.id===id ? {...b, props} : b));
  }, []);

  // ── Template ───────────────────────────────────────────────────────────────

  function loadTemplate() {
    if (blocks.length>0 && !window.confirm('Replace canvas with template?')) return;
    setPageTitle('General Inquiry');
    const t = Date.now();
    setBlocks([
      { id:`${t}a`, type:'hero', props:{ ...defaultProps('hero'), title:"We'd Love to Hear From You", subtitle:'Fill in the form and our team will get back to you shortly', button_text:'', button_link:'' } },
      { id:`${t}b`, type:'form', props:defaultProps('form') },
    ]);
    setSelectedId(null);
  }

  // ── Save via Content Manager ───────────────────────────────────────────────

  async function savePage() {
    if (!pageTitle.trim()) { showToast('Please enter a page title','err'); return; }
    setSaving(true);
    const payload:any = { title:pageTitle, blocks, is_published:isPublished };
    if (pageSlug) payload.slug = pageSlug;
    try {
      if (savedDocId) {
        const res:any = await put(`/${PB}/${savedDocId}`, payload);
        const d = res?.data?.data ?? res?.data ?? res;
        if (d?.slug) setPageSlug(d.slug);
        showToast('✓ Page saved successfully');
      } else {
        const res:any = await post(`/${PB}`, payload);
        const d = res?.data?.data ?? res?.data ?? res;
        if (d?.documentId) setSavedDocId(d.documentId);
        if (d?.slug)       setPageSlug(d.slug);
        showToast('✓ Page created!');
      }
    } catch (e:any) {
      console.error('Save error', e);
      const msg = e?.response?.data?.error?.message || e?.message || 'Unknown error';
      showToast(`✕ Save failed: ${msg}`, 'err');
    } finally {
      setSaving(false);
    }
  }

  // ── Overlay ghost ─────────────────────────────────────────────────────────

  const activeLib  = activeId?.startsWith('lib::') ? LIBRARY.find(b => `lib::${b.type}`===activeId) : undefined;
  const activeCanvas = activeId && !activeId.startsWith('lib::') ? blocks.find(b => b.id===activeId) : undefined;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:C.bg, fontFamily:'system-ui' }}>
      <style>{`@keyframes pb-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ textAlign:'center', color:C.muted }}>
        <div style={{ width:40, height:40, border:`3px solid ${C.border}`, borderTopColor:C.blue, borderRadius:'50%', animation:'pb-spin 1s linear infinite', margin:'0 auto 16px' }} />
        Loading page…
      </div>
    </div>
  );

  return (
    <DndContext sensors={sensors} collisionDetection={collision} onDragStart={onDragStart} onDragOver={onDragOver} onDragEnd={onDragEnd}>
      <div style={{ display:'flex', flexDirection:'column', height:'100vh', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background:C.bg, overflow:'hidden' }}>

        {/* ── Top Bar ─────────────────────────────────────────────────── */}
        <div style={{ display:'flex', alignItems:'center', gap:10, height:54, padding:'0 16px', background:C.dark, flexShrink:0, zIndex:200, boxShadow:'0 2px 12px rgba(0,0,0,.25)' }}>
          <button onClick={() => navigate('..')} style={{ border:`1px solid rgba(255,255,255,.2)`, background:'rgba(255,255,255,.08)', color:'#ccc', cursor:'pointer', borderRadius:6, padding:'5px 12px', fontSize:12, display:'flex', alignItems:'center', gap:6, fontFamily:'inherit' }}>
            {Icons.back} Back
          </button>
          <div style={{ width:1, height:22, background:'rgba(255,255,255,.12)' }} />
          <input value={pageTitle} onChange={e => setPageTitle(e.target.value)} placeholder="Page Title"
            style={{ width:220, padding:'6px 12px', background:'rgba(255,255,255,.1)', border:`1px solid rgba(255,255,255,.2)`, borderRadius:6, color:'#fff', fontSize:14, outline:'none', fontFamily:'inherit' }} />
          <div style={{ padding:'3px 10px', background:`rgba(67,97,238,.25)`, border:`1px solid rgba(67,97,238,.5)`, borderRadius:20, fontSize:11, color:'#818cf8', fontWeight:700 }}>
            {blocks.length} block{blocks.length!==1?'s':''}
          </div>
          <div style={{ flex:1 }} />
          {/* Clickable publish toggle in top bar */}
          <button
            onClick={() => setIsPublished(v => !v)}
            title={isPublished ? 'Click to unpublish (set to Draft)' : 'Click to publish (show in navbar)'}
            style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'6px 14px',
              background: isPublished ? 'rgba(34,197,94,.15)' : 'rgba(255,255,255,.06)',
              border:`1.5px solid ${isPublished ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.2)'}`,
              borderRadius:20, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit',
              color: isPublished ? '#4ade80' : '#9CA3AF', transition:'all .2s',
            }}
          >
            {/* Toggle track */}
            <div style={{ width:28, height:16, borderRadius:8, background: isPublished ? 'rgba(34,197,94,.5)' : 'rgba(255,255,255,.15)', position:'relative', flexShrink:0, transition:'background .2s' }}>
              <div style={{ width:12, height:12, borderRadius:'50%', background: isPublished ? '#4ade80' : '#9CA3AF', position:'absolute', top:2, left: isPublished ? 14 : 2, transition:'left .2s', boxShadow:'0 1px 3px rgba(0,0,0,.3)' }} />
            </div>
            {isPublished ? 'Published' : 'Draft'}
          </button>
          <button onClick={loadTemplate} style={{ border:`1px solid rgba(255,255,255,.18)`, background:'rgba(255,255,255,.06)', color:'#d1d5db', cursor:'pointer', borderRadius:6, padding:'6px 13px', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
            {Icons.wand} Template
          </button>
          {savedDocId && pageSlug && (
            <button onClick={() => { const base = (process.env.STRAPI_ADMIN_FRONTEND_URL || (window.location.hostname === 'localhost' ? 'http://localhost:4200' : 'https://thepearlgates-website.up.railway.app')).replace(/\/$/, ''); window.open(`${base}/landing/${pageSlug}`, '_blank'); }} style={{ border:`1px solid rgba(255,255,255,.18)`, background:'rgba(255,255,255,.06)', color:'#d1d5db', cursor:'pointer', borderRadius:6, padding:'6px 13px', fontSize:12, display:'flex', alignItems:'center', gap:5, fontFamily:'inherit' }}>
              {Icons.eye} Preview
            </button>
          )}
          <button onClick={savePage} disabled={saving} style={{ background: saving ? 'rgba(67,97,238,.5)' : C.blue, color:'#fff', border:'none', borderRadius:6, padding:'8px 18px', fontSize:13, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:6 }}>
            {Icons.save} {saving ? 'Saving…' : 'Save Page'}
          </button>
        </div>

        {/* ── 3-Panel body ────────────────────────────────────────────── */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* LEFT: Library */}
          <div style={{ width:235, flexShrink:0, background:C.surface, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'2px 0 6px rgba(0,0,0,.04)' }}>
            <div style={{ padding:'11px 13px 8px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px', marginBottom:3 }}>Block Library</div>
              <div style={{ fontSize:11, color:'#D1D5DB' }}>Drag a block onto the canvas</div>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:10 }}>
              {LIBRARY.map(b => <LibraryItem key={b.type} block={b} />)}
            </div>
          </div>

          {/* MIDDLE: Canvas */}
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', background:C.bg }} onClick={() => setSelectedId(null)}>
            <div style={{ padding:'9px 16px', borderBottom:`1px solid ${C.border}`, background:C.surface, display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#6B7280' }}>Canvas</span>
              <span style={{ fontSize:11, color:'#D1D5DB' }}>— click a block to edit · drag handle to reorder · drop from library to add</span>
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:16 }}>
              <CanvasDrop isEmpty={blocks.length===0} isOver={canvasIsOver}>
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block,idx) => (
                    <CanvasBlock
                      key={block.id} block={block}
                      selected={selectedId===block.id}
                      isFirst={idx===0} isLast={idx===blocks.length-1}
                      onSelect={() => setSelectedId(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onMoveUp={() => moveBlock(block.id,'up')}
                      onMoveDown={() => moveBlock(block.id,'down')}
                    />
                  ))}
                </SortableContext>
              </CanvasDrop>
            </div>
          </div>

          {/* RIGHT: Properties */}
          <div style={{ width:275, flexShrink:0, background:C.surface, borderLeft:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'-2px 0 6px rgba(0,0,0,.04)' }}>
            <div style={{ padding:'11px 13px', borderBottom:`1px solid ${C.border}`, flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'.6px' }}>
                {selectedBlock ? getLib(selectedBlock.type).label : 'Properties'}
              </div>
            </div>
            <div style={{ flex:1, overflowY:'auto' }}>
              {selectedBlock ? (
                <PropsPanel
                  block={selectedBlock}
                  onChange={props => selectedId && updateProps(selectedId, props)}
                  pageTitle={pageTitle} setPageTitle={setPageTitle}
                  pageSlug={pageSlug} setPageSlug={setPageSlug}
                  isPublished={isPublished} setIsPublished={setIsPublished}
                />
              ) : (
                <>
                  <div style={{ padding:'24px 16px 8px', textAlign:'center' }}>
                    <div style={{ width:44, height:44, borderRadius:12, background:C.blueLight, border:`1.5px dashed ${C.blue}`, display:'flex', alignItems:'center', justifyContent:'center', color:C.blue, margin:'0 auto 10px' }}>{Icons.settings}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#6B7280', marginBottom:4 }}>No block selected</div>
                    <div style={{ fontSize:11, color:C.muted, lineHeight:1.6 }}>Click any block on the canvas to edit its settings here</div>
                  </div>
                  <div style={S.divider} />
                  <PropsPanel
                    block={null} onChange={() => {}}
                    pageTitle={pageTitle} setPageTitle={setPageTitle}
                    pageSlug={pageSlug} setPageSlug={setPageSlug}
                    isPublished={isPublished} setIsPublished={setIsPublished}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={{ duration:150, easing:'ease' }}>
        {activeLib && <GhostCard lib={activeLib} />}
        {activeCanvas && <GhostCard lib={getLib(activeCanvas.type)} />}
      </DragOverlay>

      {toast && <Toast msg={toast.msg} type={toast.type} />}
    </DndContext>
  );
}
