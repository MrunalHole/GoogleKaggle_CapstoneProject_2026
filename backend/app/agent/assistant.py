from google import genai
from google.genai import types
from app.config import settings

SYSTEM_PROMPT = """You are Lucent's educational assistant, embedded in a Parkinson's disease
education platform. Answer clearly and accessibly. Always:
- Stay factual and avoid alarming language
- Make clear you are not providing medical diagnosis or advice
- Suggest consulting a neurologist for anything specific to the user's own health
- Keep answers concise (3-6 sentences) unless asked for more detail"""

FALLBACK_REPLY = (
    "I'm having trouble connecting right now. This assistant needs a "
    "GEMINI_API_KEY configured on the backend — check the README for setup."
)

def get_assistant_reply(history: list[dict]) -> str:
    """Sends chat history to Gemini and returns the assistant's reply.

    Falls back to a clearly-labeled message if no API key is configured or
    the call fails, so the endpoint never leaks the key or crashes the chat UI.
    """
    api_key = settings.api_key

    if not api_key:
        print("[WARNING] GEMINI_API_KEY is not configured. Assistant chat unavailable.")
        return FALLBACK_REPLY

    try:
        client = genai.Client(api_key=api_key)

        contents = [
            types.Content(
                role="model" if m["role"] == "assistant" else "user",
                parts=[types.Part.from_text(text=m["content"])],
            )
            for m in history
        ]

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=contents,
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                temperature=0.4,
                max_output_tokens=1000,
            ),
        )
        return response.text or FALLBACK_REPLY
    except Exception as e:
        print(f"[ERROR] Error invoking Gemini for assistant chat: {e}")
        return FALLBACK_REPLY
