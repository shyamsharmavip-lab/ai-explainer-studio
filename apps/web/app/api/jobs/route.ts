import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { topic, voiceId, aspectRatio } = await req.json();

  const { data: project, error } = await supabase
    .from("video_projects")
    .insert({ topic, voice_id: voiceId, aspect_ratio: aspectRatio })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ghRes = await fetch(
    `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/actions/workflows/cloud-render.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_PAT}`,
        Accept: "application/vnd.github+json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          project_id: project.id,
          topic,
          voice_id: voiceId,
          aspect_ratio: aspectRatio,
        },
      }),
    }
  );

  if (!ghRes.ok) {
    return NextResponse.json({ error: "Failed to trigger cloud render" }, { status: 502 });
  }

  return NextResponse.json({ project });
}