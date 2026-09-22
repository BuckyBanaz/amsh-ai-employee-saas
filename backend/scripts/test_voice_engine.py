import asyncio
import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from dotenv import load_dotenv
load_dotenv()

from backend.ai.speech.tts.cartesia import cartesia_tts
from backend.ai.speech.stt.deepgram import DeepgramLiveConnection


async def test_tts_and_stt():
    print(f"CARTESIA API KEY : {cartesia_tts.api_key[:10]}...")
    print("Testing Cartesia TTS speech streaming...")
    chunks = []
    total_bytes = 0
    async for chunk in cartesia_tts.stream_speech("Hello, thank you for calling Apollo Clinic. How can I help you?"):
        chunks.append(chunk)
        total_bytes += len(chunk)
    
    print(f"-> TTS Chunks Received: {len(chunks)}")
    print(f"-> TTS Total Bytes: {total_bytes}")

    if total_bytes == 0:
        print("❌ CRITICAL ERROR: Cartesia TTS returned 0 bytes! (Check Cartesia API Key or model/voice ID)")
    else:
        print("✅ Cartesia TTS is working perfectly and generating audio!")

if __name__ == "__main__":
    asyncio.run(test_tts_and_stt())
