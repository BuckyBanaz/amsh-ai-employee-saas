import asyncio
from backend.ai.speech.tts.cartesia import cartesia_tts

async def test():
    print("API Key configured:", cartesia_tts.is_configured())
    voice_id = "25b902d8-21d9-482a-a922-2619058448f7"
    text = "Main clinic ke appointments, doctors aur services ki jaankari me"
    res = await cartesia_tts.generate_preview_audio(text, voice_id)
    print("Result length:", len(res) if res else "None")

if __name__ == "__main__":
    asyncio.run(test())
