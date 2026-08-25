export const SECONDS_PER_TIME_UNIT = 2.4;
const STAGE_END_EPSILON = 0.001;

export type PlaybackSpeed = 0.5 | 1 | 2;

export function getFullPlaybackAriaLabel(playing: boolean, hasStarted: boolean) {
  if (playing) return "暂停全流程";
  return hasStarted ? "继续全流程" : "播放全流程";
}

export function advancePlayback(
  current: number,
  elapsedMs: number,
  speed: PlaybackSpeed,
  stopAt: number,
) {
  const elapsedTimeUnits = (elapsedMs / 1000) * (speed / SECONDS_PER_TIME_UNIT);
  return Math.min(stopAt, current + elapsedTimeUnits);
}

export function advanceLoopingPlayback(
  current: number,
  elapsedMs: number,
  speed: PlaybackSpeed,
  loopStart: number,
  loopEnd: number,
) {
  const loopDuration = loopEnd - loopStart;
  if (loopDuration <= 0) return loopStart;
  const currentInRange = current >= loopStart && current < loopEnd ? current : loopStart;
  const elapsedTimeUnits = (elapsedMs / 1000) * (speed / SECONDS_PER_TIME_UNIT);
  const nextOffset = (currentInRange - loopStart + elapsedTimeUnits) % loopDuration;
  return loopStart + nextOffset;
}

export function getStagePlaybackEnd(endTime: number) {
  return Math.max(0, endTime - STAGE_END_EPSILON);
}
