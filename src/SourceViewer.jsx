/* ============================================================
   SourceViewer.jsx — 原文出处追溯抽屉
   显示上传的病历原件（照片 / PDF / Excel）+ 判定引用片段对照
   ============================================================ */
import React from 'react';
import { Icon } from './icons.jsx';

/* 上传文档查看器 */
function DocViewer({ doc, zoom }) {
  if (doc.kind === 'image') {
    return (
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform .2s' }}>
        <img src={doc.url} alt={doc.name}
          style={{ width: '100%', borderRadius: 6, border: '1px solid var(--line-strong)', boxShadow: '0 2px 10px rgba(21,32,43,.1)', display: 'block' }} />
      </div>
    );
  }
  if (doc.kind === 'pdf') {
    return (
      <iframe src={doc.url} title={doc.name}
        style={{ width: '100%', height: '72vh', border: '1px solid var(--line-strong)', borderRadius: 6, background: '#fff' }} />
    );
  }
  if (doc.kind === 'xlsx' && doc.grid) {
    return (
      <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', background: '#fff', border: '1px solid #D8E3DB',
        borderRadius: 6, boxShadow: '0 2px 10px rgba(21,32,43,.1)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '2px solid #1E6B3C', background: '#EDF5EF', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="sheet" size={16} style={{ color: '#1E6B3C' }} />
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#1E4A2E' }}>{doc.name}</span>
          <span style={{ fontSize: 11, color: '#5E8068', marginLeft: 'auto' }}>{doc.grid.sheet} · 数据表导入</span>
        </div>
        <div style={{ padding: 14, overflowX: 'auto' }}>
          <table className="mono" style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
            <thead>
              <tr>
                {doc.grid.cols.map((c, i) => (
                  <th key={i} style={{ padding: '6px 8px', fontWeight: 600, fontSize: 10.5, textAlign: 'left',
                    background: '#F2F6F3', color: '#456B52', border: '1px solid #DCE6DE', whiteSpace: 'nowrap' }}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {doc.grid.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j} style={{ padding: '6px 8px', border: '1px solid #E4ECE6', color: '#2B3A30' }}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  return (
    <div style={{ padding: 30, textAlign: 'center', color: 'var(--ink-400)' }}>
      <Icon name="document" size={26} />
      <div style={{ marginTop: 8, fontSize: 13 }}>无法预览该文件类型</div>
    </div>
  );
}

/* 出处追溯抽屉 */
export function SourceDrawer({ open, onClose, doc, title, quote }) {
  const [zoom, setZoom] = React.useState(1);
  React.useEffect(() => { if (open) setZoom(1); }, [open, doc && doc.id]);

  return (
    <>
      <div onClick={onClose} className="no-print" style={{
        position: 'fixed', inset: 0, background: 'rgba(21,32,43,.32)', zIndex: 60,
        opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .22s',
      }} />
      <div className="no-print" style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 480, maxWidth: '92vw', zIndex: 61,
        background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)', transition: 'transform .26s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="kicker" style={{ marginBottom: 3 }}>原文出处 · Source</div>
            <div style={{ fontSize: 14.5, fontWeight: 600 }}>{title || '病历原始资料'}</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <button className="btn ghost sm" style={{ padding: 7 }} onClick={() => setZoom(z => Math.min(1.5, z + 0.15))}><Icon name="zoomIn" size={17} /></button>
            <button className="btn ghost sm" style={{ padding: 7 }} onClick={onClose}><Icon name="x" size={17} /></button>
          </div>
        </div>
        {doc && (
          <div style={{ padding: '10px 20px', background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--ink-500)' }}>
            <Icon name={doc.icon} size={15} style={{ color: 'var(--primary)' }} />
            <span style={{ fontWeight: 600, color: 'var(--ink-700)' }}>{doc.name}</span>
            <span className="chip" style={{ padding: '2px 7px', fontSize: 10.5 }}>{doc.type}</span>
            <span style={{ marginLeft: 'auto' }} className="mono">{doc.date}</span>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto', padding: '22px 24px', background: 'var(--surface-3)' }}>
          {quote && (
            <div style={{ marginBottom: 14, padding: '10px 13px', background: 'rgba(178,106,0,.08)', border: '1px solid rgba(178,106,0,.3)',
              borderRadius: 8, fontSize: 12.5, color: 'var(--ink-700)', lineHeight: 1.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5, fontSize: 11, fontWeight: 600, color: 'var(--warn)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: 'rgba(178,106,0,.4)', boxShadow: '0 0 0 2px rgba(178,106,0,.4)' }} />
                判定引用的原文片段
              </div>
              「{quote}」
            </div>
          )}
          {doc && <DocViewer doc={doc} zoom={zoom} />}
          <div style={{ textAlign: 'center', marginTop: 16, fontSize: 11, color: 'var(--ink-400)' }}>
            上传的病历原件 · 请对照引用片段核验关键数值
          </div>
        </div>
      </div>
    </>
  );
}
