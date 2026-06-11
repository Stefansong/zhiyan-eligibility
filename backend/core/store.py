"""data/ 目录下的 JSON 读写与记录管理。

trials/<tid>.json          — 试验项目（含入排标准）
patients/<pid>/patient.json — 患者档案（文档、OCR、结构化字段、审核结果）
patients/<pid>/files/      — 上传的病历原件
"""
import json
import shutil
import time
import uuid
from pathlib import Path

from core import config


def new_id(prefix: str) -> str:
    return f"{prefix}_{time.strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:4]}"


def now_str() -> str:
    return time.strftime("%Y-%m-%d %H:%M")


def save_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


# ---------- 试验项目 ----------

def list_trials() -> list[dict]:
    items = [load_json(f) for f in config.TRIALS_DIR.glob("*.json")]
    items.sort(key=lambda t: t.get("createdAt", ""))
    return items


def save_trial(trial: dict) -> None:
    save_json(config.TRIALS_DIR / f"{trial['tid']}.json", trial)


def load_trial(tid: str) -> dict:
    return load_json(config.TRIALS_DIR / f"{tid}.json")


def delete_trial(tid: str) -> None:
    (config.TRIALS_DIR / f"{tid}.json").unlink(missing_ok=True)
    for p in list_patients(tid):
        delete_patient(p["pid"])


# ---------- 患者 ----------

def patient_dir(pid: str) -> Path:
    return config.PATIENTS_DIR / pid


def files_dir(pid: str) -> Path:
    d = patient_dir(pid) / "files"
    d.mkdir(parents=True, exist_ok=True)
    return d


def list_patients(tid: str | None = None) -> list[dict]:
    items = []
    for d in config.PATIENTS_DIR.iterdir():
        f = d / "patient.json"
        if d.is_dir() and f.exists():
            p = load_json(f)
            if tid is None or p.get("tid") == tid:
                items.append(p)
    items.sort(key=lambda p: p.get("updatedAt", ""), reverse=True)
    return items


def save_patient(patient: dict) -> None:
    save_json(patient_dir(patient["pid"]) / "patient.json", patient)


def load_patient(pid: str) -> dict:
    return load_json(patient_dir(pid) / "patient.json")


def delete_patient(pid: str) -> None:
    shutil.rmtree(patient_dir(pid), ignore_errors=True)


# ---------- 队列行（仪表盘） ----------

def cohort_row(p: dict) -> dict:
    """患者档案 → 仪表盘队列行（判定统计来自审核结果 + 人工改判）。"""
    review = p.get("review")
    if not review:
        status, ok, warn, no, pct = ("pending", 0, 0, 0, 0)
    else:
        decisions = review.get("decisions", {})
        verdicts = [decisions.get(cid) or r.get("verdict", "warn") for cid, r in review["results"].items()]
        ok, warn, no = verdicts.count("ok"), verdicts.count("warn"), verdicts.count("no")
        total = max(1, len(verdicts))
        pct = round(ok / total * 100)
        # 存疑项未裁定完 → 始终视为待复核；全部裁定后有不符合 → 筛选失败
        status = "review" if warn > 0 else ("fail" if no > 0 else "pass")
    return {"pid": p["pid"], "id": p["code"], "initials": p["initials"], "sex": p["sex"],
            "age": p["age"], "site": p["site"], "updated": p.get("updatedAt", ""),
            "status": status, "ok": ok, "warn": warn, "no": no, "pct": pct}


def trial_with_cohort(trial: dict) -> dict:
    cohort = [cohort_row(p) for p in list_patients(trial["tid"])]
    enrolled = (trial.get("progress") or {}).get("enrolled")
    if enrolled is None:
        enrolled = sum(1 for r in cohort if r["status"] == "pass")
    return {**trial, "cohort": cohort,
            "progress": {"enrolled": enrolled, "target": trial.get("target") or max(1, len(cohort))}}
