/* ============================================================
   Protocol.jsx — 研究方案上传与入排标准锚定提取（真实流程）
   上传 PDF/Word → AI 提取 → 人工逐条核对/修改 → 锚定确认
   ============================================================ */
import React from 'react';
import { Icon } from './icons.jsx';
import { api, toast } from './api.js';
import { useSimProgress, ProgressBanner, inputStyle } from './ui.jsx';

export function Protocol({ trial, onTrialUpdate, apiKeyReady }) {
  const criteria = trial.criteria || [];
  const inc = criteria.filter(c => c.type === 'in');
  const exc = criteria.filter(c => c.type === 'ex');
  const [showUpload, setShowUpload] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const inputRef = React.useRef(null);
  const prog = useSimProgress();

  const uploadProtocol = async (file) => {
    if (!apiKeyReady) { toast('未配置 DEEPSEEK_API_KEY，无法进行 AI 提取', 'no'); return; }
    setShowUpload(false);
    const fd = new FormData();
    fd.append('file', file);
    try {
      const updated = await prog.run(api.replaceProtocol(trial.tid, fd));
      onTrialUpdate(updated);
      toast(`已重新提取 ${updated.criteria.length} 条入排标准，请人工核对后锚定`, 'ok');
    } catch (e) { toast(e.message, 'no'); }
  };

  const saveCriteria = async (next, anchored) => {
    try {
      const updated = await api.updateCriteria(trial.tid, { criteria: next, ...(anchored !== undefined ? { anchored } : {}) });
      onTrialUpdate(updated);
      return true;
    } catch (e) { toast(e.message, 'no'); return false; }
  };

  const editCriterion = async (id, text) => {
    const next = criteria.map(c => c.id === id ? { ...c, text } : c);
    if (await saveCriteria(next)) toast(`${id} 已修改`, 'ok');
  };

  const removeCriterion = async (c) => {
    const next = criteria.filter(x => x.id !== c.id);
    if (await saveCriteria(next)) toast(`${c.no}「${c.text.slice(0, 18)}…」已删除`, 'ok');
  };

  const anchor = async () => {
    if (await saveCriteria(criteria, true)) toast('入排标准已锚定，可开始审核受试者', 'ok');
  };

  return (
   <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)', animation: 'fadeUp .3s' }}>
    {/* ===== 上传 / 方案状态 横幅 ===== */}
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '15px 20px' }}>
        <span style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--primary-50)', color: 'var(--primary-700)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
          <Icon name="document" size={20} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>当前研究方案</span>
            {prog.running
              ? <span className="status-pill warn"><Icon name="refresh" size={12} stroke={2.2} />解析中</span>
              : trial.anchored
              ? <span className="status-pill ok"><Icon name="check" size={12} stroke={2.4} />已加载 · 标准已锚定</span>
              : <span className="status-pill warn"><Icon name="alert" size={12} stroke={2.2} />已提取 · 待人工核对锚定</span>}
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 2 }}>
            <span className="mono">{trial.id}</span> · {trial.version}{trial.versionDate ? ` · ${trial.versionDate}` : ''}{trial.sponsor ? ` · ${trial.sponsor}` : ''} · 提取于 {trial.parsedAt}
          </div>
        </div>
        {!trial.anchored && criteria.length > 0 && !prog.running && (
          <button className="btn primary sm" onClick={anchor}>
            <Icon name="anchor" size={15} />确认无误，锚定标准
          </button>
        )}
        <button className="btn sm" onClick={() => setShowUpload(s => !s)} disabled={prog.running}>
          <Icon name="upload" size={15} />上传 / 更换研究方案
        </button>
      </div>

      {prog.running && <ProgressBanner label="正在锚定入选 / 排除标准（约 1 分钟）…" progress={prog.progress} />}

      {/* dropzone (toggle) */}
      {showUpload && !prog.running && (
        <div style={{ padding: '0 20px 18px', animation: 'fadeUp .16s' }}>
          <div
            onDragOver={e => { e.preventDefault(); setHover(true); }}
            onDragLeave={() => setHover(false)}
            onDrop={e => { e.preventDefault(); setHover(false); if (e.dataTransfer.files[0]) uploadProtocol(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current.click()}
            style={{ border: `1.5px dashed ${hover ? 'var(--primary)' : 'var(--line-strong)'}`, borderRadius: 11,
              background: hover ? 'var(--primary-tint)' : 'var(--surface-2)', padding: '22px', textAlign: 'center', cursor: 'pointer', transition: 'all .16s' }}>
            <input ref={inputRef} type="file" hidden accept=".pdf,.docx,.jpg,.jpeg,.png"
              onChange={e => { if (e.target.files[0]) uploadProtocol(e.target.files[0]); e.target.value = ''; }} />
            <div style={{ width: 42, height: 42, margin: '0 auto 10px', borderRadius: 11, background: 'var(--surface)', border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
              <Icon name="upload" size={20} />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, marginBottom: 4 }}>拖入研究方案 PDF / Word，或点击选择</div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-400)', lineHeight: 1.5 }}>
              支持完整方案、方案摘要、修订版（Amendment）· 系统将自动定位入排标准章节并逐条提取<br />
              更换方案后原审核结果不再适用，需重新审核
            </div>
            <div style={{ display: 'inline-flex', gap: 7, marginTop: 12 }}>
              {['PDF', 'DOCX', '扫描件'].map(f => <span key={f} className="chip" style={{ padding: '3px 9px', fontSize: 10.5 }}>{f}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 'var(--gap)', alignItems: 'start' }}>
      {/* LEFT: protocol meta */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
        <div className="card" style={{ padding: 'var(--card-pad)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 44, height: 54, borderRadius: 7, background: 'var(--primary-50)', border: '1px solid var(--primary-50)',
              display: 'grid', placeItems: 'center', color: 'var(--primary-700)', position: 'relative', flexShrink: 0 }}>
              <Icon name="document" size={22} />
              <span style={{ position: 'absolute', bottom: -7, fontSize: 8.5, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '1px 4px', borderRadius: 3 }}>PDF</span>
            </div>
            <div>
              <div className="mono" style={{ fontSize: 12, fontWeight: 600, color: 'var(--primary-700)' }}>{trial.id}</div>
              <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2 }}>{trial.version}{trial.versionDate ? ` · ${trial.versionDate}` : ''}</div>
            </div>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, marginBottom: 14 }}>{trial.title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[['适应症', trial.indication || '—'], ['研究分期', trial.phase || '—'], ['申办方', trial.sponsor || '—'],
              ['目标入组', trial.target ? `${trial.target} 例` : '—']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                <span style={{ color: 'var(--ink-400)' }}>{k}</span>
                <span style={{ fontWeight: 600, color: 'var(--ink-700)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--card-pad)', background: 'var(--primary-tint)', borderColor: 'var(--primary-50)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Icon name="sparkle" size={16} style={{ color: 'var(--primary)' }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--primary-700)' }}>标准锚定提取</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-600)', lineHeight: 1.6 }}>
            已从方案入排标准章节自动锚定 <b className="mono">{criteria.length}</b> 条入排标准，并解析为可机器比对的逻辑条件（阈值、区间、时间窗）。
            {!trial.anchored && <><br /><b style={{ color: 'var(--warn)' }}>请逐条核对（可修改/删除），确认无误后点击「锚定标准」。</b></>}
          </div>
          {trial.extractNote && (
            <div style={{ fontSize: 11.5, color: 'var(--warn)', marginTop: 8, lineHeight: 1.5 }}>提取说明：{trial.extractNote}</div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 8, padding: '9px 11px', textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--ok)' }}>{inc.length}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-400)' }}>入选标准</div>
            </div>
            <div style={{ flex: 1, background: 'var(--surface)', borderRadius: 8, padding: '9px 11px', textAlign: 'center' }}>
              <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: 'var(--no)' }}>{exc.length}</div>
              <div style={{ fontSize: 10.5, color: 'var(--ink-400)' }}>排除标准</div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: criteria list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
        <CriteriaGroup title="入选标准" sub="Inclusion Criteria" tone="ok" items={inc}
          editable onEdit={editCriterion} onRemove={removeCriterion} />
        <CriteriaGroup title="排除标准" sub="Exclusion Criteria" tone="no" items={exc}
          editable onEdit={editCriterion} onRemove={removeCriterion} />
      </div>
    </div>
   </div>
  );
}

function CriterionRow({ c, color, editable, onEdit, onRemove, last }) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(c.text);
  const save = () => {
    setEditing(false);
    const v = text.trim();
    if (v && v !== c.text) onEdit(c.id, v); else setText(c.text);
  };
  return (
    <div style={{ display: 'flex', gap: 14, padding: '13px 20px', borderBottom: last ? 'none' : '1px solid var(--line)' }}>
      <span className="mono" style={{ fontSize: 12, fontWeight: 600, color, flexShrink: 0, width: 30, paddingTop: 1 }}>
        {c.id}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <div>
            <textarea value={text} onChange={e => setText(e.target.value)} rows={2} autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } if (e.key === 'Escape') { setText(c.text); setEditing(false); } }}
              style={{ ...inputStyle, fontSize: 13, lineHeight: 1.5, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 7, marginTop: 7 }}>
              <button className="btn primary sm" onClick={save}><Icon name="check" size={13} stroke={2.4} />保存</button>
              <button className="btn sm" onClick={() => { setText(c.text); setEditing(false); }}>取消</button>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 13.5, color: 'var(--ink-800)', lineHeight: 1.5 }}>{c.text}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
          <span className="chip" style={{ padding: '2px 8px', fontSize: 10.5 }}>{c.cat}</span>
          {c.key_elements && <span className="chip" style={{ padding: '2px 8px', fontSize: 10.5, color: 'var(--primary-700)', background: 'var(--primary-tint)', borderColor: 'var(--primary-50)' }}>{c.key_elements}</span>}
          {(c.source?.sec || c.source?.page) && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: 'var(--ink-400)', whiteSpace: 'nowrap' }}>
              <Icon name="anchor" size={11} />锚定 {c.source.sec}{c.source.page ? ` · ${c.source.page}` : ''}
            </span>
          )}
          {editable && !editing && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 2 }}>
              <button className="btn ghost sm" style={{ padding: '3px 7px' }} title="修改标准原文" onClick={() => setEditing(true)}>
                <Icon name="edit" size={13} />
              </button>
              <button className="btn ghost sm" style={{ padding: '3px 7px' }} title="删除该条标准" onClick={() => onRemove(c)}>
                <Icon name="x" size={13} />
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CriteriaGroup({ title, sub, tone, items, editable, onEdit, onRemove }) {
  const color = tone === 'ok' ? 'var(--ok)' : 'var(--no)';
  const bg = tone === 'ok' ? 'var(--ok-bg)' : 'var(--no-bg)';
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ width: 28, height: 28, borderRadius: 7, background: bg, color, display: 'grid', placeItems: 'center' }}>
          <Icon name={tone === 'ok' ? 'check' : 'x'} size={16} stroke={2.2} />
        </span>
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 11, color: 'var(--ink-400)', letterSpacing: '.03em' }}>{sub}</div>
        </div>
        <span className="mono" style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--ink-400)' }}>{items.length} 条</span>
      </div>
      <div>
        {items.length === 0 && (
          <div style={{ padding: '24px 20px', textAlign: 'center', fontSize: 12, color: 'var(--ink-400)' }}>暂无{title}</div>
        )}
        {items.map((c, i) => (
          <CriterionRow key={c.id} c={c} color={color} editable={editable}
            onEdit={onEdit} onRemove={onRemove} last={i === items.length - 1} />
        ))}
      </div>
    </div>
  );
}
