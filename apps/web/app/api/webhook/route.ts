import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  if (req.headers.get("x-webhook-secret") !== process.env.WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, status, progress, videoUrl, errorMessage } = await req.json();

  await supabase
    .from("video_projects")
    .update({
      status,
      progress,
      ...(videoUrl && { video_url: videoUrl }),
      ...(errorMessage && { error_message: errorMessage }),
    })
    .eq("id", projectId);

  return NextResponse.json({ ok: true });
}