import React from "react";
import { Composition } from "remotion";
import { ChobiDaoLaunch } from "./Video";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="ChobiDaoLaunch"
    component={ChobiDaoLaunch}
    durationInFrames={1800}
    fps={30}
    width={1920}
    height={1080}
  />
);
