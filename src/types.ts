export type CommitData = {
  start: number;
  end: number;
};

export type ParsedTranscriptData = {
  start: number;
  end: number;
  info?: CommitData;
  headers?: { [key: string]: CommitData };
  body?: CommitData;
  json?: { [path: string]: CommitData };
};
