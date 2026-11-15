import os, sys, json, asyncio, requests
from google import genai
from pydantic import BaseModel
import edge_tts
from faster_whisper import WhisperModel

PROJECT_ID = sys.argv[1]
TOPIC = sys.argv[2]
VOICE_ID = sys.argv[3] if len(sys.argv) > 3 else "en-US-AndrewNeural"
ASPECT_RATIO = sys.argv[4] if len(sys.argv) > 4 else "16:9"
FPS = 60

def notify_webhook(status: str, progress: int, video_url: str = None, error_msg: str = None):
    if not os.environ.get("WEBHOOK_URL"):
        return
    requests.post(
        os.environ["WEBHOOK_URL"],
        headers={"x-webhook-secret": os.environ["WEBHOOK_SECRET"]},
        json={
            "projectId": PROJECT_ID,
            "status": status,
            "progress": progress,
            "videoUrl": video_url,
            "errorMessage": error_msg,
        },
        timeout=15,
    )

class Beat(BaseModel):
    id: str
    chapter_title: str
    meter_score: int
    visual_type: str  # "TITLE_SLAM", "TERMINAL_LOG", "QUIZ_CARD", "STICKY_CHECKLIST"
    headline: str
    narration: str
    bullets: list[str]

class VideoPlan(BaseModel):
    meter_label: str
    meter_max: int
    aspect_ratio: str
    beats: list[Beat]

async def run():
    try:
        notify_webhook("GENERATING_SCRIPT", 20)
        client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
        prompt = f"""Create a 5-beat tech explainer video script about: {TOPIC}.
        Keep each narration 12-22 words. Alternate visual_type across TITLE_SLAM, TERMINAL_LOG, QUIZ_CARD, and STICKY_CHECKLIST.
        Include 3 concise bullets or code lines per beat."""

        res = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config={"response_mime_type": "application/json", "response_schema": VideoPlan},
        )
        plan = json.loads(res.text)
        plan["aspect_ratio"] = ASPECT_RATIO

        notify_webhook("SYNTHESIZING_AUDIO", 45)
        whisper = WhisperModel("tiny.en", device="cpu", compute_type="int8")
        audio_dir = "worker/video-engine/public/audio"
        os.makedirs(audio_dir, exist_ok=True)

        for idx, beat in enumerate(plan["beats"]):
            mp3_path = f"{audio_dir}/beat_{idx}.mp3"
            comm = edge_tts.Communicate(beat["narration"], VOICE_ID, rate="+8%")
            await comm.save(mp3_path)

            segments, _ = whisper.transcribe(mp3_path, word_timestamps=True)
            words = [
                {"word": w.word.strip(), "startFrame": int(round(w.start * FPS)), "endFrame": int(round(w.end * FPS))}
                for seg in segments for w in seg.words
            ]
            last_frame = words[-1]["endFrame"] if words else 180
            beat["audioFile"] = f"audio/beat_{idx}.mp3"
            beat["durationInFrames"] = last_frame + 30
            beat["words"] = words

        with open("worker/video-engine/src/manifest.json", "w") as f:
            json.dump(plan, f, indent=2)

        notify_webhook("RENDERING_VIDEO", 70)
    except Exception as e:
        notify_webhook("FAILED", 0, error_msg=str(e))
        raise

if __name__ == "__main__":
    asyncio.run(run())