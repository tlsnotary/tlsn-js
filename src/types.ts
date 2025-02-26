export type CommitData = {
  start: number;
  end: number;
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
