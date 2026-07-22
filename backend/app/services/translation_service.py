"""Machine-translates product description HTML via the free MyMemory API.

Only ever called for the storefront's Description block (see specs/06-i18n.md) - product
names, vendor/model names, etc. are never translated. Results are cached in-process, keyed by
a hash of (target language, source HTML), so an admin editing a description naturally busts the
cache for that description without any explicit invalidation.
"""

import asyncio
import hashlib

import httpx
from bs4 import BeautifulSoup

from app.config import settings

MYMEMORY_URL = "https://api.mymemory.translated.net/get"

_cache: dict[str, str] = {}


async def _translate_text(client: httpx.AsyncClient, text: str, target_lang: str) -> str:
    params = {"q": text, "langpair": f"en|{target_lang}"}
    if settings.mymemory_email:
        params["de"] = settings.mymemory_email
    response = await client.get(MYMEMORY_URL, params=params, timeout=10.0)
    response.raise_for_status()
    data = response.json()
    translated = data.get("responseData", {}).get("translatedText")
    if not translated:
        raise ValueError("MyMemory returned no translation")
    return translated


async def translate_html(html: str, target_lang: str) -> str:
    """Translate each text node in `html`, preserving surrounding tags/formatting.

    Falls back to leaving individual fragments untranslated (rather than failing the whole
    description) if a single MyMemory call errors out.
    """
    cache_key = hashlib.sha256(f"{target_lang}:{html}".encode()).hexdigest()
    cached = _cache.get(cache_key)
    if cached is not None:
        return cached

    soup = BeautifulSoup(html, "html.parser")
    text_nodes = [node for node in soup.find_all(string=True) if node.strip()]
    if not text_nodes:
        return html

    async with httpx.AsyncClient() as client:
        translations = await asyncio.gather(
            *(_translate_text(client, str(node), target_lang) for node in text_nodes),
            return_exceptions=True,
        )

    for node, translation in zip(text_nodes, translations):
        if isinstance(translation, Exception):
            continue
        node.replace_with(translation)

    result = str(soup)
    _cache[cache_key] = result
    return result
