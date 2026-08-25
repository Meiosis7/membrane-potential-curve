export function parseProfileProcessIds(processList, userDataDirectory) {
  const profileArgument = `--user-data-dir=${userDataDirectory}`;
  return processList
    .split("\n")
    .filter((line) => line.endsWith(profileArgument) || line.includes(`${profileArgument} `))
    .map((line) => Number(line.trim().match(/^\d+/)?.[0]))
    .filter(Number.isInteger);
}

export function nextStableEmptyCount(previousCount, processIds) {
  return processIds.length === 0 ? previousCount + 1 : 0;
}
