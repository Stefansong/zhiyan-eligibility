/* ============================================================
   Intake.jsx — 病史 / 检查检验上传与智能解析（真实流程）
   上传 → 本地 OCR / Excel 结构化读取 → AI 实体识别结构化
   ============================================================ */
import React from 'react';
import { Icon, Confidence } from './icons.jsx';
import { api, toast } from './api.js';
import { useSimProgress, ProgressBanner } from './ui.jsx';

function Dropzone({ onFiles, disabled }) {
  const [hover, setHover] = React.useState(false);
  const inputRef = React.useRef(null);
  return (
    <div
      onDragOver={e => { e.preventDefault(); if (!disabled) setHover(true); }}
      onDragLeave={() => setHover(false)}
      onDrop={e => { e.preventDefault(); setHover(false); if (!disabled && e.dataTransfer.files.length) onFiles([...e.dataTransfer.files]); }}
      onClick={() => !disabled && inputRef.current.click()}
      style={{
        border: `1.5px dashed ${hover ? 'var(--primary)' : 'var(--line-strong)'}`, borderRadius: 12,
        background: hover ? 'var(--primary-tint)' : 'var(--surface-2)', padding: '26px 20px',
        textAlign: 'center', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all .16s', opacity: disabled ? .6 : 1,
      }}>
      <input ref={inputRef} type="file" multiple hidden accept=".jpg,.jpeg,.png,.heic,.bmp,.webp,.tif,.tiff,.pdf,.xlsx,.xlsm,.xls"
        onChange={e => { if (e.target.files.length) onFiles([...e.target.files]); e.target.value = ''; }} />
      <div style={{ width: 46, height: 46, margin: '0 auto 12px', borderRadius: 12, background: 'var(--surface)',
        border: '1px solid var(--line)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
        <Icon name="upload" size={22} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>拖入病历照片 / PDF / Excel，或点击选择</div>
      <div style={{ fontSize: 12, color: 'var(--ink-400)', lineHeight: 1.5 }}>
        照片、照片型 PDF、扫描件 → 本地 OCR（图片不出本机）<br />Excel 检验数据表 → 按项目直接结构化导入 · 单文件 ≤ 20MB
      </div>
      <div style={{ display: 'inline-flex', gap: 7, marginTop: 14 }}>
        {['JPG', 'PNG', 'PDF', 'XLSX', 'HEIC'].map(f => <span key={f} className="chip" style={{ padding: '3px 9px', fontSize: 10.5 }}>{f}</span>)}
      </div>
    </div>
  );
}

/* 当前受试者信息条 + 切换 */
function PatientBar({ patient, fullPatients, onSelectPatient, onNewPatient }) {
  return (
    <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--gap)' }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: 'var(--primary-50)', color: 'var(--primary-700)',
        display: 'grid', placeItems: 'center', fontSize: 14, fontWeight: 600, flexShrink: 0 }}>
        {(patient.initials || '受').replace(/\s/g, '')[0]}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{patient.initials}</span>
          <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{patient.code}</span>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-400)', marginTop: 2 }}>
          {patient.sex} · {patient.age} 岁 · {patient.siteFull || patient.site}
        </div>
      </div>
      {fullPatients.length > 1 && (
        <select value={patient.pid} onChange={e => onSelectPatient(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--line-strong)', fontFamily: 'var(--font-sans)',
            fontSize: 12.5, color: 'var(--ink-700)', background: 'var(--surface)' }}>
          {fullPatients.map(p => <option key={p.pid} value={p.pid}>{p.initials} · {p.id}</option>)}
        </select>
      )}
      <button className="btn sm" onClick={onNewPatient}><Icon name="plus" size={14} />新增受试者</button>
    </div>
  );
}

export function Intake({ patient, onPatientUpdate, openSource, apiKeyReady, fullPatients, onSelectPatient, onNewPatient }) {
  const ocrProg = useSimProgress();
  const parseProg = useSimProgress();
  const docs = patient.docs || [];
  const fields = patient.fields || [];
  const docById = (id) => docs.find(d => d.id === id) || null;

  const uploadFiles = async (files) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    try {
      const updated = await ocrProg.run(api.uploadDocuments(patient.pid, fd));
      onPatientUpdate(updated);
      toast(`${files.length} 份资料已上传并完成本地识别`, 'ok');
    } catch (e) { toast(e.message, 'no'); }
  };

  const runParse = async () => {
    if (!docs.length) { toast('请先上传病历资料', 'warn'); return; }
    if (!apiKeyReady) { toast('未配置 DEEPSEEK_API_KEY，无法进行 AI 解析', 'no'); return; }
    try {
      const updated = await parseProg.run(api.parsePatient(patient.pid));
      onPatientUpdate(updated);
      toast(`解析完成：提取 ${updated.fields.length} 个结构化字段，请逐项核对`, 'ok');
    } catch (e) { toast(e.message, 'no'); }
  };

  const removeDoc = async (e, doc) => {
    e.stopPropagation();
    try {
      const updated = await api.deleteDocument(patient.pid, doc.id);
      onPatientUpdate(updated);
    } catch (err) { toast(err.message, 'no'); }
  };

  const parsing = parseProg.running;
  const fieldOpenSource = (f) => {
    const d = docById(f.doc);
    if (d) openSource(d, f.k, f.raw);
  };

  return (
    <div style={{ animation: 'fadeUp .3s' }}>
      <PatientBar patient={patient} fullPatients={fullPatients} onSelectPatient={onSelectPatient} onNewPatient={onNewPatient} />

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 'var(--gap)', alignItems: 'start' }}>
        {/* LEFT: upload + docs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap)' }}>
          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: 'var(--card-pad)' }}>
              <Dropzone onFiles={uploadFiles} disabled={ocrProg.running} />
            </div>
            {ocrProg.running && <ProgressBanner label="本地识别中（OCR / 数据表导入）…" progress={ocrProg.progress} />}
          </div>

          <div className="card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '13px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>已上传文档</span>
              <span className="mono" style={{ fontSize: 11.5, color: 'var(--ink-400)' }}>{docs.length} 份</span>
              <button className="btn ghost sm" style={{ marginLeft: 'auto', padding: '4px 8px' }} onClick={runParse} disabled={parsing}>
                <Icon name="refresh" size={14} />重新解析
              </button>
            </div>
            <div>
              {docs.length === 0 && (
                <div style={{ padding: '26px 16px', textAlign: 'center', fontSize: 12, color: 'var(--ink-400)', lineHeight: 1.6 }}>
                  尚未上传资料<br />支持门诊病历、检验报告、检查报告、用药记录等
                </div>
              )}
              {docs.map((d, i) => (
                <div key={d.id} onClick={() => openSource(d, d.name)} style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 11, padding: '11px 16px',
                  borderBottom: i < docs.length - 1 ? '1px solid var(--line)' : 'none', transition: 'background .12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: 'var(--primary-50)', color: 'var(--primary-700)',
                    display: 'grid', placeItems: 'center', flexShrink: 0 }}><Icon name={d.icon} size={17} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.name}</span>
                    <span style={{ display: 'flex', gap: 7, fontSize: 11, color: 'var(--ink-400)', marginTop: 2 }}>
                      <span>{d.type}</span><span>·</span><span>{d.pages}页</span><span>·</span><span className="mono">{d.date}</span>
                    </span>
                  </span>
                  <button onClick={(e) => removeDoc(e, d)} title="删除该资料"
                    style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--ink-300)', padding: 4, display: 'grid', placeItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--no)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--ink-300)'}>
                    <Icon name="x" size={14} />
                  </button>
                  <Icon name="eye" size={15} style={{ color: 'var(--ink-300)' }} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT: parsed structured fields */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <Icon name="sparkle" size={17} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: 15, fontWeight: 600 }}>智能解析结果</span>
                {fields.length > 0 && <span className="chip" style={{ padding: '3px 9px', fontSize: 11 }}>结构化字段 {fields.length}</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-400)', marginTop: 3 }}>
                本地 OCR + AI 医学命名实体识别 · 每个字段保留原文定位，可点击核验
              </div>
            </div>
            {patient.parseStatus === 'done' && !parsing &&
              <span className="status-pill ok"><Icon name="check" size={13} stroke={2.2} />解析完成</span>}
            {!parsing && docs.length > 0 &&
              <button className="btn primary sm" onClick={runParse}>
                <Icon name="sparkle" size={14} />{fields.length ? '重新 AI 解析' : 'AI 结构化解析'}
              </button>}
          </div>

          {parsing && <ProgressBanner label="正在识别医学实体并结构化（约 1 分钟）…" progress={parseProg.progress} />}

          {/* fields grid */}
          {fields.length === 0 && !parsing ? (
            <div style={{ padding: '52px 20px', textAlign: 'center', color: 'var(--ink-400)' }}>
              <Icon name="sparkle" size={26} />
              <div style={{ fontSize: 13.5, marginTop: 10, color: 'var(--ink-500)', fontWeight: 600 }}>等待解析</div>
              <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
                左侧上传病历资料后，点击「AI 结构化解析」<br />识别文字仅发送至 DeepSeek 做结构化，照片本身不上传
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
              {fields.map((f, i) => {
                const col = i % 2;
                const lastRow = i >= fields.length - (fields.length % 2 === 0 ? 2 : 1);
                return (
                  <div key={f.k + i} style={{
                    padding: '13px 20px',
                    borderBottom: lastRow ? 'none' : '1px solid var(--line)',
                    borderRight: col === 0 ? '1px solid var(--line)' : 'none',
                    opacity: parsing ? 0.45 : 1, transition: 'opacity .3s',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
                      <span style={{ fontSize: 11.5, color: 'var(--ink-500)', fontWeight: 500 }}>{f.k}</span>
                      {f.flag === 'derived' && <span className="chip" style={{ padding: '1px 6px', fontSize: 9.5, color: 'var(--info)', background: 'var(--info-bg)', border: 'none' }}>推算</span>}
                      {f.flag === 'missing' && <span className="chip" style={{ padding: '1px 6px', fontSize: 9.5, color: 'var(--no)', background: 'var(--no-bg)', border: 'none' }}>缺失</span>}
                      {(f.flag === 'borderline' || f.flag === 'date' || f.flag === 'duration' || f.flag === 'mild') &&
                        <span className="chip" style={{ padding: '1px 6px', fontSize: 9.5, color: 'var(--warn)', background: 'var(--warn-bg)', border: 'none' }}>需核</span>}
                    </div>
                    {parsing
                      ? <div className="skel" style={{ height: 16, width: '60%' }} />
                      : <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                          <span className="mono" style={{ fontSize: 15, fontWeight: 600, color: f.flag === 'missing' ? 'var(--no)' : 'var(--ink-900)', whiteSpace: 'nowrap' }}>{f.v}</span>
                          <Confidence value={f.conf} />
                        </div>}
                    {!parsing && (
                      <button onClick={() => f.doc && fieldOpenSource(f)} disabled={!f.doc} style={{
                        marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5, border: 'none', background: 'transparent',
                        padding: 0, cursor: f.doc ? 'pointer' : 'default', color: f.doc ? 'var(--primary)' : 'var(--ink-300)',
                        fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
                      }}>
                        <Icon name="link" size={12} />
                        <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {f.doc ? `原文：${f.raw}` : '无原始记录'}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
