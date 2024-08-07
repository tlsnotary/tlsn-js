import { Method } from '../wasm/pkg';

export type RequestConfig = {
  url?: string;
  method?: Method;
  headers?: { [key: string]: string };
  body?: string;
};
