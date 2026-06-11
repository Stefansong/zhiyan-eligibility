/* ============================================================
   Review.jsx — 逐条入排比对审核（核心 · 真实流程）
   · AI 逐条判定（证据 + 原文出处 + 置信度），结果持久化
   · 人工可改判（符合/存疑/不符合），自动保存
   · 结论呈现样式可切换: rows 色块行 | cards 卡片网格 | split 双栏
   ============================================================ */
import React from 'react';
import { Icon, Confidence, STATUS_META } from './icons.jsx';
import { api, toast } from './api.js';
import { useSimProgress, ProgressBanner } from './ui.jsx';

/* ---- 顶部受试者 + 总判定横幅 ---- */
function VerdictBanner({ patient, tally, reviewedAt }) {
  const verdict = tally.no > 0 ? 'fail' : tally.warn > 0 ? 'review' : 'pass';
  const meta = {
    pass:   { label: '符合入组标准', cls: 'ok',   icon: 'check', desc: '全部入排条件满足，可提交研究者签字后随机化。' },
    review: { label: '待人工复核',   cls: 'warn', icon: 'alert', desc: `${tally.warn} 项存疑需医学经理裁定，${tally.no ? tally.no + ' 项不符合，' : ''}暂不可入组。` },
    fail:   { label: '不符合入组',   cls: 'no',   icon: 'x',     desc: `${tally.no} 项硬性标准不满足，建议筛选失败。` },
  }[verdict];
  const c = { ok: 'var(--ok)', warn: 'var(--warn)', no: 'var(--no)' }[meta.cls];
  const bg = { ok: 'var(--ok-bg)', warn: 'var(--warn-bg)', no: 'var(--no-bg)' }[meta.cls];

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'stretch' }}>
      <div style={{ padding: 'var(--card-pad)', display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 0 }}>
        <div style={{ width: 50, height: 50, borderRadius: 12, background: 'var(--primary-50)', color: 'var(--primary-700)',
          display: 'grid', placeItems: 'center', fontSize: 19, fontWeight: 600, flexShrink: 0 }}>{(patient.initials || '受').replace(/\s/g, '')[0]}</div>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 600 }}>{patient.initials}</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-400)' }}>{patient.code}</span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <span>{patient.sex} · {patient.age} 岁</span><span>·</span>
            <span>{patient.siteFull || patient.site}</span><span>·</span>
            <span className="mono">审核于 {reviewedAt}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '0 8px', borderLeft: '1px solid var(--line)' }}>
        {[['符合', tally.ok, 'var(--ok)'], ['存疑', tally.warn, 'var(--warn)'], ['不符', tally.no, 'var(--no)']].map(([l, n, col]) => (
          <div key={l} style={{ textAlign: 'center', padding: '0 16px' }}>
            <div className="mono" style={{ fontSize: 24, fontWeight: 600, color: n ? col : 'var(--ink-300)' }}>{n}</div>
            <div style={{ fontSize: 11, color: 'var(--ink-400)' }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ width: 248, flexShrink: 0, padding: 'var(--card-pad)', background: bg, borderLeft: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 26, height: 26, borderRadius: 7, background: c, color: '#fff', display: 'grid', placeItems: 'center' }}>
            <Icon name={meta.icon} size={15} stroke={2.4} />
          </span>
          <span style={{ fontSize: 15.5, fontWeight: 700, color: c }}>{meta.label}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-600)', lineHeight: 1.5 }}>{meta.desc}</div>
      </div>
    </div>
  );
}

/* ---- 审核未运行时的启动卡 ---- */
function ReviewGate({ patient, trial, onRun, running, progress, goIntake, goProtocol, apiKeyReady }) {
  const ready = trial.anchored && (patient.fields || []).length > 0;
  const steps = [
    { ok: (patient.docs || []).length > 0, label: '上传病历资料', action: goIntake, btn: '去上传' },
    { ok: (patient.fields || []).length > 0, label: 'AI 结构化解析', action: goIntake, btn: '去解析' },
    { ok: !!trial.anchored, label: '方案入排标准已锚定', action: goProtocol, btn: '去锚定' },
  ];
  return (
    <div className="card" style={{ padding: '46px 30px', textAlign: 'center', animation: 'fadeUp .3s' }}>
      <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 14, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
        <Icon name="compare" size={26} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{patient.initials} · {patient.code} 尚未运行入排审核</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.6, maxWidth: 480, margin: '0 auto 18px' }}>
        AI 将逐条比对受试者证据与方案 {trial.criteria.length} 条入排标准，每条结论附原文出处与置信度，供人工复核改判。
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxWidth: 360, margin: '0 auto 22px', textAlign: 'left' }}>
        {steps.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 12.5, color: s.ok ? 'var(--ink-600)' : 'var(--warn)' }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: s.ok ? 'var(--ok-bg)' : 'var(--warn-bg)',
              color: s.ok ? 'var(--ok)' : 'var(--warn)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name={s.ok ? 'check' : 'alert'} size={12} stroke={2.4} />
            </span>
            <span style={{ flex: 1 }}>{s.label}</span>
            {!s.ok && <button className="btn ghost sm" style={{ color: 'var(--primary)', padding: '3px 8px' }} onClick={s.action}>{s.btn} →</button>}
          </div>
        ))}
      </div>
      {running ? (
        <div style={{ maxWidth: 420, margin: '0 auto', textAlign: 'left', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
          <ProgressBanner label={`AI 正在逐条比对 ${trial.criteria.length} 条标准（约 1–3 分钟）…`} progress={progress} />
        </div>
      ) : (
        <button className="btn primary" onClick={onRun} disabled={!ready || !apiKeyReady}
          title={!apiKeyReady ? '未配置 DEEPSEEK_API_KEY' : !ready ? '请先完成上方准备步骤' : ''}>
          <Icon name="sparkle" size={16} />开始智能审核
        </button>
      )}
    </div>
  );
}

export function Review({ trial, patient, onPatientUpdate, openSource, apiKeyReady, goIntake, goProtocol }) {
  const review = patient.review;
  const [decisions, setDecisions] = React.useState((review && review.decisions) || {});
  const [expanded, setExpanded] = React.useState({});
  const [filter, setFilter] = React.useState('all');
  const [style, setStyle] = React.useState('rows');
  const prog = useSimProgress();
  const saveTimer = React.useRef(null);

  React.useEffect(() => { setDecisions((patient.review && patient.review.decisions) || {}); setFilter('all'); }, [patient.pid]);

  /* 审核所依据的标准（运行时快照，避免方案后续变更造成错位） */
  const criteria = (review && review.criteriaSnapshot) || trial.criteria;
  const results = review ? review.results : {};
  const items = criteria.filter(c => results[c.id]);

  const docById = (id) => (patient.docs || []).find(d => d.id === id) || null;
  const vOf = (id) => decisions[id] || (results[id] && results[id].verdict) || 'warn';

  const persist = (next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await api.saveDecisions(patient.pid, next); } catch (e) { toast(`改判保存失败：${e.message}`, 'no'); }
    }, 500);
  };
  const decide = (id, v) => {
    setDecisions(d => {
      const next = { ...d };
      if (next[id] === v) delete next[id]; else next[id] = v;
      persist(next);
      return next;
    });
  };
  const adoptAll = () => {
    setDecisions(() => { persist({}); return {}; });
    toast('已采纳 AI 全部判定（清除人工改判）', 'ok');
  };
  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  const runReview = async () => {
    try {
      const updated = await prog.run(api.runReview(patient.pid));
      onPatientUpdate(updated);
      const t = Object.values(updated.review.results).map(r => r.verdict);
      toast(`审核完成：符合 ${t.filter(v => v === 'ok').length} · 存疑 ${t.filter(v => v === 'warn').length} · 不符合 ${t.filter(v => v === 'no').length}`, 'ok');
    } catch (e) { toast(e.message, 'no'); }
  };

  if (!review) {
    return <ReviewGate patient={patient} trial={trial} onRun={runReview} running={prog.running}
      progress={prog.progress} goIntake={goIntake} goProtocol={goProtocol} apiKeyReady={apiKeyReady} />;
  }

  const openEvidence = (c) => {
    const r = results[c.id];
    const d = docById(r.doc);
    if (!d) return;
    openSource(d, `${c.no || c.id} · ${c.cat || ''}`, r.evidence || r.basis);
  };

  const tally = items.reduce((a, c) => { a[vOf(c.id)] = (a[vOf(c.id)] || 0) + 1; return a; }, { ok: 0, warn: 0, no: 0 });
  const visible = items.filter(c => filter === 'all' || vOf(c.id) === filter);

  const filterTabs = [
    { id: 'all', label: '全部标准', n: items.length },
    { id: 'warn', label: '存疑', n: tally.warn, col: 'var(--warn)' },
    { id: 'no', label: '不符合', n: tally.no, col: 'var(--no)' },
    { id: 'ok', label: '符合', n: tally.ok, col: 'var(--ok)' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)', animation: 'fadeUp .3s' }}>
      <VerdictBanner patient={patient} tally={tally} reviewedAt={review.reviewedAt} />

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* toolbar */}
        <div style={{ padding: '12px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 9, border: '1px solid var(--line)' }}>
            {filterTabs.map(t => (
              <button key={t.id} onClick={() => setFilter(t.id)} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 12.5, fontWeight: filter === t.id ? 600 : 500,
                background: filter === t.id ? 'var(--surface)' : 'transparent', color: filter === t.id ? 'var(--ink-900)' : 'var(--ink-500)',
                boxShadow: filter === t.id ? 'var(--shadow-sm)' : 'none' }}>
                {t.col && <span style={{ width: 7, height: 7, borderRadius: '50%', background: t.n ? t.col : 'var(--ink-300)' }} />}
                {t.label}<span className="mono" style={{ fontSize: 11, color: 'var(--ink-400)' }}>{t.n}</span>
              </button>
            ))}
          </div>
          <StyleSwitch value={style} onChange={setStyle} />
          <div style={{ flex: 1 }} />
          <button className="btn ghost sm" onClick={runReview} disabled={prog.running || !apiKeyReady}>
            <Icon name="refresh" size={14} />{prog.running ? '审核中…' : '重新审核'}
          </button>
          <button className="btn ghost sm" onClick={() => setExpanded(Object.fromEntries(items.map(c => [c.id, true])))}>展开全部依据</button>
          <button className="btn sm" onClick={adoptAll}>
            <Icon name="check" size={14} />采纳 AI 全部判定
          </button>
        </div>

        {prog.running && <ProgressBanner label="AI 正在逐条比对，请稍候…" progress={prog.progress} />}

        {/* body — switches by conclusion style */}
        {style === 'cards'
          ? <CardsView items={visible} results={results} vOf={vOf} openEvidence={openEvidence} docById={docById} />
          : style === 'split'
          ? <SplitView items={visible} results={results} vOf={vOf} openEvidence={openEvidence} docById={docById} />
          : <div>
              {visible.map(c => (
                <CriterionRow key={c.id} c={c} ev={results[c.id]} decision={decisions[c.id]}
                  onDecide={decide} openEvidence={openEvidence} hasDoc={!!docById(results[c.id].doc)}
                  expanded={!!expanded[c.id]} onToggle={() => toggle(c.id)} />
              ))}
            </div>}

        {visible.length === 0 && (
          <div style={{ padding: 50, textAlign: 'center', color: 'var(--ink-400)' }}>
            <Icon name="check" size={28} style={{ color: 'var(--ok)' }} /><div style={{ marginTop: 8, fontSize: 13 }}>该分类下暂无标准</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---- 单条标准（可改判 + 出处） ---- */
function CriterionRow({ c, ev, decision, onDecide, openEvidence, hasDoc, expanded, onToggle }) {
  const v = decision || ev.verdict;
  const m = STATUS_META[v];
  const c0 = m.color;
  const bg = { ok: 'var(--ok-bg)', no: 'var(--no-bg)', warn: 'var(--warn-bg)', idle: 'var(--surface-2)' }[m.cls];
  const line = { ok: 'var(--ok-line)', no: 'var(--no-line)', warn: 'var(--warn-line)', idle: 'var(--line)' }[m.cls];
  const overridden = decision && decision !== ev.verdict;

  return (
    <div style={{ borderBottom: '1px solid var(--line)', background: v === 'warn' || v === 'no' ? `color-mix(in srgb, ${bg} 40%, transparent)` : 'transparent', transition: 'background .2s' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, paddingTop: 1 }}>
          <span style={{ width: 26, height: 26, borderRadius: '50%', background: bg, color: c0, border: `1.5px solid ${line}`,
            display: 'grid', placeItems: 'center' }}><Icon name={m.icon} size={14} stroke={2.4} /></span>
          <span className="mono" style={{ fontSize: 10.5, fontWeight: 600, color: c.type === 'in' ? 'var(--ok)' : 'var(--no)' }}>{c.id}</span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)', lineHeight: 1.45 }}>{c.text}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>受试者：</span>
              <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: c0, whiteSpace: 'nowrap' }}>{ev.value}</span>
            </span>
            <Confidence value={ev.conf} />
            {overridden && <span className="chip" style={{ padding: '2px 8px', fontSize: 10.5, color: 'var(--info)', background: 'var(--info-bg)', border: 'none' }}>
              <Icon name="edit" size={11} />人工改判
            </span>}
            <button onClick={onToggle} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--ink-500)', fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 500 }}>
              {expanded ? '收起依据' : 'AI 判定依据'}
              <Icon name={expanded ? 'chevronDown' : 'chevron'} size={13} />
            </button>
          </div>

          {expanded && (
            <div style={{ marginTop: 10, padding: '11px 13px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, animation: 'fadeUp .2s' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Icon name="sparkle" size={14} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 12.5, color: 'var(--ink-700)', lineHeight: 1.6 }}>{ev.basis}</p>
              </div>
              {ev.evidence && (
                <div style={{ marginTop: 9, fontSize: 12, color: 'var(--ink-600)', background: 'var(--surface-2)', borderLeft: '2.5px solid var(--warn)', padding: '7px 11px', borderRadius: '0 6px 6px 0', lineHeight: 1.55 }}>
                  原文：「{ev.evidence}」
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 11, paddingTop: 10, borderTop: '1px dashed var(--line)' }}>
                <button onClick={() => hasDoc && openEvidence(c)} disabled={!hasDoc} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7,
                  border: `1px solid ${hasDoc ? 'var(--primary-50)' : 'var(--line)'}`, background: hasDoc ? 'var(--primary-tint)' : 'var(--surface-2)',
                  cursor: hasDoc ? 'pointer' : 'not-allowed', color: hasDoc ? 'var(--primary-700)' : 'var(--ink-400)',
                  fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600 }}>
                  <Icon name="link" size={13} />{hasDoc ? '查看原文出处' : '无原始记录（待补充材料）'}
                </button>
                {hasDoc && <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>点击在原始病历中定位核验</span>}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
            <span style={{ fontSize: 11, color: 'var(--ink-400)' }}>人工裁定：</span>
            {['ok', 'warn', 'no'].map(opt => {
              const om = STATUS_META[opt]; const active = v === opt;
              const oc = om.color;
              return (
                <button key={opt} onClick={() => onDecide(c.id, opt)} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)', fontSize: 11.5, fontWeight: 600, transition: 'all .12s',
                  border: `1px solid ${active ? oc : 'var(--line-strong)'}`,
                  background: active ? oc : 'var(--surface)', color: active ? '#fff' : 'var(--ink-500)',
                }}>
                  <Icon name={om.icon} size={12} stroke={2.4} />{om.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- 结论呈现样式切换 ---- */
const STYLE_OPTS = [
  { id: 'rows', label: '色块行', icon: 'rows' },
  { id: 'cards', label: '卡片', icon: 'grid' },
  { id: 'split', label: '双栏', icon: 'columns' },
];

function StyleSwitch({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 9, border: '1px solid var(--line)' }}
      title="结论呈现样式：色块行 / 卡片网格 / 标准·证据双栏">
      {STYLE_OPTS.map(o => {
        const active = value === o.id;
        return (
          <button key={o.id} onClick={() => onChange(o.id)} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: active ? 600 : 500,
            background: active ? 'var(--surface)' : 'transparent', color: active ? 'var(--primary-700)' : 'var(--ink-500)',
            boxShadow: active ? 'var(--shadow-sm)' : 'none', transition: 'all .14s',
          }}>
            <Icon name={o.icon} size={13} />{o.label}
          </button>
        );
      })}
    </div>
  );
}

/* ---- 样式 B：卡片网格 ---- */
function CardsView({ items, results, vOf, openEvidence, docById }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14, padding: 18 }}>
      {items.map(c => {
        const ev = results[c.id]; const v = vOf(c.id); const m = STATUS_META[v]; const col = m.color;
        const bg = { ok: 'var(--ok-bg)', no: 'var(--no-bg)', warn: 'var(--warn-bg)' }[m.cls];
        const line = { ok: 'var(--ok-line)', no: 'var(--no-line)', warn: 'var(--warn-line)' }[m.cls];
        const hasDoc = !!docById(ev.doc);
        return (
          <div key={c.id} style={{ border: `1px solid ${line}`, borderRadius: 11, overflow: 'hidden', background: 'var(--surface)' }}>
            <div style={{ padding: '10px 13px', background: bg, display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${line}` }}>
              <Icon name={m.icon} size={15} stroke={2.4} style={{ color: col }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: col }}>{m.label}</span>
              <span className="mono" style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: c.type === 'in' ? 'var(--ok)' : 'var(--no)' }}>{c.id}</span>
            </div>
            <div style={{ padding: 13 }}>
              <div style={{ fontSize: 12.5, color: 'var(--ink-800)', lineHeight: 1.5, minHeight: 36 }}>{c.text}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0' }}>
                <span className="mono" style={{ fontSize: 14, fontWeight: 600, color: col }}>{ev.value}</span>
                <Confidence value={ev.conf} />
              </div>
              <p style={{ margin: '0 0 10px', fontSize: 11.5, color: 'var(--ink-500)', lineHeight: 1.55 }}>{ev.basis}</p>
              <button onClick={() => hasDoc && openEvidence(c)} disabled={!hasDoc} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'transparent',
                cursor: hasDoc ? 'pointer' : 'default', color: hasDoc ? 'var(--primary)' : 'var(--ink-300)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600 }}>
                <Icon name="link" size={12} />{hasDoc ? '原文出处' : '无记录'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- 样式 C：标准 | 证据 双栏对照 ---- */
function SplitView({ items, results, vOf, openEvidence, docById }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, padding: '10px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
        <div className="kicker">方案标准要求</div>
        <div className="kicker">受试者证据 · 判定</div>
      </div>
      {items.map(c => {
        const ev = results[c.id]; const v = vOf(c.id); const m = STATUS_META[v]; const col = m.color;
        const bg = { ok: 'var(--ok-bg)', no: 'var(--no-bg)', warn: 'var(--warn-bg)' }[m.cls];
        const hasDoc = !!docById(ev.doc);
        return (
          <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid var(--line)' }}>
            <div style={{ padding: '14px 20px', borderRight: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: c.type === 'in' ? 'var(--ok)' : 'var(--no)' }}>{c.id}</span>
                <span className="chip" style={{ padding: '1px 7px', fontSize: 10 }}>{c.cat}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-800)', lineHeight: 1.5 }}>{c.text}</div>
            </div>
            <div style={{ padding: '14px 20px', background: v !== 'ok' ? `color-mix(in srgb, ${bg} 33%, transparent)` : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <Icon name={m.icon} size={15} stroke={2.4} style={{ color: col }} />
                <span style={{ fontSize: 12.5, fontWeight: 700, color: col }}>{m.label}</span>
                <span className="mono" style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-700)' }}>· {ev.value}</span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.55 }}>{ev.basis}</p>
              <button onClick={() => hasDoc && openEvidence(c)} disabled={!hasDoc} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: 0, border: 'none', background: 'transparent',
                cursor: hasDoc ? 'pointer' : 'default', color: hasDoc ? 'var(--primary)' : 'var(--ink-300)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600 }}>
                <Icon name="link" size={12} />{hasDoc ? '原文出处' : '无记录'}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
