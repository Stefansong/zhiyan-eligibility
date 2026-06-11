/* ============================================================
   icons.jsx — 线性图标集（1.6 stroke，医疗克制风）+ 共享原子
   ============================================================ */

export function Icon({ name, size = 18, stroke = 1.6, style }) {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: stroke, strokeLinecap: 'round', strokeLinejoin: 'round' };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7" height="9" rx="1.5" {...p}/><rect x="14" y="3" width="7" height="5" rx="1.5" {...p}/><rect x="14" y="12" width="7" height="9" rx="1.5" {...p}/><rect x="3" y="16" width="7" height="5" rx="1.5" {...p}/></>,
    upload: <><path d="M12 16V4M12 4l-4 4M12 4l4 4" {...p}/><path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" {...p}/></>,
    document: <><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" {...p}/><path d="M14 3v5h5" {...p}/></>,
    compare: <><path d="M12 3v18" {...p}/><path d="M7 8l-3 3 3 3M17 8l3 3-3 3" {...p}/></>,
    report: <><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" {...p}/><path d="M14 3v5h5M8.5 13h7M8.5 16.5h4.5" {...p}/></>,
    check: <path d="M4 12.5l5 5L20 6.5" {...p}/>,
    x: <path d="M6 6l12 12M18 6L6 18" {...p}/>,
    alert: <><path d="M12 8v5" {...p}/><circle cx="12" cy="16.5" r=".4" fill="currentColor" stroke="none"/><path d="M10.3 4l-7 12.5A1.6 1.6 0 004.7 19h14.6a1.6 1.6 0 001.4-2.5L13.7 4a1.6 1.6 0 00-3.4 0z" {...p}/></>,
    chevron: <path d="M9 6l6 6-6 6" {...p}/>,
    chevronDown: <path d="M6 9l6 6 6-6" {...p}/>,
    search: <><circle cx="11" cy="11" r="7" {...p}/><path d="M20 20l-3.5-3.5" {...p}/></>,
    plus: <path d="M12 5v14M5 12h14" {...p}/>,
    filter: <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" {...p}/>,
    bell: <><path d="M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8" {...p}/><path d="M13.7 21a2 2 0 01-3.4 0" {...p}/></>,
    'file-note': <><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z" {...p}/><path d="M14 3v5h5M9 13h6M9 16.5h4" {...p}/></>,
    sheet: <><rect x="3" y="4" width="18" height="16" rx="2" {...p}/><path d="M3 9.5h18M9 9.5V20M15 9.5V20M3 14.75h18" {...p}/></>,
    flask: <><path d="M9 3h6M10 3v6l-4.5 8a2 2 0 001.8 3h9.4a2 2 0 001.8-3L14 9V3" {...p}/><path d="M7.5 15h9" {...p}/></>,
    activity: <path d="M3 12h4l2.5-7 5 14 2.5-7H22" {...p}/>,
    pill: <><rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-45 12 12)" {...p}/><path d="M8.5 8.5l7 7" {...p}/></>,
    link: <><path d="M9 15l6-6" {...p}/><path d="M10 6l1-1a3.5 3.5 0 015 5l-1 1M14 18l-1 1a3.5 3.5 0 01-5-5l1-1" {...p}/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" {...p}/><circle cx="12" cy="12" r="2.5" {...p}/></>,
    download: <><path d="M12 4v12M12 16l-4-4M12 16l4-4" {...p}/><path d="M4 18v1a2 2 0 002 2h12a2 2 0 002-2v-1" {...p}/></>,
    sparkle: <><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" {...p}/><path d="M19 14l.7 2 2 .7-2 .7L19 19.4l-.7-2-2-.7 2-.7z" {...p}/></>,
    user: <><circle cx="12" cy="8" r="4" {...p}/><path d="M4 20a8 8 0 0116 0" {...p}/></>,
    clock: <><circle cx="12" cy="12" r="9" {...p}/><path d="M12 7v5l3 2" {...p}/></>,
    edit: <><path d="M4 20h4L19 9l-4-4L4 16v4z" {...p}/><path d="M14 6l4 4" {...p}/></>,
    settings: <><circle cx="12" cy="12" r="3" {...p}/><path d="M12 2v3M12 19v3M5 5l2 2M17 17l2 2M2 12h3M19 12h3M5 19l2-2M17 7l2-2" {...p}/></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="1.5" {...p}/><rect x="13" y="3" width="8" height="8" rx="1.5" {...p}/><rect x="3" y="13" width="8" height="8" rx="1.5" {...p}/><rect x="13" y="13" width="8" height="8" rx="1.5" {...p}/></>,
    anchor: <><circle cx="12" cy="5" r="2.2" {...p}/><path d="M12 7.2V21M5 13a7 7 0 0014 0M5 13H3M19 13h2" {...p}/></>,
    refresh: <><path d="M20 11a8 8 0 10-1.5 5" {...p}/><path d="M20 5v6h-6" {...p}/></>,
    zoomIn: <><circle cx="11" cy="11" r="7" {...p}/><path d="M20 20l-3.5-3.5M11 8v6M8 11h6" {...p}/></>,
    print: <><path d="M6 9V3h12v6M6 18H4a1 1 0 01-1-1v-5a2 2 0 012-2h14a2 2 0 012 2v5a1 1 0 01-1 1h-2" {...p}/><rect x="6" y="14" width="12" height="7" rx="1" {...p}/></>,
    rows: <><rect x="3" y="4" width="18" height="4.5" rx="1.5" {...p}/><rect x="3" y="11" width="18" height="4.5" rx="1.5" {...p}/><path d="M3 19.5h18" {...p}/></>,
    columns: <><rect x="3" y="3" width="8" height="18" rx="1.5" {...p}/><rect x="13" y="3" width="8" height="18" rx="1.5" {...p}/></>,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">{paths[name] || null}</svg>
  );
}

/* 三态徽标（圆点/图标） */
export const STATUS_META = {
  ok:   { label: '符合',  cls: 'ok',   color: 'var(--ok)',   icon: 'check' },
  no:   { label: '不符合', cls: 'no',   color: 'var(--no)',   icon: 'x' },
  warn: { label: '存疑',  cls: 'warn', color: 'var(--warn)', icon: 'alert' },
  idle: { label: '待评估', cls: 'idle', color: 'var(--ink-500)', icon: 'clock' },
};

export function StatusPill({ v, withIcon = true, children }) {
  const m = STATUS_META[v] || STATUS_META.idle;
  return (
    <span className={`status-pill ${m.cls}`}>
      {withIcon && <Icon name={m.icon} size={13} stroke={2.2} />}
      {children || m.label}
    </span>
  );
}

/* 置信度条 */
export function Confidence({ value }) {
  const pct = Math.round(value * 100);
  const color = value >= 0.85 ? 'var(--ok)' : value >= 0.7 ? 'var(--warn)' : 'var(--no)';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} title={`AI 置信度 ${pct}%`}>
      <span style={{ width: 34, height: 4, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden', display: 'inline-block' }}>
        <span style={{ display: 'block', height: '100%', width: pct + '%', background: color, borderRadius: 3 }} />
      </span>
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-400)' }}>{pct}%</span>
    </span>
  );
}
