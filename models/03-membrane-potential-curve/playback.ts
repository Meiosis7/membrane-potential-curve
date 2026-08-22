export const SECONDS_PER_TIME_UNIT = 2.4;
const STAGE_END_EPSILON = 0.001;

export type PlaybackSpeed = 0.5 | 1 | 2;

export function advancePlayback(
  current: number,
  elapsedMs: number,
  speed: PlaybackSpeed,
  stopAt: number,
) {
  const elapsedTimeUnits = (elapsedMs / 1000) * (speed / SECONDS_PER_TIME_UNIT);
  return Math.min(stopAt, current + elapsedTimeUnits);
}

export function getStagePlaybackEnd(endTime: number) {
  return Math.max(0, endTime - STAGE_END_EPSILON);
}
