import { Buffer } from 'buffer';
import { HTTPParser } from 'http-parser-js';

export class Transcript {
  #sent: number[];
  #recv: number[];

  constructor(params: { sent: number[]; recv: number[] }) {
    this.#recv = params.recv;
    this.#sent = params.sent;
  }

  get raw() {
    return {
      recv: this.#recv,
      sent: this.#sent,
    };
  }

  parseRecv() {}

  parseSent() {
    const parser = new HTTPParser(HTTPParser.REQUEST);
    const sent = Buffer.from(this.#sent);
    const body: Buffer[] = [];
    let complete = false;
    let headers: string[] = [];

    parser.onBody = (t) => {
      body.push(t);
    };

    parser.onHeadersComplete = (res) => {
      headers = res.headers;
    };

    parser.onMessageComplete = () => {
      complete = true;
    };

    parser.execute(sent);
    parser.finish();

    if (!complete) throw new Error('Could not parse REQUEST');

    return {
      headers,
      body,
    };
  }

  recv(redactedSymbol = '*') {
    return this.#recv.reduce((recv: string, num) => {
      recv =
        recv + (num === 0 ? redactedSymbol : Buffer.from([num]).toString());
      return recv;
    }, '');
  }

  sent(redactedSymbol = '*') {
    return this.#sent.reduce((sent: string, num) => {
      sent =
        sent + (num === 0 ? redactedSymbol : Buffer.from([num]).toString());
      return sent;
    }, '');
  }

  text = (redactedSymbol = '*') => {
    return {
      sent: this.sent(redactedSymbol),
      recv: this.recv(redactedSymbol),
    };
  };
}
