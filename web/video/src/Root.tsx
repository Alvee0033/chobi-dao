import React from "react";
import { Composition } from "remotion";
import { ChobiDaoLaunch } from "./Video";
import { ShowcaseVideo } from "../../app/showcase/Showcase";

export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="ChobiDaoLaunch"
    component={ChobiDaoLaunch}
    durationInFrames={1800}
    fps={30}
    width={1920}
    height={1080}
  />
  <Composition
    id="ChobiDaoShowcase4K"
    component={ShowcaseVideo}
    durationInFrames={840}
    fps={30}
    width={3840}
    height={2160}
  />
  </>
);
