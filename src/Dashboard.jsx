/* ============================================================
   Dashboard.jsx — 受试者队列 / 批量管理仪表盘
   ============================================================ */
import React from 'react';
import { Icon, StatusPill } from './icons.jsx';

export const DASH_STATUS = {
  pass:    { label: '符合入组', cls: 'ok',   dot: 'var(--ok)' },
  fail:    { label: '不符合',   cls: 'no',   dot: 'var(--no)' },
  review:  { label: '待复核',   cls: 'warn', dot: 'var(--warn)' },
  pending: { label: '解析中',   cls: 'idle', dot: 'var(--ink-400)' },
};

function StatCard({ label, value, sub, tone, icon }) {
  const c = { ok: 'var(--ok)', no: 'var(--no)', warn: 'var(--warn)', primary: 'var(--primary)' }[tone] || 'var(--ink-700)';
  const bg = { ok: 'var(--ok-bg)', no: 'var(--no-bg)', warn: 'var(--warn-bg)', primary: 'var(--primary-50)' }[tone] || 'var(--surface-3)';
  return (
    <div className="card" style={{ padding: 'var(--card-pad)', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, color: 'var(--ink-500)', fontWeight: 500 }}>{label}</span>
        <span style={{ width: 30, height: 30, borderRadius: 8, background: bg, color: c, display: 'grid', placeItems: 'center' }}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span className="mono" style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', color: 'var(--ink-900)' }}>{value}</span>
        {sub && <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>{sub}</span>}
      </div>
    </div>
  );
}

export function MatchBar({ ok, warn, no, pct }) {
  const total = ok + warn + no || 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ display: 'flex', width: 88, height: 7, borderRadius: 4, overflow: 'hidden', background: 'var(--surface-3)' }}>
        <span style={{ width: `${ok / total * 100}%`, background: 'var(--ok)' }} />
        <span style={{ width: `${warn / total * 100}%`, background: 'var(--warn)' }} />
        <span style={{ width: `${no / total * 100}%`, background: 'var(--no)' }} />
      </div>
      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-700)' }}>{pct}%</span>
      <span style={{ fontSize: 11, color: 'var(--ink-400)', display: 'flex', gap: 7 }}>
        {warn > 0 && <span style={{ color: 'var(--warn)' }}>存疑 {warn}</span>}
        {no > 0 && <span style={{ color: 'var(--no)' }}>不符 {no}</span>}
      </span>
    </div>
  );
}

export function Dashboard({ openPatient, center = '全部中心', cohort, onNewPatient }) {
  const [filter, setFilter] = React.useState('all');
  const [q, setQ] = React.useState('');

  const inCenter = cohort.filter(p => center === '全部中心' || p.site === center);
  const counts = inCenter.reduce((a, p) => { a[p.status] = (a[p.status] || 0) + 1; return a; }, {});
  const filtered = inCenter.filter(p =>
    (filter === 'all' || p.status === filter) &&
    (q === '' || p.id.toLowerCase().includes(q.toLowerCase()) || p.initials.includes(q))
  );

  const tabs = [
    { id: 'all', label: '全部', n: inCenter.length },
    { id: 'review', label: '待复核', n: counts.review || 0 },
    { id: 'pass', label: '符合入组', n: counts.pass || 0 },
    { id: 'fail', label: '不符合', n: counts.fail || 0 },
    { id: 'pending', label: '解析中', n: counts.pending || 0 },
  ];

  return (
    <div style={{ animation: 'fadeUp .3s' }}>
      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--gap)', marginBottom: 'var(--gap)' }}>
        <StatCard label="累计筛选受试者" value={inCenter.length} sub={center} tone="primary" icon="user" />
        <StatCard label="符合入组" value={counts.pass || 0} sub="可随机化" tone="ok" icon="check" />
        <StatCard label="待人工复核" value={counts.review || 0} sub="存疑项待裁定" tone="warn" icon="alert" />
        <StatCard label="筛选失败" value={counts.fail || 0} sub="不符合标准" tone="no" icon="x" />
      </div>

      {/* table card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        {/* toolbar */}
        <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 9, border: '1px solid var(--line)' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: filter === t.id ? 600 : 500,
                background: filter === t.id ? 'var(--surface)' : 'transparent',
                color: filter === t.id ? 'var(--ink-900)' : 'var(--ink-500)',
                boxShadow: filter === t.id ? 'var(--shadow-sm)' : 'none', transition: 'all .14s',
              }}>
                {t.label}
                <span className="mono" style={{ fontSize: 11, color: filter === t.id ? 'var(--primary)' : 'var(--ink-400)' }}>{t.n}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ position: 'relative', width: 220 }}>
            <Icon name="search" size={15} style={{ position: 'absolute', left: 11, top: 9, color: 'var(--ink-400)' }} />
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="搜索受试者编号 / 姓名缩写"
              style={{ width: '100%', padding: '8px 12px 8px 33px', borderRadius: 8, border: '1px solid var(--line-strong)',
                fontFamily: 'var(--font-sans)', fontSize: 12.5, color: 'var(--ink-900)', background: 'var(--surface)' }} />
          </div>
          <button className="btn sm" onClick={() => window.print()}><Icon name="download" size={15} />导出队列</button>
          <button className="btn primary sm" onClick={onNewPatient}><Icon name="plus" size={15} />新增受试者</button>
        </div>

        {/* table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
                {['受试者', '性别 / 年龄', '中心', '入排符合度', '判定', '更新时间', ''].map((h, i) => (
                  <th key={i} style={{ textAlign: 'left', padding: '11px 18px', fontSize: 11, fontWeight: 600,
                    color: 'var(--ink-400)', textTransform: 'uppercase', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => {
                const m = DASH_STATUS[p.status];
                return (
                  <tr key={p.pid || p.id} onClick={() => openPatient(p)} style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer', transition: 'background .12s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: 'var(--row-pad-y) 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--primary-50)', color: 'var(--primary-700)',
                          display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 600, flexShrink: 0 }}>{p.initials.replace(/\s/g, '')[0]}</div>
                        <div style={{ lineHeight: 1.3 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>{p.initials}</div>
                          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-400)' }}>{p.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="mono" style={{ padding: 'var(--row-pad-y) 18px', fontSize: 12.5, color: 'var(--ink-600)' }}>{p.sex} · {p.age}</td>
                    <td style={{ padding: 'var(--row-pad-y) 18px', fontSize: 12.5, color: 'var(--ink-600)' }}>{p.site}</td>
                    <td style={{ padding: 'var(--row-pad-y) 18px', minWidth: 180 }}>
                      {p.status === 'pending'
                        ? <span style={{ fontSize: 12, color: 'var(--ink-400)' }}>—</span>
                        : <MatchBar ok={p.ok} warn={p.warn} no={p.no} pct={p.pct} />}
                    </td>
                    <td style={{ padding: 'var(--row-pad-y) 18px' }}><StatusPill v={m.cls}>{m.label}</StatusPill></td>
                    <td className="mono" style={{ padding: 'var(--row-pad-y) 18px', fontSize: 11.5, color: 'var(--ink-400)', whiteSpace: 'nowrap' }}>{p.updated}</td>
                    <td style={{ padding: 'var(--row-pad-y) 12px' }}><Icon name="chevron" size={16} style={{ color: 'var(--ink-300)' }} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: '44px 20px', textAlign: 'center', color: 'var(--ink-400)' }}>
              <Icon name="user" size={24} />
              <div style={{ fontSize: 13, marginTop: 8, color: 'var(--ink-500)' }}>该范围内暂无受试者</div>
              <div style={{ fontSize: 11.5, marginTop: 3 }}>点击右上「新增受试者」上传病史资料，开始首例筛选</div>
              <button className="btn primary sm" style={{ marginTop: 14 }} onClick={onNewPatient}>
                <Icon name="plus" size={14} />新增受试者
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
