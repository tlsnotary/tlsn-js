import { Buffer } from 'buffer';

export function expect(cond: any, msg = 'invalid expression') {
  if (!cond) throw new Error(msg);
}

export function stringToBuffer(str: string): number[] {
  return Buffer.from(str).toJSON().data;
}

export function arrayToHex(uintArr: Uint8Array): string {
  return Buffer.from(uintArr).toString('hex');
}

export function hexToArray(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'));
}

export function headerToMap(headers: {
  [name: string]: string;
}): Map<string, number[]> {
  const headerMap: Map<string, number[]> = new Map();
  Object.entries(headers).forEach(([key, value]) => {
    headerMap.set(key, stringToBuffer(value));
  });
  return headerMap;
}
