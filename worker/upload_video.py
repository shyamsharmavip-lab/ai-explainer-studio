import os, sys, requests
from supabase import create_client

PROJECT_ID = sys.argv[1]
LOCAL_MP4 = "worker/video-engine/out/video.mp4"
REMOTE_PATH = f"{PROJECT_ID}.mp4"

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
with open(LOCAL_MP4, "rb") as f:
    sb.storage.from_("explainer-videos").upload(REMOTE_PATH, f, {"content-type": "video/mp4"})

public_url = sb.storage.from_("explainer-videos").get_public_url(REMOTE_PATH)

requests.post(
    os.environ["WEBHOOK_URL"],
    headers={"x-webhook-secret": os.environ["WEBHOOK_SECRET"]},
    json={"projectId": PROJECT_ID, "status": "COMPLETED", "progress": 100, "videoUrl": public_url},
    timeout=15,
)