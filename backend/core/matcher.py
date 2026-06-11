"""入排标准 vs 患者档案 → 逐条判定（符合 ok / 存疑 warn / 不符合 no）。"""
import json

from core import llm

# 每次 LLM 调用判定的标准条数（批量减少调用次数，条数过多易截断）
_BATCH_SIZE = 5

_SYSTEM = """你是一名严谨的临床试验医学审核员，负责逐条判定患者是否满足入排标准。

判定规则（必须严格遵守）：
1. verdict 只能是三种之一：
   - "ok"：该条标准对入组无障碍。入选标准被满足 → ok；排除标准未被触发 → ok
   - "no"：该条标准构成入组障碍。入选标准不满足 → no；排除标准被触发 → no
   - "warn"：存疑/无法判断。病历中没有的信息（未做的检查、未提及的病史）、数值临界、
     报告超出筛选窗口期、关键条件无法确认等，一律 warn，绝不臆测
2. 证据必须引用病历原文（evidence），并给出来源文件名与页码（file/page，与输入的【文件：xxx 第n页】标记一致）；
   没有任何相关记录时 evidence 写明缺什么信息，file 为空字符串
3. 注意检验结果的时效性：如果标准要求筛选期内的数值，而病历中数值日期久远（>90 天）或无日期，应判 warn 并在 basis 中指出
4. 涉及阈值的标准，basis 中要写明实际值与阈值的比较过程
5. value 为该条标准对应的患者关键值（简短，如 "58 岁"、"HbA1c 8.2%"、"待签署"、"无"）
6. conf 为判定置信度（0~1 小数）：证据明确 ≥0.85；临界/时效问题 0.6~0.8；信息缺失 ≤0.6
7. 对 verdict 为 warn 或 no 的条目，给出 rec（处理建议：需补充什么材料 / 复测什么 / 向谁核实；ok 条目 rec 为空字符串）

严格输出以下 JSON 格式：
{
  "judgments": [
    {"id": "标准编号（与输入一致，如 I1）", "verdict": "ok/warn/no", "value": "患者关键值",
     "basis": "判定推理过程（含数值比较、时效性说明）", "evidence": "病历原文引用",
     "file": "来源文件名", "page": 1, "conf": 0.9, "rec": ""}
  ]
}
judgments 数组必须与输入的标准条数一一对应，不得遗漏。"""


def _judge_batch(criteria: list[dict], profile: dict, raw_text: str) -> list[dict]:
    crit_lines = "\n".join(
        f"{c['id']}.（{'入选标准' if c['type'] == 'in' else '排除标准'}）{c['text']}"
        f"（分类：{c.get('cat', '')}；要素：{c.get('key_elements', '')}）"
        for c in criteria
    )
    user = f"""【待判定标准】
{crit_lines}

【患者结构化档案】
{json.dumps(profile, ensure_ascii=False, indent=1)}

【病历原文（OCR）】
{raw_text}

请对上述 {len(criteria)} 条标准逐条判定。"""
    result = llm.chat_json(_SYSTEM, user)
    judgments = result.get("judgments", [])
    if len(judgments) != len(criteria):
        raise RuntimeError(f"判定条数不符：期望{len(criteria)}条，返回{len(judgments)}条")
    return judgments


def judge_all(criteria: list[dict], profile: dict, raw_text: str, progress_cb=None) -> dict:
    """逐条判定全部入排标准 → {critId: 判定对象}。"""
    results = {}
    done = 0
    for i in range(0, len(criteria), _BATCH_SIZE):
        batch = criteria[i:i + _BATCH_SIZE]
        try:
            judgments = _judge_batch(batch, profile, raw_text)
        except RuntimeError:
            # 批量条数不符时逐条重试，保证不遗漏
            judgments = []
            for c in batch:
                judgments.extend(_judge_batch([c], profile, raw_text))
        for c, j in zip(batch, judgments):
            j["id"] = c["id"]
            if j.get("verdict") not in ("ok", "warn", "no"):
                j["verdict"] = "warn"
            results[c["id"]] = j
        done += len(batch)
        if progress_cb:
            progress_cb(done, len(criteria))
    return results


def overall(results: dict) -> dict:
    """汇总总体结论（确定性规则，不依赖模型）。"""
    verdicts = [r.get("verdict", "warn") for r in results.values()]
    tally = {"ok": verdicts.count("ok"), "warn": verdicts.count("warn"), "no": verdicts.count("no")}
    if tally["no"] > 0:
        status = "fail"
    elif tally["warn"] > 0:
        status = "review"
    elif tally["ok"] > 0:
        status = "pass"
    else:
        status = "pending"
    return {"status": status, "tally": tally}
