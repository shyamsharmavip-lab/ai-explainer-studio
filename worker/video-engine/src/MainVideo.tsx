import React from "react";
import { AbsoluteFill, Series, Audio, staticFile, useCurrentFrame, spring, useVideoConfig } from "remotion";
import manifest from "./manifest.json";

const SyncedCard: React.FC<{ text: string; triggerFrame: number; type: string }> = ({ text, triggerFrame, type }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - triggerFrame, fps, config: { damping: 14, stiffness: 220 } });
  if (frame < triggerFrame) return null;

  const isSticky = type === "STICKY_CHECKLIST";
  return (
    <div style={{
      opacity: progress,
      transform: `translateY(${(1 - progress) * 20}px) ${isSticky ? "rotate(-1deg)" : ""}`,
      background: isSticky ? "#FEF08A" : "#151B28",
      color: isSticky ? "#1E293B" : "#38BDF8",
      border: isSticky ? "2px solid #EAB308" : "1px solid #2D3748",
      borderRadius: 14,
      padding: "20px 26px",
      marginBottom: 18,
      fontSize: 30,
      fontFamily: type === "TERMINAL_LOG" ? "monospace" : "sans-serif",
      fontWeight: 600,
    }}>
      {type === "TERMINAL_LOG" ? `$ ${text}` : `✓ ${text}`}
    </div>
  );
};

export const MainVideo: React.FC = () => {
  const isVertical = manifest.aspect_ratio === "9:16";
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0D12", color: "#F8FAFC", fontFamily: "sans-serif" }}>
      <Series>
        {manifest.beats.map((beat, idx) => (
          <Series.Sequence key={beat.id} durationInFrames={beat.durationInFrames}>
            {beat.audioFile ? <Audio src={staticFile(beat.audioFile)} /> : null}

            {/* Persistent Top HUD */}
            <div style={{
              position: "absolute", top: 44, left: 50, right: 50,
              display: "flex", flexDirection: isVertical ? "column" : "row",
              gap: 14, justifyContent: "space-between", alignItems: isVertical ? "flex-start" : "center"
            }}>
              <div style={{ background: "#1E293B", padding: "10px 20px", borderRadius: 99, fontSize: 20, fontWeight: 700, color: "#94A3B8" }}>
                LVL {idx + 1}/{manifest.beats.length} • {beat.chapter_title.toUpperCase()}
              </div>
              <div style={{ background: "#1E293B", border: "2px solid #F59E0B", padding: "10px 22px", borderRadius: 12, fontSize: 22, fontWeight: 800, color: "#FBBF24" }}>
                {manifest.meter_label}: {beat.meter_score}/{manifest.meter_max}
              </div>
            </div>

            {/* Main Stage */}
            <div style={{ padding: isVertical ? "240px 55px 80px" : "180px 80px 80px", display: "flex", flexDirection: "column", justifyContent: "center", height: "100%" }}>
              <span style={{ color: "#F59E0B", fontSize: 22, fontWeight: 700, marginBottom: 12 }}>[{beat.visual_type}]</span>
              <h1 style={{ fontSize: isVertical ? 54 : 64, fontWeight: 900, lineHeight: 1.12, marginBottom: 38 }}>{beat.headline}</h1>
              {beat.bullets.map((b, i) => (
                <SyncedCard
                  key={i}
                  text={b}
                  type={beat.visual_type}
                  triggerFrame={Math.floor((beat.durationInFrames / (beat.bullets.length + 1)) * (i + 1))}
                />
              ))}
            </div>
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
};