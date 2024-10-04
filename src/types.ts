export type CommitData = {
  start: number;
  end: number;
};

export type ParsedTranscriptData = {
  all: CommitData;
  info: CommitData;
  headers: { [key: string]: CommitData };
  body?: CommitData;
  json?: { [path: string]: CommitData };
  lineBreaks: CommitData[];
};

export type PresentationJSON = {
  version: '0.1.0-alpha.7';
  data: string;
  meta: {
    notaryUrl?: string;
    websocketProxyUrl?: string;
    pluginUrl?: string;
  };
};
