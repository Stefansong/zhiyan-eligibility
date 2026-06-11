"""智研入排 · 本地服务

- 前端静态资源（dist/）与上传原件本地服务
- 病历照片 / PDF / Excel 本地识别（图片不出本机）
- DeepSeek 智能解析：方案标准提取 / 病历结构化 / 入排逐条判定
"""
import re
from pathlib import Path

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from core import config, matcher, ocr, patient_parser, protocol_parser, store

app = FastAPI(title="智研入排", docs_url=None, redoc_url=None)


# ---------- 工具 ----------

def _safe_name(name: str) -> str:
    name = Path(name).name
    return re.sub(r'[\\/:*?"<>|]', "_", name).strip() or "file"


def _doc_kind(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    if ext in ocr.EXCEL_EXTS:
        return "xlsx"
    if ext == ".pdf":
        return "pdf"
    if ext == ".docx":
        return "docx"
    return "image"


_DOC_META = {
    "xlsx": {"icon": "sheet", "type": "检验"},
    "pdf": {"icon": "document", "type": "资料"},
    "docx": {"icon": "document", "type": "资料"},
    "image": {"icon": "file-note", "type": "病历"},
}


def _err(msg: str, code: int = 400):
    return JSONResponse({"error": msg}, status_code=code)


async def _read_upload_text(file: UploadFile | None, text: str | None) -> str:
    """方案输入：上传文件（PDF/DOCX/扫描件）或直接粘贴文本 → 全文。"""
    if text and text.strip():
        return text.strip()
    if file is None:
        raise HTTPException(400, "请上传方案文件或粘贴方案文本")
    data = await file.read()
    kind = _doc_kind(file.filename)
    if kind == "docx":
        return ocr.docx_bytes_to_text(data)
    if kind == "pdf":
        return ocr.pages_to_text([{**p, "file": file.filename} for p in ocr.pdf_bytes_to_pages(data)])
    if kind == "image":
        return ocr.image_bytes_to_text(data)
    raise HTTPException(400, "方案仅支持 PDF / Word / 扫描件")


def _apply_meta(trial: dict, meta: dict, fallback_name: str = "") -> None:
    trial["id"] = meta.get("id") or trial.get("id") or fallback_name or "未命名方案"
    trial["title"] = meta.get("title") or trial.get("title") or fallback_name
    trial["shortTitle"] = meta.get("short_title") or meta.get("shortTitle") or trial.get("shortTitle") or trial["id"]
    trial["phase"] = meta.get("phase") or trial.get("phase") or ""
    trial["sponsor"] = meta.get("sponsor") or trial.get("sponsor") or ""
    trial["version"] = meta.get("version") or trial.get("version") or "v1.0"
    trial["versionDate"] = meta.get("version_date") or meta.get("versionDate") or trial.get("versionDate") or ""
    trial["indication"] = meta.get("indication") or trial.get("indication") or ""
    try:
        trial["target"] = int(meta.get("target") or trial.get("target") or 0)
    except (TypeError, ValueError):
        trial["target"] = 0


# ---------- 全局状态 ----------

@app.get("/api/health")
def health():
    return {"ok": True, "apiKeyReady": config.api_key_ready(), "model": config.DEEPSEEK_MODEL}


@app.get("/api/state")
def state():
    return {
        "apiKeyReady": config.api_key_ready(),
        "trials": [store.trial_with_cohort(t) for t in store.list_trials()],
    }


# ---------- 试验项目 / 研究方案 ----------

@app.post("/api/trials/from-protocol")
async def create_trial_from_protocol(file: UploadFile | None = File(None), text: str | None = Form(None)):
    """新建项目：上传研究方案（或粘贴文本）→ 提取入排标准 → 建项目。"""
    full_text = await _read_upload_text(file, text)
    if len(full_text) < 50:
        raise HTTPException(400, "方案文本过短，未能识别有效内容（扫描件请确认清晰度）")
    extracted = protocol_parser.extract(full_text)
    if not extracted["criteria"]:
        raise HTTPException(422, f"未能从方案中定位入排标准章节。{extracted.get('note', '')}")
    trial = {
        "tid": store.new_id("t"), "demo": False, "anchored": False,
        "parsedAt": store.now_str(), "createdAt": store.now_str(),
        "criteria": extracted["criteria"], "extractNote": extracted.get("note", ""),
        "progress": None,
    }
    _apply_meta(trial, extracted.get("meta", {}), fallback_name=(file.filename if file else "粘贴文本"))
    store.save_trial(trial)
    return store.trial_with_cohort(trial)


@app.post("/api/trials/{tid}/protocol")
async def replace_protocol(tid: str, file: UploadFile | None = File(None), text: str | None = Form(None)):
    """更换 / 重新上传研究方案：重新提取标准（已有患者审核结果不受影响，需重新审核）。"""
    trial = store.load_trial(tid)
    full_text = await _read_upload_text(file, text)
    extracted = protocol_parser.extract(full_text)
    if not extracted["criteria"]:
        raise HTTPException(422, f"未能从方案中定位入排标准章节。{extracted.get('note', '')}")
    trial["criteria"] = extracted["criteria"]
    trial["anchored"] = False
    trial["parsedAt"] = store.now_str()
    trial["extractNote"] = extracted.get("note", "")
    _apply_meta(trial, extracted.get("meta", {}), fallback_name=(file.filename if file else ""))
    store.save_trial(trial)
    return store.trial_with_cohort(trial)


@app.put("/api/trials/{tid}/criteria")
def update_criteria(tid: str, body: dict):
    """人工核对修改标准 / 锚定确认。body: {criteria?: [...], anchored?: bool}"""
    trial = store.load_trial(tid)
    if "criteria" in body:
        trial["criteria"] = body["criteria"]
    if "anchored" in body:
        trial["anchored"] = bool(body["anchored"])
    store.save_trial(trial)
    return store.trial_with_cohort(trial)


@app.delete("/api/trials/{tid}")
def delete_trial(tid: str):
    store.delete_trial(tid)
    return {"ok": True}


# ---------- 患者 ----------

@app.post("/api/trials/{tid}/patients")
def create_patient(tid: str, body: dict):
    store.load_trial(tid)  # 校验存在
    code = (body.get("code") or "").strip()
    if not code:
        raise HTTPException(400, "请填写受试者编号（勿用真实姓名）")
    patient = {
        "pid": store.new_id("p"), "tid": tid, "code": code,
        "initials": (body.get("initials") or "").strip() or code,
        "sex": body.get("sex") or "未知", "age": int(body.get("age") or 0),
        "site": (body.get("site") or "").strip() or "中心 01",
        "createdAt": store.now_str(), "updatedAt": store.now_str(),
        "docs": [], "ocrPages": [], "fields": [], "parseStatus": "idle", "review": None,
    }
    store.save_patient(patient)
    return patient


@app.get("/api/patients/{pid}")
def get_patient(pid: str):
    return store.load_patient(pid)


@app.post("/api/patients/{pid}/documents")
async def upload_documents(pid: str, files: list[UploadFile] = File(...)):
    """上传病历资料（照片/PDF/Excel）→ 本地 OCR / 结构化读取。"""
    patient = store.load_patient(pid)
    fdir = store.files_dir(pid)
    for f in files:
        name = _safe_name(f.filename)
        kind = _doc_kind(name)
        if kind == "docx":
            raise HTTPException(400, f"病历资料暂不支持 Word：{name}（请上传照片 / PDF / Excel）")
        data = await f.read()
        if len(data) > 20 * 1024 * 1024:
            raise HTTPException(400, f"文件超过 20MB：{name}")
        # 重名去重
        stem, suffix = Path(name).stem, Path(name).suffix
        i = 1
        while (fdir / name).exists():
            name = f"{stem}({i}){suffix}"
            i += 1
        (fdir / name).write_bytes(data)
        pages, grid = ocr.file_to_pages(name, data)
        doc = {
            "id": store.new_id("d"), "name": name, "kind": kind,
            "icon": _DOC_META[kind]["icon"], "type": _DOC_META[kind]["type"],
            "pages": len(pages), "date": store.now_str()[:10],
            "real": True, "url": f"/files/{pid}/{name}",
        }
        if grid:
            doc["grid"] = {"sheet": grid["sheet"], "cols": grid["cols"], "rows": grid["rows"][:30]}
        patient["docs"].append(doc)
        for p in pages:
            p["docId"] = doc["id"]
        patient.setdefault("ocrPages", []).extend(pages)
    patient["updatedAt"] = store.now_str()
    store.save_patient(patient)
    return patient


@app.delete("/api/patients/{pid}/documents/{doc_id}")
def delete_document(pid: str, doc_id: str):
    patient = store.load_patient(pid)
    doc = next((d for d in patient["docs"] if d["id"] == doc_id), None)
    if doc:
        patient["docs"] = [d for d in patient["docs"] if d["id"] != doc_id]
        patient["ocrPages"] = [p for p in patient.get("ocrPages", []) if p.get("docId") != doc_id]
        if doc.get("real"):
            (store.files_dir(pid) / doc["name"]).unlink(missing_ok=True)
        patient["updatedAt"] = store.now_str()
        store.save_patient(patient)
    return patient


@app.post("/api/patients/{pid}/parse")
def parse_patient(pid: str):
    """病历识别文本 → AI 结构化字段。"""
    patient = store.load_patient(pid)
    pages = patient.get("ocrPages", [])
    if not pages:
        raise HTTPException(400, "请先上传病历资料")
    raw_text = ocr.pages_to_text(pages)
    if len(raw_text.strip()) < 20:
        raise HTTPException(422, "识别文字过少，请检查照片清晰度或更换资料")
    parsed = patient_parser.parse(raw_text)
    name_to_doc = {d["name"]: d["id"] for d in patient["docs"]}
    fields = []
    for f in parsed.get("fields", []):
        fields.append({
            "k": f.get("k", ""), "v": f.get("v", ""), "raw": f.get("raw", ""),
            "doc": name_to_doc.get(f.get("file") or "", None), "page": f.get("page", 1),
            "conf": float(f.get("conf") or 0.7), "flag": f.get("flag", "") or "",
        })
    patient["fields"] = fields
    summary = parsed.get("summary", {})
    if summary.get("sex") in ("男", "女"):
        patient["sex"] = summary["sex"]
    try:
        if int(summary.get("age") or 0) > 0:
            patient["age"] = int(summary["age"])
    except (TypeError, ValueError):
        pass
    patient["diagnosis"] = summary.get("diagnosis", "")
    patient["parseStatus"] = "done"
    patient["updatedAt"] = store.now_str()
    store.save_patient(patient)
    return patient


@app.post("/api/patients/{pid}/review")
def run_review(pid: str):
    """逐条入排比对审核。"""
    patient = store.load_patient(pid)
    trial = store.load_trial(patient["tid"])
    if not trial.get("anchored"):
        raise HTTPException(400, "请先在「方案 · 入排标准」页核对并锚定入排标准")
    if not patient.get("fields"):
        raise HTTPException(400, "请先上传病历资料并完成智能解析")
    raw_text = ocr.pages_to_text(patient.get("ocrPages", []))
    profile = {"受试者编号": patient["code"], "性别": patient["sex"], "年龄": patient["age"],
               "结构化字段": [{"项目": f["k"], "值": f["v"], "原文": f["raw"]} for f in patient["fields"]]}
    results = matcher.judge_all(trial["criteria"], profile, raw_text)
    name_to_doc = {d["name"]: d["id"] for d in patient["docs"]}
    for r in results.values():
        r["doc"] = name_to_doc.get(r.pop("file", "") or "", None)
    patient["review"] = {"results": results, "decisions": {}, "reviewedAt": store.now_str(),
                         "criteriaSnapshot": trial["criteria"]}
    patient["updatedAt"] = store.now_str()
    store.save_patient(patient)
    return patient


@app.put("/api/patients/{pid}/decisions")
def save_decisions(pid: str, body: dict):
    """人工改判持久化。body: {decisions: {I1: 'ok'|'warn'|'no'}}"""
    patient = store.load_patient(pid)
    if not patient.get("review"):
        raise HTTPException(400, "该患者尚未运行审核")
    decisions = {k: v for k, v in (body.get("decisions") or {}).items() if v in ("ok", "warn", "no")}
    patient["review"]["decisions"] = decisions
    patient["updatedAt"] = store.now_str()
    store.save_patient(patient)
    return patient


@app.delete("/api/patients/{pid}")
def delete_patient(pid: str):
    store.delete_patient(pid)
    return {"ok": True}


# ---------- 上传原件 ----------

@app.get("/files/{pid}/{filename}")
def get_file(pid: str, filename: str):
    path = store.files_dir(pid) / _safe_name(filename)
    if not path.exists():
        raise HTTPException(404, "文件不存在")
    return FileResponse(path)


# ---------- 前端静态资源（SPA） ----------

if config.FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=config.FRONTEND_DIST, html=True), name="frontend")


@app.exception_handler(HTTPException)
async def http_exc_handler(request, exc: HTTPException):
    return JSONResponse({"error": exc.detail}, status_code=exc.status_code)


@app.exception_handler(RuntimeError)
async def runtime_exc_handler(request, exc: RuntimeError):
    return JSONResponse({"error": str(exc)}, status_code=500)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8780)
