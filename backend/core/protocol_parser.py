"""研究方案文本 → 结构化入排标准（带章节锚定）。"""
import re

from core import llm

# 方案全文可能上百页，超过该字符数时先按关键词截取入排标准章节附近的窗口
_MAX_CHARS = 60000
_WINDOW = 25000

_SYSTEM = """你是一名资深临床试验方案专家，负责从研究方案中提取试验信息和入选/排除标准。

要求：
1. 逐条提取入排标准，保持原文措辞，不要改写、合并或遗漏任何一条
2. 每条标准给出分类标签（cat），从以下选项中选：人口学、诊断、分期、体能状态、实验室、器官功能、既往用药、既往治疗、合并症、合并用药、生育相关、心血管、过敏史、影像、合规、其他
3. 提取可量化的关键要素 key_elements（阈值、区间、时间窗），便于后续判定
4. 记录每条标准在方案中的章节号与页码（sec/page，识别不到留空字符串）
5. 同时从文本识别试验元信息（识别不到的字段留空字符串）
6. 如果文本中找不到入排标准章节，inclusion 和 exclusion 返回空数组，并在 note 中说明

严格输出以下 JSON 格式：
{
  "meta": {
    "id": "方案编号（如 ABC-301）",
    "title": "试验完整题目",
    "short_title": "简短题目（≤20字，如：XZ-417 联合治疗 T2DM）",
    "phase": "试验分期（如：III 期）",
    "sponsor": "申办方",
    "version": "方案版本（如 Protocol v3.1）",
    "version_date": "版本日期 YYYY-MM-DD",
    "indication": "适应症",
    "target": "目标入组例数（纯数字，识别不到为 0）"
  },
  "inclusion": [
    {"text": "标准原文", "cat": "分类标签", "key_elements": "可量化要素", "sec": "4.1 入选标准", "page": "P.24"}
  ],
  "exclusion": [
    {"text": "标准原文", "cat": "分类标签", "key_elements": "...", "sec": "", "page": ""}
  ],
  "note": "提取过程中的说明（可为空字符串）"
}"""


def _focus_text(text: str) -> str:
    """长文本截取：定位入选/排除标准关键词附近的窗口。"""
    if len(text) <= _MAX_CHARS:
        return text
    keywords = ["入选标准", "入组标准", "排除标准", "受试者选择", "Inclusion Criteria", "Exclusion Criteria"]
    positions = []
    for kw in keywords:
        for m in re.finditer(re.escape(kw), text, re.IGNORECASE):
            positions.append(m.start())
    if not positions:
        return text[:_MAX_CHARS]
    start = max(0, min(positions) - 2000)
    end = min(len(text), max(positions) + _WINDOW)
    return text[start:end][:_MAX_CHARS]


def extract(protocol_text: str) -> dict:
    """提取并整理为产品内部格式：criteria 列表（id I1.. / E1..）。"""
    raw = llm.chat_json(_SYSTEM, f"请从以下研究方案文本中提取试验信息与入排标准：\n\n{_focus_text(protocol_text)}")
    criteria = []
    for i, c in enumerate(raw.get("inclusion", []), start=1):
        criteria.append({
            "id": f"I{i}", "type": "in", "no": f"入选 {i}",
            "text": c.get("text", ""), "cat": c.get("cat", "其他"),
            "key_elements": c.get("key_elements", ""),
            "source": {"sec": c.get("sec", "") or "入选标准", "page": c.get("page", "")},
        })
    for i, c in enumerate(raw.get("exclusion", []), start=1):
        criteria.append({
            "id": f"E{i}", "type": "ex", "no": f"排除 {i}",
            "text": c.get("text", ""), "cat": c.get("cat", "其他"),
            "key_elements": c.get("key_elements", ""),
            "source": {"sec": c.get("sec", "") or "排除标准", "page": c.get("page", "")},
        })
    return {"meta": raw.get("meta", {}), "criteria": criteria, "note": raw.get("note", "")}
