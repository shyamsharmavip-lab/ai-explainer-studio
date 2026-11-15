import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import manifest from "./manifest.json";

export const RemotionRoot: React.FC = () => {
  const totalFrames = manifest.beats.reduce((sum, b) => sum + b.durationInFrames, 0) || 300;
  const isVertical = manifest.aspect_ratio === "9:16";
  return (
    <Composition
      id="ExplainerVideo"
      component={MainVideo}
      durationInFrames={totalFrames}
      fps={60}
      width={isVertical ? 1080 : 1920}
      height={isVertical ? 1920 : 1080}
    />
  );
};