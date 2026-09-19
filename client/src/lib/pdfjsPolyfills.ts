/**
 * pdf.js 5 iterates text with `for await (const value of readableStream)`.
 * Safari still has no ReadableStream async iterator (until Safari 27),
 * which throws: "undefined is not a function (near '...value of readableStream...')".
 */
export function installPdfjsPolyfills() {
  const PromiseCtor = Promise as PromiseConstructor & {
    withResolvers?: <T>() => {
      promise: Promise<T>;
      resolve: (value: T | PromiseLike<T>) => void;
      reject: (reason?: unknown) => void;
    };
  };
  if (typeof PromiseCtor.withResolvers !== "function") {
    PromiseCtor.withResolvers = function withResolvers<T>() {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  const proto = globalThis.ReadableStream?.prototype as
    | (ReadableStream<unknown> & {
        [Symbol.asyncIterator]?: () => AsyncIterableIterator<unknown>;
        values?: () => AsyncIterableIterator<unknown>;
      })
    | undefined;
  if (!proto) return;

  if (typeof proto[Symbol.asyncIterator] !== "function") {
    proto[Symbol.asyncIterator] = async function* asyncIterator() {
      const reader = this.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) return;
          yield value;
        }
      } finally {
        reader.releaseLock();
      }
    };
  }

  if (typeof proto.values !== "function") {
    proto.values = proto[Symbol.asyncIterator];
  }
}

installPdfjsPolyfills();
