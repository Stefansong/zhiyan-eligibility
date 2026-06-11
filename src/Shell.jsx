/* ============================================================
   Shell.jsx — 侧边导航（项目切换器 + 个人资料）+ 顶栏
   ============================================================ */
import React from 'react';
import { Icon } from './icons.jsx';

export const NAV = [
  { id: 'dashboard', label: '受试者队列', icon: 'dashboard', en: 'Cohort' },
  { id: 'intake',    label: '病史上传 · 解析', icon: 'upload', en: 'Intake' },
  { id: 'protocol',  label: '方案 · 入排标准', icon: 'anchor', en: 'Protocol' },
  { id: 'review',    label: '入排比对审核', icon: 'compare', en: 'Review', badge: true },
  { id: 'report',    label: '审核意见报告', icon: 'report', en: 'Report' },
];

function TrialSwitcher({ trial, trials, onSwitch, onNew }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  const reviewCount = (t) => t.cohort.filter(p => p.status === 'review').length;

  return (
    <div ref={ref} style={{ position: 'relative', padding: '0 12px 10px' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 12px', borderRadius: 10,
        border: `1px solid ${open ? 'var(--primary)' : 'var(--line)'}`, background: open ? 'var(--primary-tint)' : 'var(--surface-2)',
        fontFamily: 'var(--font-sans)', transition: 'all .14s', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--primary-700)', whiteSpace: 'nowrap' }}>{trial.id}</span>
            <span className="chip" style={{ padding: '1px 6px', fontSize: 9.5 }}>{trial.phase}</span>
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-600)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trial.shortTitle}</div>
        </div>
        <Icon name="chevronDown" size={14} style={{ color: 'var(--ink-400)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% - 4px)', left: 12, right: -226, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)', padding: 5, animation: 'fadeUp .14s' }}>
          <div className="kicker" style={{ padding: '8px 11px 6px' }}>我负责的项目 · {trials.length}</div>
          {trials.map(t => {
            const active = t.tid === trial.tid;
            const rc = reviewCount(t);
            return (
              <button key={t.tid} onClick={() => { onSwitch(t.tid); setOpen(false); }} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer', padding: '10px 11px', borderRadius: 8, border: 'none',
                background: active ? 'var(--primary-tint)' : 'transparent', fontFamily: 'var(--font-sans)',
                display: 'flex', gap: 10, alignItems: 'flex-start',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ width: 16, display: 'grid', placeItems: 'center', color: 'var(--primary)', paddingTop: 2 }}>
                  {active && <Icon name="check" size={14} stroke={2.4} />}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span className="mono" style={{ fontSize: 11.5, fontWeight: 600, color: active ? 'var(--primary-700)' : 'var(--ink-700)', whiteSpace: 'nowrap' }}>{t.id}</span>
                    <span className="chip" style={{ padding: '1px 6px', fontSize: 9.5 }}>{t.phase}</span>
                    {rc > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', borderRadius: 100, padding: '1px 6px' }}>待复核 {rc}</span>}
                  </span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-600)', marginTop: 3, lineHeight: 1.4 }}>{t.shortTitle}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <span style={{ flex: 1, maxWidth: 150, height: 4, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${Math.round(t.progress.enrolled / t.progress.target * 100)}%`, background: 'var(--primary)', borderRadius: 3 }} />
                    </span>
                    <span className="mono" style={{ fontSize: 10.5, color: 'var(--ink-400)' }}>入组 {t.progress.enrolled}/{t.progress.target}</span>
                  </span>
                </span>
              </button>
            );
          })}
          <div className="divider" style={{ margin: '5px 4px' }} />
          <button onClick={() => { setOpen(false); onNew(); }}
            style={{ width: '100%', textAlign: 'left', cursor: 'pointer', padding: '9px 11px', borderRadius: 8, border: 'none',
            background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: 500, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
            <Icon name="plus" size={14} />新建项目（上传研究方案）
          </button>
        </div>
      )}
    </div>
  );
}

export function Sidebar({ route, setRoute, trial, trials, onSwitchTrial, onNewTrial }) {
  const reviewBadge = trial.cohort.filter(p => p.status === 'review').length;
  return (
    <aside style={{
      width: 234, flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* brand */}
      <div style={{ padding: '20px 18px 16px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: 'var(--primary)', color: '#fff',
          display: 'grid', placeItems: 'center', flexShrink: 0, boxShadow: 'var(--shadow-sm)',
        }}>
          <Icon name="anchor" size={19} stroke={1.9} />
        </div>
        <div style={{ lineHeight: 1.25 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, letterSpacing: '-.01em' }}>智研入排</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-400)', fontWeight: 500, letterSpacing: '.04em' }}>ELIGIBILITY · AI</div>
        </div>
      </div>

      {/* 项目切换器 */}
      <TrialSwitcher trial={trial} trials={trials} onSwitch={onSwitchTrial} onNew={onNewTrial} />

      <div style={{ padding: '4px 12px 0', flex: 1, overflowY: 'auto' }}>
        <div className="kicker" style={{ padding: '12px 10px 8px' }}>审核流程</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV.map((n, i) => {
            const active = route === n.id;
            return (
              <button key={n.id} onClick={() => setRoute(n.id)} style={{
                display: 'flex', alignItems: 'center', gap: 11, padding: '10px 11px', borderRadius: 8,
                border: 'none', cursor: 'pointer', textAlign: 'left', position: 'relative',
                background: active ? 'var(--primary-tint)' : 'transparent',
                color: active ? 'var(--primary-700)' : 'var(--ink-600)',
                fontFamily: 'var(--font-sans)', fontSize: 13.5, fontWeight: active ? 600 : 500,
                transition: 'background .14s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{
                  position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 3,
                  background: active ? 'var(--primary)' : 'transparent',
                }} />
                <span style={{ width: 22, display: 'grid', placeItems: 'center', flexShrink: 0,
                  fontSize: 10, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--ink-300)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Icon name={n.icon} size={17} />
                <span style={{ flex: 1 }}>{n.label}</span>
                {n.badge && reviewBadge > 0 && <span style={{
                  fontSize: 10.5, fontWeight: 600, color: 'var(--warn)', background: 'var(--warn-bg)',
                  border: '1px solid var(--warn-line)', borderRadius: 100, padding: '1px 6px',
                }}>{reviewBadge}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* user footer */}
      <UserProfile trialCount={trials.length} />
    </aside>
  );
}

/* 可编辑的个人资料（持久化到 localStorage） */
export const PROFILE_KEY = 'zhiyan_profile_v1';
export const PROFILE_DEFAULT = { name: '陈医生', role: '医学经理 · CRP', org: '泽新生物医药 · 医学部' };

export function loadProfile() {
  try {
    const s = localStorage.getItem(PROFILE_KEY);
    return s ? { ...PROFILE_DEFAULT, ...JSON.parse(s) } : PROFILE_DEFAULT;
  } catch (e) { return PROFILE_DEFAULT; }
}

function UserProfile({ trialCount }) {
  const [profile, setProfile] = React.useState(loadProfile);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(profile);
  const ref = React.useRef(null);

  React.useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const startEdit = () => { setDraft(profile); setOpen(o => !o); };
  const save = () => {
    const clean = { name: draft.name.trim() || PROFILE_DEFAULT.name, role: draft.role.trim(), org: draft.org.trim() };
    setProfile(clean);
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(clean)); } catch (e) { /* 隐私模式下不持久化 */ }
    setOpen(false);
  };
  const initial = (profile.name || '医').trim()[0];

  const renderField = ({ label, k, placeholder }) => (
    <label key={k} style={{ display: 'block', marginBottom: 10 }}>
      <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: 'var(--ink-400)', marginBottom: 4 }}>{label}</span>
      <input value={draft[k]} placeholder={placeholder}
        onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))}
        onKeyDown={e => { if (e.key === 'Enter') save(); }}
        style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line-strong)',
          fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-900)', outline: 'none', background: 'var(--surface)', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = 'var(--primary)'}
        onBlur={e => e.target.style.borderColor = 'var(--line-strong)'} />
    </label>
  );

  return (
    <div ref={ref} style={{ position: 'relative', padding: 12, borderTop: '1px solid var(--line)' }}>
      {open && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 2px)', left: 10, width: 252, zIndex: 55,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow-lg)',
          padding: 16, animation: 'fadeUp .14s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--primary)', color: '#fff',
              display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 600 }}>{(draft.name || '医').trim()[0]}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>个人资料</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-400)' }}>显示在审核轨迹与意见书签名栏</div>
            </div>
          </div>
          {renderField({ label: '姓名', k: 'name', placeholder: '如：陈医生' })}
          {renderField({ label: '职务 / 角色', k: 'role', placeholder: '如：医学经理 · CRP' })}
          {renderField({ label: '所属机构', k: 'org', placeholder: '如：泽新生物医药 · 医学部' })}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn sm" style={{ flex: 1 }} onClick={() => setOpen(false)}>取消</button>
            <button className="btn primary sm" style={{ flex: 1 }} onClick={save}><Icon name="check" size={14} stroke={2.4} />保存</button>
          </div>
        </div>
      )}

      <button onClick={startEdit} style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '6px 6px', borderRadius: 9,
        border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)',
        background: open ? 'var(--surface-2)' : 'transparent', transition: 'background .12s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
      onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8, background: 'var(--primary-50)', color: 'var(--primary-700)',
          display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 600, flexShrink: 0,
        }}>{initial}</div>
        <div style={{ lineHeight: 1.3, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.name}</div>
          <div style={{ fontSize: 10.5, color: 'var(--ink-400)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.role} · 负责 {trialCount} 个项目</div>
        </div>
        <Icon name="edit" size={14} style={{ color: 'var(--ink-300)', flexShrink: 0 }} />
      </button>
    </div>
  );
}

export function TopBar({ title, subtitle, right }) {
  return (
    <header style={{
      height: 60, flexShrink: 0, background: 'rgba(255,255,255,.82)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', gap: 16, padding: '0 26px',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, letterSpacing: '-.01em' }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 1 }}>{subtitle}</div>}
      </div>
      {right}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button className="btn ghost sm" style={{ padding: 8 }}><Icon name="bell" size={18} /></button>
        <button className="btn ghost sm" style={{ padding: 8 }}><Icon name="settings" size={18} /></button>
      </div>
    </header>
  );
}
