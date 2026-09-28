import asyncio
import httpx
from backend.server.common.config import get_settings

async def test():
    settings = get_settings()
    api_key = getattr(settings, "CARTESIA_API_KEY", "")
    client = httpx.AsyncClient()
    
    for model in ["sonic-3.6", "sonic-preview", "sonic-3.5"]:
        payload = {
            "model_id": model,
            "transcript": "Hello, welcome to our clinic.",
            "voice": {
                "mode": "id",
                "id": "a631bc8b-ea1c-49bb-8dab-7a118afd11b8",
            },
            "output_format": {
                "container": "mp3",
                "encoding": "mp3",
                "sample_rate": 44100,
            },
        }
        r = await client.post(
            "https://api.cartesia.ai/tts/bytes",
            headers={
                "X-API-Key": api_key,
                "Cartesia-Version": "2024-11-13",
                "Content-Type": "application/json"
            },
            json=payload
        )
        print(f"Model {model}: status {r.status_code}, len: {len(r.content)}")
        if r.status_code != 200:
            print(f"  Error: {r.text[:200]}")

if __name__ == "__main__":
    asyncio.run(test())
