export type CommitData = {
  start: number;
  end: number;
};

export type PresentationJSON = {
  version: '0.1.0-alpha.7' | '0.1.0-alpha.8' | '0.1.0-alpha.9' | '0.1.0-alpha.10';
  data: string;
  meta: {
    notaryUrl?: string;
    websocketProxyUrl?: string;
    pluginUrl?: string;
  };
};
