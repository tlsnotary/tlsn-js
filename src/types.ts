import { Method } from '../wasm/pkg';

export type RequestConfig = {
  url?: string;
  method?: Method;
  headers?: { [key: string]: string };
  body?: string;
};

export type CommitData = {
  // value: string;
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
