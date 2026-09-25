import asyncio
import websockets
import json

async def test():
    url = "wss://zainab-bootyless-overmasteringly.ngrok-free.dev/media-stream/703b13dc-3d6b-4052-806f-04bceb1e5aa9?codec=pcm"
    try:
        async with websockets.connect(url, open_timeout=10) as ws:
            print("WS connected OK")

            # Step 1: Send connected (like Exotel)
            await ws.send(json.dumps({"event": "connected", "protocol": "Call", "version": "1.0.0"}))
            print("Sent: connected")
            
            # Step 2: Send start event (Exotel format)
            start_event = {
                "event": "start",
                "sequenceNumber": "1",
                "start": {
                    "streamSid": "EXO_STREAM_TEST_001",
                    "callSid": "EXO_CALL_TEST_001",
                    "accountSid": "techycodex1",
                    "from": "+918901414107",
                    "to": "08047284627",
                    "customParameters": {
                        "codec": "pcm"
                    },
                    "mediaFormat": {
                        "encoding": "audio/pcm",
                        "sampleRate": 8000,
                        "bit_rate": "128kbps"
                    }
                },
                "streamSid": "EXO_STREAM_TEST_001"
            }
            await ws.send(json.dumps(start_event))
            print("Sent: start event")

            # Wait for greeting audio (server should start speaking)
            for i in range(10):
                try:
                    msg = await asyncio.wait_for(ws.recv(), timeout=3)
                    data = json.loads(msg)
                    evt = data.get("event")
                    print(f"[{i}] Received event: {evt}")
                    if evt == "media":
                        print("  -> Got audio media frame! AI is speaking. SUCCESS!")
                        break
                    elif evt == "mark":
                        print(f"  -> Got mark: {data.get('mark')}")
                except asyncio.TimeoutError:
                    print(f"[{i}] Timeout waiting for response")
                    break

    except Exception as e:
        print(f"WS FAILED: {type(e).__name__}: {e}")

asyncio.run(test())
