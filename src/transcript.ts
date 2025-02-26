import { Buffer } from 'buffer';

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

export function subtractRanges(
  ranges: { start: number; end: number },
  negatives: { start: number; end: number }[],
): { start: number; end: number }[] {
  const returnVal: { start: number; end: number }[] = [ranges];

  negatives
    .sort((a, b) => (a.start < b.start ? -1 : 1))
    .forEach(({ start, end }) => {
      const last = returnVal.pop()!;

      if (start < last.start || end > last.end) {
        console.error('invalid ranges');
        return;
      }

      if (start === last.start && end === last.end) {
        return;
      }

      if (start === last.start && end < last.end) {
        returnVal.push({ start: end, end: last.end });
        return;
      }

      if (start > last.start && end < last.end) {
        returnVal.push({ start: last.start, end: start });
        returnVal.push({ start: end, end: last.end });
        return;
      }

      if (start > last.start && end === last.end) {
        returnVal.push({ start: last.start, end: start });
        return;
      }
    });

  return returnVal;
}

export function mapStringToRange(secrets: string[], text: string) {
  return secrets
    .map((secret: string) => {
      const byteIdx = indexOfString(text, secret);
      return byteIdx > -1
        ? {
            start: byteIdx,
            end: byteIdx + bytesSize(secret),
          }
        : null;
    })
    .filter((data: any) => !!data) as { start: number; end: number }[];
}

function indexOfString(str: string, substr: string): number {
  return Buffer.from(str).indexOf(Buffer.from(substr));
}

function bytesSize(str: string): number {
  return Buffer.from(str).byteLength;
}
