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
    return bytesToUtf8(substituteRedactions(this.#recv, redactedSymbol));
  }

  sent(redactedSymbol = '*') {
    return bytesToUtf8(substituteRedactions(this.#sent, redactedSymbol));
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

function bytesToUtf8(array: number[]): string {
  return Buffer.from(array).toString("utf8");
}

function substituteRedactions(
  array: number[],
  redactedSymbol: string = "*",
): number[] {
  const replaceCharByte = redactedSymbol.charCodeAt(0);
  return array.map((byte) => (byte === 0 ? replaceCharByte : byte));
}
