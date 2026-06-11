/* ============================================================
   Report.jsx — 标准化审核意见报告（真实数据 · 可导出 / 打印）
   结论 = AI 判定 + 人工改判后的最终裁定
   ============================================================ */
import React from 'react';
import { Icon, STATUS_META } from './icons.jsx';
import { loadProfile } from './Shell.jsx';

export function Report({ trial, patient, openSource, goReview }) {
  const prof = loadProfile();
  const review = patient.review;

  if (!review) {
    return (
      <div className="card" style={{ padding: '56px 30px', textAlign: 'center', animation: 'fadeUp .3s' }}>
        <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: 14, background: 'var(--primary-tint)', color: 'var(--primary)', display: 'grid', placeItems: 'center' }}>
          <Icon name="report" size={26} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{patient.initials} · {patient.code} 尚无审核结果</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-500)', lineHeight: 1.6, marginBottom: 20 }}>
          请先在「入排比对审核」页运行智能审核并完成人工复核，再生成意见书。
        </div>
        <button className="btn primary" onClick={goReview}><Icon name="compare" size={15} />前往入排比对审核</button>
      </div>
    );
  }

  const criteria = review.criteriaSnapshot || trial.criteria;
  const results = review.results;
  const decisions = review.decisions || {};
  const items = criteria.filter(c => results[c.id]);
  const vOf = (id) => decisions[id] || results[id].verdict;
  const docById = (id) => (patient.docs || []).find(d => d.id === id) || null;

  const tally = items.reduce((a, c) => { a[vOf(c.id)] = (a[vOf(c.id)] || 0) + 1; return a; }, { ok: 0, warn: 0, no: 0 });
  const verdict = tally.no > 0 ? 'fail' : tally.warn > 0 ? 'review' : 'pass';
  const vMeta = { pass: { t: '符合入组', c: 'var(--ok)' }, review: { t: '待人工复核 · 有条件入组', c: 'var(--warn)' }, fail: { t: '不符合入组', c: 'var(--no)' } }[verdict];
  const flagged = items.filter(c => vOf(c.id) !== 'ok');
  const overriddenCount = items.filter(c => decisions[c.id] && decisions[c.id] !== results[c.id].verdict).length;

  const openEvidence = (c) => {
    const r = results[c.id];
    const d = docById(r.doc);
    if (!d) return;
    openSource(d, `${c.no || c.id} · ${c.cat || ''}`, r.evidence || r.basis);
  };

  return (
    <div className="report-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 252px', gap: 'var(--gap)', alignItems: 'start', animation: 'fadeUp .3s' }}>
      {/* report sheet */}
      <div className="card print-area" style={{ padding: 0, overflow: 'hidden' }}>
        {/* letterhead */}
        <div style={{ padding: '24px 34px 20px', borderBottom: '2px solid var(--ink-900)', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--primary)', color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <Icon name="anchor" size={21} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.01em' }}>受试者入排资格审核意见书</div>
            <div style={{ fontSize: 12, color: 'var(--ink-500)', marginTop: 3 }}>Eligibility Review Statement · 智研入排 AI 辅助生成，经医学经理复核</div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11.5, color: 'var(--ink-400)' }} className="mono">
            <div>编号 {patient.code}-ELG-01</div>
            <div>{review.reviewedAt}</div>
          </div>
        </div>

        {/* meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid var(--line)' }}>
          {[['研究方案', trial.id], ['受试者', `${patient.initials} · ${patient.sex}/${patient.age}`],
            ['研究中心', patient.site], ['方案版本', trial.version || '—']].map(([k, v], i) => (
            <div key={k} style={{ padding: '13px 20px', borderRight: i < 3 ? '1px solid var(--line)' : 'none' }}>
              <div style={{ fontSize: 10.5, color: 'var(--ink-400)', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 12.5, fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* conclusion block */}
        <div style={{ padding: '22px 34px' }}>
          <div className="kicker" style={{ marginBottom: 10 }}>一、审核结论</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 18px', borderRadius: 11,
            border: `1px solid color-mix(in srgb, ${vMeta.c} 27%, transparent)`, background: `color-mix(in srgb, ${vMeta.c} 7%, white)` }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: vMeta.c, color: '#fff', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
              <Icon name={verdict === 'pass' ? 'check' : verdict === 'fail' ? 'x' : 'alert'} size={22} stroke={2.4} />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: vMeta.c }}>{vMeta.t}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-600)', marginTop: 3, lineHeight: 1.5 }}>
                共比对 {items.length} 条入排标准：符合 {tally.ok} 项、存疑 {tally.warn} 项、不符合 {tally.no} 项
                {overriddenCount > 0 ? `（含人工改判 ${overriddenCount} 项）` : ''}。
                {tally.warn + tally.no > 0 ? `现存 ${tally.warn + tally.no} 项需处理，详见下方明细与处理建议。` : '全部标准满足。'}
              </div>
            </div>
            <div style={{ display: 'flex', height: 8, width: 130, borderRadius: 5, overflow: 'hidden', background: 'var(--surface-3)' }}>
              <span style={{ width: `${tally.ok / Math.max(1, items.length) * 100}%`, background: 'var(--ok)' }} />
              <span style={{ width: `${tally.warn / Math.max(1, items.length) * 100}%`, background: 'var(--warn)' }} />
              <span style={{ width: `${tally.no / Math.max(1, items.length) * 100}%`, background: 'var(--no)' }} />
            </div>
          </div>
        </div>

        {/* flagged items + recommendations */}
        {flagged.length > 0 && (
          <div style={{ padding: '0 34px 8px' }}>
            <div className="kicker" style={{ marginBottom: 12 }}>二、需处理项与处理建议</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {flagged.map(c => {
                const ev = results[c.id]; const v = vOf(c.id); const m = STATUS_META[v]; const col = m.color;
                const rec = ev.rec || '建议研究者复核后裁定。';
                const hasDoc = !!docById(ev.doc);
                return (
                  <div key={c.id} style={{ display: 'flex', gap: 13, padding: '13px 15px', border: '1px solid var(--line)', borderRadius: 10, borderLeft: `3px solid ${col}` }}>
                    <div style={{ flexShrink: 0, paddingTop: 1 }}>
                      <span className="status-pill" style={{ background: 'transparent', border: 'none', padding: 0, color: col, fontWeight: 700, fontSize: 12 }}>
                        <Icon name={m.icon} size={14} stroke={2.4} />{m.label}
                      </span>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}><span className="mono" style={{ color: 'var(--ink-400)', marginRight: 6 }}>{c.id}</span>{c.text}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--ink-500)', margin: '5px 0', lineHeight: 1.55 }}>{ev.basis}</div>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11.5, color: 'var(--primary-700)', background: 'var(--primary-tint)', padding: '6px 9px', borderRadius: 6 }}>
                        <Icon name="sparkle" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span><b>建议：</b>{rec}</span>
                        {hasDoc && <button className="no-print" onClick={() => openEvidence(c)} style={{ marginLeft: 'auto', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--primary)', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Icon name="link" size={11} />出处</button>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* full criteria appendix */}
        <div style={{ padding: '20px 34px 10px' }}>
          <div className="kicker" style={{ marginBottom: 12 }}>{flagged.length > 0 ? '三' : '二'}、全部标准比对明细</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid var(--line-strong)', color: 'var(--ink-400)', textAlign: 'left', fontSize: 10.5 }}>
                <th style={{ padding: '7px 6px', fontWeight: 600 }}>编号</th>
                <th style={{ padding: '7px 6px', fontWeight: 600 }}>标准</th>
                <th style={{ padding: '7px 6px', fontWeight: 600 }}>受试者值</th>
                <th style={{ padding: '7px 6px', fontWeight: 600 }}>判定</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c => {
                const ev = results[c.id]; const v = vOf(c.id); const m = STATUS_META[v]; const col = m.color;
                const overridden = decisions[c.id] && decisions[c.id] !== ev.verdict;
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td className="mono" style={{ padding: '8px 6px', color: c.type === 'in' ? 'var(--ok)' : 'var(--no)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.id}</td>
                    <td style={{ padding: '8px 6px', color: 'var(--ink-700)' }}>{c.text}</td>
                    <td className="mono" style={{ padding: '8px 6px', color: 'var(--ink-600)', whiteSpace: 'nowrap' }}>{ev.value}</td>
                    <td style={{ padding: '8px 6px', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: col, fontWeight: 600, fontSize: 11.5 }}>
                        <Icon name={m.icon} size={12} stroke={2.4} />{m.label}
                      </span>
                      {overridden && <span style={{ fontSize: 10, color: 'var(--info)', marginLeft: 5 }}>改判</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* signature */}
        <div style={{ padding: '20px 34px 28px', marginTop: 8, borderTop: '1px solid var(--line)', display: 'flex', gap: 40 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 28 }}>医学经理 / 复核人签字</div>
            <div style={{ borderTop: '1px solid var(--ink-300)', paddingTop: 5, fontSize: 11.5, color: 'var(--ink-500)' }}>{prof.name} · {prof.role}　　　日期：________</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: 'var(--ink-400)', marginBottom: 28 }}>研究者 (PI) 确认签字</div>
            <div style={{ borderTop: '1px solid var(--ink-300)', paddingTop: 5, fontSize: 11.5, color: 'var(--ink-500)' }}>________________　日期：________</div>
          </div>
        </div>
        <div style={{ padding: '12px 34px', background: 'var(--surface-2)', borderTop: '1px solid var(--line)', fontSize: 10.5, color: 'var(--ink-400)', lineHeight: 1.5 }}>
          本意见书由 AI 辅助生成，所有判定均标注原文出处供核验。AI 结论不替代研究者医学判断，最终入组资格以研究者签字确认为准。
        </div>
      </div>

      {/* export rail */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'sticky', top: 80 }}>
        <div className="card" style={{ padding: 'var(--card-pad)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>导出与流转</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button className="btn primary" style={{ width: '100%' }} onClick={() => window.print()}><Icon name="download" size={16} />导出 PDF 意见书</button>
            <button className="btn" style={{ width: '100%' }} onClick={() => window.print()}><Icon name="print" size={16} />打印</button>
          </div>
          <div className="divider" style={{ margin: '16px 0' }} />
          <div style={{ fontSize: 11, color: 'var(--ink-400)', lineHeight: 1.6 }}>
            「导出 PDF」在打印对话框中选择「另存为 PDF」。导出文件含完整比对明细、判定依据与原文出处引用，符合 GCP 源数据可溯源要求。
          </div>
        </div>
        <div className="card" style={{ padding: 'var(--card-pad)' }}>
          <div className="kicker" style={{ marginBottom: 10 }}>审核轨迹</div>
          {[['AI 完成比对', review.reviewedAt, 'sparkle', 0],
            [overriddenCount > 0 ? `医学经理已改判 ${overriddenCount} 项` : '医学经理复核中', patient.updatedAt || '进行中', 'user', 1],
            ['研究者签字', '待处理', 'clock', 2]].map(([t, d, ic, i]) => (
            <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: i < 2 ? 12 : 0 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? 'var(--ok-bg)' : i === 1 ? 'var(--warn-bg)' : 'var(--surface-3)',
                  color: i === 0 ? 'var(--ok)' : i === 1 ? 'var(--warn)' : 'var(--ink-400)', display: 'grid', placeItems: 'center' }}><Icon name={ic} size={12} /></span>
                {i < 2 && <span style={{ width: 1.5, flex: 1, minHeight: 14, background: 'var(--line)' }} />}
              </div>
              <div style={{ paddingTop: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{t}</div>
                <div className="mono" style={{ fontSize: 10.5, color: 'var(--ink-400)' }}>{d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
