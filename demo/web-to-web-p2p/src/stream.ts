export default class WebSocketStream {
  client: WebSocket;
  readable: Promise<ReadableStream>;
  writable: Promise<WritableStream>;
  constructor(url: string) {
    const client = new WebSocket(url);

    const deferredReadable = defer<ReadableStream>();
    const deferredWritable = defer<WritableStream>();
    this.client = client;
    this.readable = deferredReadable.promise;
    this.writable = deferredWritable.promise;

    client.onopen = () => {
      const readable = new ReadableStream({
        start(controller) {
          client.onmessage = async (event) => {
            controller.enqueue(event.data);
          };
        },
        cancel() {
          client.close();
        },
      });

      const writable = new WritableStream({
        write(chunk) {
          client.send(chunk);
        },
        close() {
          client.close();
        },
      });

      deferredReadable.resolve(readable);
      deferredWritable.resolve(writable);
    };
  }

  async reader() {
    return this.readable.then((stream) => stream.getReader());
  }

  async writer() {
    return this.writable.then((stream) => stream.getWriter());
  }
}

function defer<value = any>(): {
  promise: Promise<value>;
  resolve: (val: value | Promise<value>) => void;
  reject: (err: any) => void;
} {
  let resolve: (val: value | Promise<value>) => void,
    reject: (err: any) => void;
  const promise: Promise<value> = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}
