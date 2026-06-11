/* ============================================================
   ui.jsx — 共享 UI：弹窗、提示条、模拟进度、受试者/项目表单
   ============================================================ */
import React from 'react';
import { Icon } from './icons.jsx';
import { api, toast } from './api.js';

/* 模拟进度：等待真实异步任务期间缓慢爬升到 ~92%，完成后冲到 100% */
export function useSimProgress() {
  const [progress, setProgress] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  const timer = React.useRef(null);

  const run = React.useCallback(async (promise) => {
    setRunning(true); setProgress(4);
    timer.current = setInterval(() => {
      setProgress(p => p >= 92 ? p : Math.min(92, p + Math.random() * 5 + 1));
    }, 350);
    try {
      const result = await promise;
      setProgress(100);
      return result;
    } finally {
      clearInterval(timer.current);
      setTimeout(() => { setRunning(false); setProgress(0); }, 420);
    }
  }, []);
  React.useEffect(() => () => clearInterval(timer.current), []);
  return { progress: Math.round(progress), running, run };
}

/* 解析进度条横幅 */
export function ProgressBanner({ label, progress }) {
  return (
    <div style={{ padding: '13px 20px', background: 'var(--primary-tint)', borderTop: '1px solid var(--line)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <Icon name="sparkle" size={15} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--primary-700)' }}>{label}</span>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--primary-700)' }}>{progress}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 3, background: 'var(--surface)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: progress + '%', background: 'var(--primary)', borderRadius: 3, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

/* 居中模态弹窗 */
export function Modal({ title, sub, onClose, width = 460, children }) {
  React.useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(21,32,43,.4)', zIndex: 70, animation: 'fadeUp .15s' }} />
      <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width, maxWidth: '94vw',
        maxHeight: '88vh', overflowY: 'auto', zIndex: 71, background: 'var(--surface)', borderRadius: 14,
        boxShadow: 'var(--shadow-lg)', animation: 'fadeUp .18s' }}>
        <div style={{ padding: '18px 22px 14px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600 }}>{title}</div>
            {sub && <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 3, lineHeight: 1.5 }}>{sub}</div>}
          </div>
          <button className="btn ghost sm" style={{ padding: 6 }} onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div style={{ padding: '18px 22px 22px' }}>{children}</div>
      </div>
    </>
  );
}

export function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 13 }}>
      <span style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--ink-400)', marginBottom: 5 }}>{label}</span>
      {children}
    </label>
  );
}

export const inputStyle = {
  width: '100%', padding: '9px 11px', borderRadius: 8, border: '1px solid var(--line-strong)',
  fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--ink-900)', outline: 'none',
  background: 'var(--surface)', boxSizing: 'border-box',
};

/* 新增受试者弹窗 */
export function NewPatientModal({ trial, centers, onClose, onCreated }) {
  const [form, setForm] = React.useState({ code: '', initials: '', sex: '男', age: '', site: centers[0] || '中心 01' });
  const [busy, setBusy] = React.useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.code.trim()) { toast('请填写受试者编号', 'warn'); return; }
    setBusy(true);
    try {
      const patient = await api.createPatient(trial.tid, { ...form, age: Number(form.age) || 0 });
      toast(`受试者 ${patient.code} 已创建`, 'ok');
      onCreated(patient);
    } catch (e) { toast(e.message, 'no'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="新增受试者" sub={`${trial.shortTitle || trial.id} · 编号请使用筛选号，勿用真实姓名`} onClose={onClose}>
      <Field label="受试者编号（必填）">
        <input style={inputStyle} value={form.code} onChange={set('code')} placeholder="如：SCR-0143" autoFocus />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="姓名缩写">
          <input style={inputStyle} value={form.initials} onChange={set('initials')} placeholder="如：张 X X" />
        </Field>
        <Field label="性别">
          <select style={{ ...inputStyle, height: 38 }} value={form.sex} onChange={set('sex')}>
            <option>男</option><option>女</option><option>未知</option>
          </select>
        </Field>
        <Field label="年龄">
          <input style={inputStyle} type="number" value={form.age} onChange={set('age')} placeholder="如：58" />
        </Field>
      </div>
      <Field label="研究中心">
        <select style={{ ...inputStyle, height: 38 }} value={form.site} onChange={set('site')}>
          {centers.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', gap: 9, marginTop: 6 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>取消</button>
        <button className="btn primary" style={{ flex: 1 }} onClick={submit} disabled={busy}>
          <Icon name="plus" size={15} />{busy ? '创建中…' : '创建并开始上传资料'}
        </button>
      </div>
    </Modal>
  );
}

/* 新建项目（上传研究方案）弹窗 */
export function NewTrialModal({ onClose, onCreated, apiKeyReady }) {
  const [mode, setMode] = React.useState('file'); // file | text
  const [file, setFile] = React.useState(null);
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const inputRef = React.useRef(null);

  const submit = async () => {
    if (!apiKeyReady) { toast('未配置 DEEPSEEK_API_KEY，无法进行 AI 提取（见 README）', 'no'); return; }
    const fd = new FormData();
    if (mode === 'file') {
      if (!file) { toast('请选择研究方案文件', 'warn'); return; }
      fd.append('file', file);
    } else {
      if (text.trim().length < 50) { toast('方案文本过短', 'warn'); return; }
      fd.append('text', text);
    }
    setBusy(true);
    try {
      const trial = await api.createTrialFromProtocol(fd);
      toast(`项目「${trial.shortTitle || trial.id}」已创建，请核对提取的入排标准`, 'ok');
      onCreated(trial);
    } catch (e) { toast(e.message, 'no'); }
    finally { setBusy(false); }
  };

  return (
    <Modal title="新建项目 · 上传研究方案" width={540} onClose={onClose}
      sub="AI 将自动定位入排标准章节并逐条提取，创建后请在「方案 · 入排标准」页人工核对并锚定">
      <div style={{ display: 'flex', gap: 4, background: 'var(--surface-2)', padding: 4, borderRadius: 9, border: '1px solid var(--line)', width: 'fit-content', marginBottom: 14 }}>
        {[['file', '上传文件'], ['text', '粘贴文本']].map(([m, l]) => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
            fontSize: 12.5, fontWeight: mode === m ? 600 : 500,
            background: mode === m ? 'var(--surface)' : 'transparent', color: mode === m ? 'var(--ink-900)' : 'var(--ink-500)',
            boxShadow: mode === m ? 'var(--shadow-sm)' : 'none' }}>{l}</button>
        ))}
      </div>

      {mode === 'file' ? (
        <div
          onDragOver={e => { e.preventDefault(); setHover(true); }}
          onDragLeave={() => setHover(false)}
          onDrop={e => { e.preventDefault(); setHover(false); if (e.dataTransfer.files[0]) setFile(e.dataTransfer.files[0]); }}
          onClick={() => inputRef.current.click()}
          style={{ border: `1.5px dashed ${hover ? 'var(--primary)' : 'var(--line-strong)'}`, borderRadius: 11,
            background: hover ? 'var(--primary-tint)' : 'var(--surface-2)', padding: 24, textAlign: 'center', cursor: 'pointer', transition: 'all .16s' }}>
          <input ref={inputRef} type="file" accept=".pdf,.docx,.jpg,.jpeg,.png" hidden
            onChange={e => setFile(e.target.files[0] || null)} />
          <div style={{ width: 42, height: 42, margin: '0 auto 10px', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
            <Icon name="upload" size={20} />
          </div>
          {file
            ? <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--primary-700)' }}>{file.name}</div>
            : <div style={{ fontSize: 13.5, fontWeight: 600 }}>拖入研究方案 PDF / Word，或点击选择</div>}
          <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 4 }}>支持完整方案、方案摘要、修订版（Amendment）</div>
          <div style={{ display: 'inline-flex', gap: 7, marginTop: 12 }}>
            {['PDF', 'DOCX', '扫描件'].map(f => <span key={f} className="chip" style={{ padding: '3px 9px', fontSize: 10.5 }}>{f}</span>)}
          </div>
        </div>
      ) : (
        <textarea value={text} onChange={e => setText(e.target.value)} rows={9}
          placeholder="粘贴方案文本（建议只粘贴入选/排除标准章节，提取更准确）…"
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
      )}

      <div style={{ display: 'flex', gap: 9, marginTop: 16 }}>
        <button className="btn" style={{ flex: 1 }} onClick={onClose}>取消</button>
        <button className="btn primary" style={{ flex: 1.4 }} onClick={submit} disabled={busy}>
          <Icon name="sparkle" size={15} />{busy ? 'AI 提取入排标准中…（约 1 分钟）' : 'AI 提取入排标准并创建项目'}
        </button>
      </div>
    </Modal>
  );
}

/* 全局提示条（监听 app-toast 事件） */
export function Toasts() {
  const [items, setItems] = React.useState([]);
  React.useEffect(() => {
    const h = (e) => {
      const item = e.detail;
      setItems(list => [...list, item]);
      setTimeout(() => setItems(list => list.filter(i => i !== item)), item.tone === 'no' ? 7000 : 3800);
    };
    window.addEventListener('app-toast', h);
    return () => window.removeEventListener('app-toast', h);
  }, []);
  const tones = {
    ok: { bg: 'var(--ok-bg)', border: 'var(--ok-line)', color: 'var(--ok)', icon: 'check' },
    no: { bg: 'var(--no-bg)', border: 'var(--no-line)', color: 'var(--no)', icon: 'alert' },
    warn: { bg: 'var(--warn-bg)', border: 'var(--warn-line)', color: 'var(--warn)', icon: 'alert' },
    info: { bg: 'var(--surface)', border: 'var(--line-strong)', color: 'var(--ink-700)', icon: 'sparkle' },
  };
  return (
    <div className="no-print" style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 90,
      display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', pointerEvents: 'none' }}>
      {items.map((it, i) => {
        const t = tones[it.tone] || tones.info;
        return (
          <div key={it.ts + '_' + i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px',
            background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, boxShadow: 'var(--shadow-md)',
            fontSize: 12.5, fontWeight: 500, color: 'var(--ink-800)', maxWidth: 560, animation: 'fadeUp .2s' }}>
            <Icon name={t.icon} size={15} style={{ color: t.color, flexShrink: 0 }} />
            {it.message}
          </div>
        );
      })}
    </div>
  );
}
