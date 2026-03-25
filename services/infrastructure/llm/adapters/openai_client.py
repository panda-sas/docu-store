from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import TYPE_CHECKING, Any

import structlog

from infrastructure.llm.token_counter import extract_usage_from_response, record_usage

if TYPE_CHECKING:
    from langchain_openai import ChatOpenAI

log = structlog.get_logger(__name__)


class OpenAILLMClient:
    """LLMClientPort adapter backed by OpenAI via LangChain.

    Lazy-loads langchain_openai. Requires LLM_API_KEY (OPENAI_API_KEY) to be set.
    """

    def __init__(
        self,
        model_name: str = "gpt-4o-mini",
        api_key: str | None = None,
        temperature: float = 0.1,
        langfuse_handler: Any | None = None,
    ) -> None:
        self._model_name = model_name
        self._api_key = api_key
        self._temperature = temperature
        self._langfuse_handler = langfuse_handler
        self._llm: ChatOpenAI | None = None

    def _get_llm(self) -> ChatOpenAI:
        if self._llm is None:
            from langchain_openai import ChatOpenAI

            self._llm = ChatOpenAI(
                model=self._model_name,
                api_key=self._api_key,
                temperature=self._temperature,
                stream_usage=True,
            )
        return self._llm

    async def complete(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        temperature: float | None = None,
    ) -> str:
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = self._get_llm()
        if temperature is not None:
            llm = llm.bind(temperature=temperature)

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=prompt))

        log.debug("openai.complete", model=self._model_name)
        config = {"callbacks": [self._langfuse_handler]} if self._langfuse_handler else {}
        response = await llm.ainvoke(messages, config=config)
        p, c = extract_usage_from_response(response)
        record_usage(p, c)
        return str(response.content)

    async def stream(
        self,
        prompt: str,
        *,
        system_prompt: str | None = None,
        temperature: float | None = None,
        images_b64: list[str] | None = None,
    ) -> AsyncGenerator[str, None]:
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = self._get_llm()
        if temperature is not None:
            llm = llm.bind(temperature=temperature)

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))

        if images_b64:
            content: list[dict] = [{"type": "text", "text": prompt}]
            for img in images_b64:
                content.append(
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{img}"},
                    },
                )
            messages.append(HumanMessage(content=content))
        else:
            messages.append(HumanMessage(content=prompt))

        log.debug("openai.stream", model=self._model_name)
        config = {"callbacks": [self._langfuse_handler]} if self._langfuse_handler else {}
        last_chunk = None
        async for chunk in llm.astream(messages, config=config):
            last_chunk = chunk
            if chunk.content:
                yield str(chunk.content)
        # Stream usage is typically on the final chunk
        if last_chunk is not None:
            p, c = extract_usage_from_response(last_chunk)
            record_usage(p, c)

    async def complete_with_image(
        self,
        prompt: str,
        image_b64: str,
        *,
        system_prompt: str | None = None,
    ) -> str:
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = self._get_llm()

        image_content = [
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{image_b64}"},
            },
        ]

        messages = []
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        messages.append(HumanMessage(content=image_content))

        log.debug("openai.complete_with_image", model=self._model_name)
        config = {"callbacks": [self._langfuse_handler]} if self._langfuse_handler else {}
        response = await llm.ainvoke(messages, config=config)
        p, c = extract_usage_from_response(response)
        record_usage(p, c)
        return str(response.content)

    async def get_model_info(self) -> dict[str, str]:
        return {"provider": "openai", "model_name": self._model_name}
