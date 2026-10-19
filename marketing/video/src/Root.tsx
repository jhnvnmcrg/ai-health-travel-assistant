import { Composition } from "remotion";
import { AITravPH } from "./AITravPH";
import {
  DURATION_S,
  FPS,
  HEIGHT,
  VERTICAL_HEIGHT,
  VERTICAL_WIDTH,
  WIDTH,
} from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="AITravPH"
      component={AITravPH}
      durationInFrames={DURATION_S * FPS}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
    <Composition
      id="AITravPH-Vertical"
      component={AITravPH}
      durationInFrames={DURATION_S * FPS}
      fps={FPS}
      width={VERTICAL_WIDTH}
      height={VERTICAL_HEIGHT}
    />
  </>
);
