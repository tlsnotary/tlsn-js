import * as Comlink from 'comlink';

const TestSum: any = Comlink.wrap(
  // @ts-ignore
  new Worker(new URL('./worker.ts', import.meta.url)),
);

(async function () {
  const inst = await new TestSum();
  console.log(await inst.test());
})();
