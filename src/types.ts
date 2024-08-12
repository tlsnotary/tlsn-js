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

export type ProofData = {
  time: number;
  server_dns: string;
  sent: string;
  sent_auth_ranges: { start: number; end: number }[];
  recv: string;
  recv_auth_ranges: { start: number; end: number }[];
};
