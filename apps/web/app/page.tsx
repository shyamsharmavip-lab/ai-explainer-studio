"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StudioPage() {
  const [topic, setTopic] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [voiceId, setVoiceId] = useState("en-US-AndrewNeural");
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("video_projects")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) setProjects(data);
      });

    const channel = supabase
      .channel("realtime-projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "video_projects" }, (payload) => {
        setProjects((prev) => {
          const updated = payload.new as any;
          const exists = prev.find((p) => p.id === updated.id);
          return exists ? prev.map((p) => (p.id === updated.id ? updated : p)) : [updated, ...prev];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setLoading(true);
    await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, voiceId, aspectRatio }),
    });
    setTopic("");
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#0B0D12] text-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-amber-400">⚡ EXPLAINER STUDIO</h1>
          <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-400">Cloud AI Renderer</span>
        </header>

        {/* Generator Form */}
        <form onSubmit={handleGenerate} className="bg-[#131722] border border-slate-800 rounded-2xl p-5 space-y-4">
          <label className="block text-sm font-semibold text-slate-300">Video Topic or Technical Notes</label>
          <textarea
            rows={3}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., How Java Spring Boot Microservices Communicate..."
            className="w-full rounded-xl bg-[#0B0D12] border border-slate-700 p-3 text-sm focus:border-amber-400 outline-none"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Format</label>
              <div className="grid grid-cols-2 gap-2">
                {["16:9", "9:16"].map((ratio) => (
                  <button
                    type="button"
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 rounded-lg text-xs font-bold border ${
                      aspectRatio === ratio
                        ? "bg-amber-400 text-black border-amber-400"
                        : "bg-[#0B0D12] border-slate-700"
                    }`}
                  >
                    {ratio === "16:9" ? "16:9 YouTube" : "9:16 Reels/Shorts"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">AI Narrator</label>
              <select
                value={voiceId}
                onChange={(e) => setVoiceId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0D12] border border-slate-700 p-2 text-xs"
              >
                <option value="en-US-AndrewNeural">Andrew (Tech Explainer)</option>
                <option value="en-US-AvaNeural">Ava (Crisp Narrator)</option>
                <option value="en-US-BrianNeural">Brian (Energetic)</option>
              </select>
            </div>
          </div>

          <button
            disabled={loading}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm transition"
          >
            {loading ? "Dispatching to Cloud..." : "⚡ Generate Explainer Video"}
          </button>
        </form>

        {/* Video Vault & Live Render Status */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold">Your Cloud Videos</h2>
          {projects.map((p) => (
            <div key={p.id} className="bg-[#131722] border border-slate-800 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <p className="font-bold text-sm md:text-base">{p.topic}</p>
                  <span className="text-xs text-slate-400">
                    {p.aspect_ratio} • {p.status}
                  </span>
                </div>
                <span className="text-xs font-mono text-amber-400">{p.progress}%</span>
              </div>

              {p.status !== "COMPLETED" && p.status !== "FAILED" && (
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-400 h-full transition-all duration-500" style={{ width: `${p.progress}%` }} />
                </div>
              )}

              {p.error_message && <p className="text-xs text-red-400">{p.error_message}</p>}

              {p.video_url && (
                <div className="space-y-3 pt-2">
                  <video src={p.video_url} controls playsInline className="w-full rounded-xl bg-black max-h-96" />
                  <a
                    href={p.video_url}
                    download={`${p.id}.mp4`}
                    target="_blank"
                    className="inline-block w-full text-center py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-black font-bold text-xs"
                  >
                    ⬇ Download 1080p MP4
                  </a>
                </div>
              )}
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}