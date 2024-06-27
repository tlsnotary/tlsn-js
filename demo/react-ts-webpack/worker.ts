import * as Comlink from 'comlink';

import init, { sum, initThreadPool } from '../../wasm/basic-rayon/pkg';

class TestSum {
  async test() {
    console.log('init');
    await init();
    console.log('initThreadPool');
    // @ts-ignore
    await initThreadPool(navigator.hardwareConcurrency * 2);
    console.log('sum');
    const arr = Int32Array.from({ length: 100 }, (_, i) => i + 1);
    return sum(arr);
  }
}

Comlink.expose(TestSum);
