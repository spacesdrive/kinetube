// messages arrive whenever the producer writes them and are read one at a time; an end rejects every later read
export interface MessageQueue<T> {
  push(message: T): void;
  end(error: Error): void;
  next(timeoutMs: number, onTimeout: () => Error): Promise<T>;
}

interface PendingRead<T> {
  resolve(message: T): void;
  reject(error: Error): void;
}

export function createMessageQueue<T>(): MessageQueue<T> {
  const queued: T[] = [];
  let pendingRead: PendingRead<T> | null = null;
  let endError: Error | null = null;

  return {
    push(message) {
      if (!pendingRead) {
        queued.push(message);
        return;
      }
      const read = pendingRead;
      pendingRead = null;
      read.resolve(message);
    },

    end(error) {
      endError ??= error;
      pendingRead?.reject(endError);
      pendingRead = null;
    },

    next(timeoutMs, onTimeout) {
      const message = queued.shift();
      if (message !== undefined) return Promise.resolve(message);
      if (endError) return Promise.reject(endError);

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pendingRead = null;
          reject(onTimeout());
        }, timeoutMs);
        pendingRead = {
          resolve: (value) => {
            clearTimeout(timer);
            resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            reject(error);
          },
        };
      });
    },
  };
}
