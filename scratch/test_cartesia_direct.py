import asyncio
import httpx
from backend.server.common.config import get_settings

async def test_cartesia():
    settings = get_settings()
    api_key = getattr(settings, "CARTESIA_API_KEY", "")
    print("API key present:", bool(api_key), api_key[:10] if api_key else "")
    
    client = httpx.AsyncClient()
    
    # Test 1: get voices with X-API-Key vs Bearer
    for header_name, header_val in [
        ("X-API-Key", api_key),
        ("Authorization", f"Bearer {api_key}")
    ]:
        try:
            r = await client.get(
                "https://api.cartesia.ai/voices",
                headers={header_name: header_val, "Cartesia-Version": "2024-11-13"}
            )
            print(f"Voices ({header_name}): status {r.status_code}, length {len(r.content)}")
        except Exception as e:
            print(f"Voices error ({header_name}):", e)

    # Test 2: POST /tts/bytes
    payload = {
        "model_id": "sonic-english", # or sonic-multilingual? or sonic-3.5?
        "transcript": "Hello, welcome to our clinic.",
        "voice": {
            "mode": "id",
            "id": "a631bc8b-ea1c-49bb-8dab-7a118afd11b8",
        },
        "output_format": {
            "container": "raw",
            "encoding": "pcm_mulaw",
            "sample_rate": 8000,
        },
    }
    
    # Try different models and versions
    for model in ["sonic-english", "sonic-multilingual", "sonic-3.5"]:
        payload["model_id"] = model
        for version in ["2024-11-13", "2024-06-10"]:
            r = await client.post(
                "https://api.cartesia.ai/tts/bytes",
                headers={
                    "X-API-Key": api_key,
                    "Cartesia-Version": version,
                    "Content-Type": "application/json"
                },
                json=payload
            )
            print(f"TTS bytes ({model}, v={version}): status {r.status_code}, response: {r.text[:120]}")

if __name__ == "__main__":
    asyncio.run(test_cartesia())
