"""DeepSeek API 客户端封装：JSON 输出 + 重试。"""
import json
import re
import time

from openai import OpenAI

from core import config

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        if not config.api_key_ready():
            raise RuntimeError("未配置 DEEPSEEK_API_KEY，请在 .env 文件中填写后重启应用")
        _client = OpenAI(api_key=config.DEEPSEEK_API_KEY, base_url=config.DEEPSEEK_BASE_URL)
    return _client


def _extract_json(text: str):
    """从模型输出中提取 JSON（容忍 ```json 代码块包裹）。"""
    text = text.strip()
    m = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if m:
        text = m.group(1)
    return json.loads(text)


def chat_json(system: str, user: str, max_tokens: int = 8000):
    """调用 DeepSeek 返回 JSON 对象，自动重试 3 次（指数退避）。"""
    last_err = None
    for attempt in range(3):
        try:
            resp = get_client().chat.completions.create(
                model=config.DEEPSEEK_MODEL,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
                max_tokens=max_tokens,
                timeout=300,
            )
            return _extract_json(resp.choices[0].message.content)
        except Exception as e:  # 网络超时 / JSON 解析失败均重试
            last_err = e
            time.sleep(2 ** attempt)
    raise RuntimeError(f"DeepSeek 调用失败（已重试3次）：{last_err}")
