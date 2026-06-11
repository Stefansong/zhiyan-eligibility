/* ============================================================
   App.jsx — 智研入排 · 智能患者入排系统（本地产品版）
   数据来自本地后端：仪表盘 → 病史解析 → 方案锚定 → 比对审核 → 报告
   ============================================================ */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Icon } from './icons.jsx';
import { api, toast } from './api.js';
import { Sidebar, TopBar } from './Shell.jsx';
import { SourceDrawer } from './SourceViewer.jsx';
import { Dashboard } from './Dashboard.jsx';
import { Intake } from './Intake.jsx';
import { Protocol } from './Protocol.jsx';
import { Review } from './Review.jsx';
import { Report } from './Report.jsx';
import { NewTrialModal, NewPatientModal, Toasts } from './ui.jsx';

const PAGE_META = {
  dashboard: { title: '受试者队列', sub: '集中追踪本中心全部筛选受试者的入排进度与判定' },
  intake:    { title: '病史上传 · 智能解析', sub: '上传病历照片 / PDF / Excel，本地 OCR + AI 实体识别自动结构化' },
  protocol:  { title: '研究方案 · 入排标准', sub: '锚定提取方案入选 / 排除标准并解析为可比对逻辑条件' },
  review:    { title: '入排比对审核', sub: '逐条比对受试者证据与方案标准，每条结论可溯源、可改判' },
  report:    { title: '审核意见报告', sub: '生成标准化、可导出、含原文出处的入排资格审核意见书' },
};

const DEFAULT_CENTERS = ['中心 01', '中心 02', '中心 03'];

function CenterPicker({ value, onChange, cohort, centers, onAddCenter }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const ref = useRef(null);
  const inputRef = useRef(null);
  const list = ['全部中心', ...centers];
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setAdding(false); setName(''); } };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  useEffect(() => { if (adding && inputRef.current) inputRef.current.focus(); }, [adding]);
  const countFor = (c) => c === '全部中心' ? cohort.length : cohort.filter(p => p.site === c).length;
  const submit = () => {
    const v = name.trim();
    if (!v) { setAdding(false); setName(''); return; }
    if (!centers.includes(v)) onAddCenter(v);
    onChange(v); setAdding(false); setName(''); setOpen(false);
  };
  return (
    <div ref={ref} style={{ position: 'relative' }} className="no-print">
      <button onClick={() => setOpen(o => !o)} className="chip" style={{
        padding: '6px 11px', cursor: 'pointer', gap: 8,
        borderColor: open ? 'var(--primary)' : 'var(--line)', background: open ? 'var(--primary-tint)' : 'var(--surface)' }}>
        <span className="dot" style={{ background: 'var(--ok)' }}></span>
        实时同步 · <span style={{ fontWeight: 600, color: 'var(--ink-800)' }}>{value}</span>
        <Icon name="chevronDown" size={13} style={{ color: 'var(--ink-400)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 208, zIndex: 40,
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', overflow: 'hidden', padding: 4, animation: 'fadeUp .14s' }}>
          <div className="kicker" style={{ padding: '7px 10px 5px' }}>切换研究中心</div>
          {list.map(c => {
            const active = c === value;
            return (
              <button key={c} onClick={() => { onChange(c); setOpen(false); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7,
                border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 13,
                fontWeight: active ? 600 : 500, color: active ? 'var(--primary-700)' : 'var(--ink-700)',
                background: active ? 'var(--primary-tint)' : 'transparent' }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--surface-2)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ width: 15, display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
                  {active && <Icon name="check" size={14} stroke={2.4} />}
                </span>
                <span style={{ flex: 1 }}>{c}</span>
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-400)' }}>{countFor(c)}</span>
              </button>
            );
          })}
          <div className="divider" style={{ margin: '4px 4px' }} />
          {adding ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 8px' }}>
              <input ref={inputRef} value={name} onChange={e => setName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setAdding(false); setName(''); } }}
                placeholder="中心名称，如：中心 04 · 瑞金医院"
                style={{ flex: 1, minWidth: 0, padding: '7px 9px', borderRadius: 7, border: '1px solid var(--primary)',
                  fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--ink-900)', outline: 'none', background: 'var(--surface)' }} />
              <button onClick={submit} style={{ border: 'none', background: 'var(--primary)', color: '#fff', borderRadius: 7,
                width: 28, height: 28, display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <Icon name="check" size={14} stroke={2.4} />
              </button>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 7,
              border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 12.5,
              fontWeight: 500, color: 'var(--primary)', background: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <span style={{ width: 15, display: 'grid', placeItems: 'center' }}><Icon name="plus" size={14} stroke={2.2} /></span>
              新增中心
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* 未选择受试者时的引导（intake/review/report 共用） */
export function PatientGate({ trial, label, fullPatients, onSelect, onNew, goQueue }) {
  return (
    <div className="card" style={{ padding: '56px 30px', textAlign: 'center', animation: 'fadeUp .3s' }}>
      <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 14, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
        <Icon name="user" size={26} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{trial.shortTitle || trial.id} · 请先选择受试者</div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.6, maxWidth: 440, margin: '0 auto 20px' }}>
        从队列选择一位已建档受试者进入{label}，或新增受试者并上传病史资料。
      </div>
      {fullPatients.length > 0 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 18, maxWidth: 620, margin: '0 auto 18px' }}>
          {fullPatients.slice(0, 6).map(p => (
            <button key={p.pid} className="chip" onClick={() => onSelect(p.pid)}
              style={{ cursor: 'pointer', padding: '7px 12px', fontSize: 12 }}>
              <span style={{ fontWeight: 600 }}>{p.initials}</span>
              <span className="mono" style={{ color: 'var(--ink-400)' }}>{p.id}</span>
            </button>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button className="btn" onClick={goQueue}><Icon name="dashboard" size={15} />回到受试者队列</button>
        <button className="btn primary" onClick={onNew}><Icon name="plus" size={15} />新增受试者</button>
      </div>
    </div>
  );
}

export default function App() {
  const [boot, setBoot] = useState({ loading: true, error: null });
  const [apiKeyReady, setApiKeyReady] = useState(true);
  const [trials, setTrials] = useState([]);
  const [trialId, setTrialId] = useState(null);
  const [patientCache, setPatientCache] = useState({});   // pid -> 完整患者档案
  const [pidByTrial, setPidByTrial] = useState({});       // tid -> 当前受试者
  const [route, setRoute] = useState('dashboard');
  const [drawer, setDrawer] = useState({ open: false, doc: null, title: '', quote: '' });
  const [center, setCenter] = useState('全部中心');
  const [extraCenters, setExtraCenters] = useState([]);
  const [showNewTrial, setShowNewTrial] = useState(false);
  const [showNewPatient, setShowNewPatient] = useState(false);

  const refresh = useCallback(async () => {
    const s = await api.state();
    setApiKeyReady(s.apiKeyReady);
    setTrials(s.trials);
    return s;
  }, []);

  useEffect(() => {
    refresh()
      .then(s => {
        if (s.trials.length) setTrialId(tid => tid || s.trials[0].tid);
        setBoot({ loading: false, error: null });
        if (!s.apiKeyReady) toast('未配置 DEEPSEEK_API_KEY：AI 提取/解析/审核不可用，请在 .env 配置后重启', 'warn');
      })
      .catch(e => setBoot({ loading: false, error: e.message }));
  }, [refresh]);

  const trial = trials.find(t => t.tid === trialId) || trials[0] || null;
  const currentPid = trial ? pidByTrial[trial.tid] : null;
  const patient = currentPid ? patientCache[currentPid] : null;

  const loadPatient = useCallback(async (pid) => {
    const p = await api.getPatient(pid);
    setPatientCache(c => ({ ...c, [pid]: p }));
    return p;
  }, []);

  /* 子页面完成变更后回写缓存 + 刷新队列统计 */
  const onPatientUpdate = useCallback((p) => {
    setPatientCache(c => ({ ...c, [p.pid]: p }));
    refresh().catch(() => {});
  }, [refresh]);

  const onTrialUpdate = useCallback((t) => {
    setTrials(ts => ts.map(x => x.tid === t.tid ? t : x));
  }, []);

  const selectPatient = useCallback(async (pid, goto) => {
    try {
      await loadPatient(pid);
      setPidByTrial(m => ({ ...m, [trial.tid]: pid }));
      if (goto) setRoute(goto);
    } catch (e) { toast(e.message, 'no'); }
  }, [loadPatient, trial]);

  const openPatient = useCallback((row) => { selectPatient(row.pid, 'review'); }, [selectPatient]);

  const switchTrial = (tid) => { setTrialId(tid); setCenter('全部中心'); setRoute('dashboard'); };

  const openSource = (doc, title, quote) => setDrawer({ open: true, doc, title, quote: quote || '' });

  if (boot.loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: 'var(--ink-500)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 44, height: 44, margin: '0 auto 14px', borderRadius: 12, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center' }}>
            <Icon name="anchor" size={24} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink-700)' }}>智研入排</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>正在连接本地服务…</div>
        </div>
      </div>
    );
  }
  if (boot.error) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <div className="card" style={{ padding: 32, maxWidth: 460, textAlign: 'center' }}>
          <Icon name="alert" size={28} style={{ color: 'var(--warn)' }} />
          <div style={{ fontSize: 15, fontWeight: 600, margin: '10px 0 6px' }}>无法连接本地服务</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.6 }}>
            {boot.error}<br />请确认后端已启动（./start.sh 或 start.bat），然后刷新页面。
          </div>
          <button className="btn primary" style={{ marginTop: 16 }} onClick={() => location.reload()}>
            <Icon name="refresh" size={15} />重试
          </button>
        </div>
      </div>
    );
  }

  /* 首次使用：尚无项目 → 引导从上传研究方案开始 */
  if (!trial) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 20 }}>
        <div style={{ maxWidth: 520, textAlign: 'center', animation: 'fadeUp .3s' }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 18px', borderRadius: 15, background: 'var(--primary)', color: '#fff',
            display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow-md)' }}>
            <Icon name="anchor" size={30} stroke={1.9} />
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-.01em' }}>欢迎使用智研入排</div>
          <div style={{ fontSize: 13, color: 'var(--ink-500)', margin: '10px 0 26px', lineHeight: 1.7 }}>
            智能患者入排系统 · 从研究方案开始：AI 锚定提取入选/排除标准，<br />
            上传病历后逐条比对审核，每条结论可溯源、可改判。
          </div>
          <div className="card" style={{ padding: 26, textAlign: 'left' }}>
            {[['01', 'anchor', '上传研究方案（PDF / Word）', 'AI 自动定位并提取入排标准，人工核对后锚定'],
              ['02', 'upload', '上传受试者病历（照片 / PDF / Excel）', '本地 OCR 识别，图片不出本机，AI 结构化为筛选档案'],
              ['03', 'compare', '智能入排比对审核', '逐条判定 + 原文出处 + 置信度，人工裁定后导出意见书']].map(([n, ic, t, s]) => (
              <div key={n} style={{ display: 'flex', gap: 13, alignItems: 'flex-start', padding: '9px 0' }}>
                <span style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--primary-tint)', color: 'var(--primary)',
                  display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={ic} size={17} /></span>
                <span>
                  <span style={{ display: 'block', fontSize: 13.5, fontWeight: 600 }}><span className="mono" style={{ color: 'var(--ink-300)', marginRight: 7, fontSize: 11 }}>{n}</span>{t}</span>
                  <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2 }}>{s}</span>
                </span>
              </div>
            ))}
            <button className="btn primary" style={{ width: '100%', marginTop: 16, padding: '11px 15px' }} onClick={() => setShowNewTrial(true)}>
              <Icon name="plus" size={16} />新建项目（上传研究方案）
            </button>
            {!apiKeyReady && (
              <div style={{ marginTop: 12, fontSize: 11.5, color: 'var(--warn)', lineHeight: 1.6, display: 'flex', gap: 6 }}>
                <Icon name="alert" size={14} stroke={2} style={{ flexShrink: 0, marginTop: 1 }} />
                尚未配置 DEEPSEEK_API_KEY：请在 .env 文件填入密钥并重启后再创建项目（见 README）。
              </div>
            )}
          </div>
        </div>
        {showNewTrial &&
          <NewTrialModal apiKeyReady={apiKeyReady} onClose={() => setShowNewTrial(false)}
            onCreated={(t) => { setShowNewTrial(false); setTrials(ts => [...ts, t]); setTrialId(t.tid); setRoute('protocol'); }} />}
        <Toasts />
      </div>
    );
  }

  const centers = [...new Set([...DEFAULT_CENTERS, ...trial.cohort.map(r => r.site), ...extraCenters])].filter(Boolean);
  const fullPatients = trial.cohort;
  const meta = PAGE_META[route];
  const needsPatient = ['intake', 'review', 'report'].includes(route);
  const gate = needsPatient && !patient;

  const right = route === 'review' && patient
    ? <div style={{ display: 'flex', gap: 8 }} className="no-print">
        <button className="btn sm" onClick={() => setRoute('intake')}><Icon name="upload" size={14} />查看解析</button>
        <button className="btn primary sm" onClick={() => setRoute('report')}>生成审核意见<Icon name="chevron" size={14} /></button>
      </div>
    : route === 'dashboard'
    ? <CenterPicker value={center} onChange={setCenter} cohort={trial.cohort} centers={centers} onAddCenter={(c) => setExtraCenters(cs => [...cs, c])} />
    : null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar route={route} setRoute={setRoute} trial={trial} trials={trials}
        onSwitchTrial={switchTrial} onNewTrial={() => setShowNewTrial(true)} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar title={meta.title} subtitle={meta.sub} right={right} />
        {!apiKeyReady && (
          <div className="no-print" style={{ padding: '8px 26px', background: 'var(--warn-bg)', borderBottom: '1px solid var(--warn-line)',
            fontSize: 12, color: 'var(--warn)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Icon name="alert" size={14} stroke={2} />
            未配置 DEEPSEEK_API_KEY —— 方案提取、病历解析与智能审核不可用；请在 .env 中填入密钥并重启。
          </div>
        )}
        <main style={{ flex: 1, padding: '24px 26px 60px', maxWidth: 1320, width: '100%' }}>
          {route === 'dashboard' &&
            <Dashboard openPatient={openPatient} center={center} cohort={trial.cohort}
              onNewPatient={() => setShowNewPatient(true)} />}
          {route === 'protocol' &&
            <Protocol trial={trial} onTrialUpdate={onTrialUpdate} apiKeyReady={apiKeyReady} />}
          {gate &&
            <PatientGate trial={trial} label={meta.title} fullPatients={fullPatients}
              onSelect={(pid) => selectPatient(pid, route)} onNew={() => setShowNewPatient(true)}
              goQueue={() => setRoute('dashboard')} />}
          {route === 'intake' && patient &&
            <Intake trial={trial} patient={patient} onPatientUpdate={onPatientUpdate} openSource={openSource}
              apiKeyReady={apiKeyReady} fullPatients={fullPatients} onSelectPatient={(pid) => selectPatient(pid)}
              onNewPatient={() => setShowNewPatient(true)} />}
          {route === 'review' && patient &&
            <Review trial={trial} patient={patient} onPatientUpdate={onPatientUpdate} openSource={openSource}
              apiKeyReady={apiKeyReady} goIntake={() => setRoute('intake')} goProtocol={() => setRoute('protocol')} />}
          {route === 'report' && patient &&
            <Report trial={trial} patient={patient} openSource={openSource} goReview={() => setRoute('review')} />}
        </main>
      </div>

      <SourceDrawer open={drawer.open} onClose={() => setDrawer(d => ({ ...d, open: false }))}
        doc={drawer.doc} title={drawer.title} quote={drawer.quote} />

      {showNewTrial &&
        <NewTrialModal apiKeyReady={apiKeyReady} onClose={() => setShowNewTrial(false)}
          onCreated={(t) => { setShowNewTrial(false); setTrials(ts => [...ts, t]); setTrialId(t.tid); setRoute('protocol'); }} />}
      {showNewPatient &&
        <NewPatientModal trial={trial} centers={centers} onClose={() => setShowNewPatient(false)}
          onCreated={async (p) => {
            setShowNewPatient(false);
            setPatientCache(c => ({ ...c, [p.pid]: p }));
            setPidByTrial(m => ({ ...m, [trial.tid]: p.pid }));
            await refresh().catch(() => {});
            setRoute('intake');
          }} />}
      <Toasts />
    </div>
  );
}
