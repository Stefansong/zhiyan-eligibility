/* ============================================================
   api.js — 本地后端 API 客户端
   开发环境经 Vite 代理到 127.0.0.1:8780；生产由后端同源服务
   ============================================================ */

async function request(path, options = {}) {
  const res = await fetch(path, options);
  let body = null;
  try { body = await res.json(); } catch (e) { /* 非 JSON 响应 */ }
  if (!res.ok) {
    throw new Error((body && (body.error || body.detail)) || `请求失败（${res.status}）`);
  }
  return body;
}

const json = (method) => (path, data) =>
  request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const api = {
  state: () => request('/api/state'),
  health: () => request('/api/health'),

  // 试验项目 / 研究方案
  createTrialFromProtocol: (formData) => request('/api/trials/from-protocol', { method: 'POST', body: formData }),
  replaceProtocol: (tid, formData) => request(`/api/trials/${tid}/protocol`, { method: 'POST', body: formData }),
  updateCriteria: (tid, body) => json('PUT')(`/api/trials/${tid}/criteria`, body),
  deleteTrial: (tid) => request(`/api/trials/${tid}`, { method: 'DELETE' }),

  // 患者
  createPatient: (tid, body) => json('POST')(`/api/trials/${tid}/patients`, body),
  getPatient: (pid) => request(`/api/patients/${pid}`),
  uploadDocuments: (pid, formData) => request(`/api/patients/${pid}/documents`, { method: 'POST', body: formData }),
  deleteDocument: (pid, docId) => request(`/api/patients/${pid}/documents/${docId}`, { method: 'DELETE' }),
  parsePatient: (pid) => request(`/api/patients/${pid}/parse`, { method: 'POST' }),
  runReview: (pid) => request(`/api/patients/${pid}/review`, { method: 'POST' }),
  saveDecisions: (pid, decisions) => json('PUT')(`/api/patients/${pid}/decisions`, { decisions }),
  deletePatient: (pid) => request(`/api/patients/${pid}`, { method: 'DELETE' }),
};

/* 轻量全局提示（App 监听渲染） */
export function toast(message, tone = 'info') {
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, tone, ts: Date.now() } }));
}
