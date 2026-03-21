const cacheStore = new Map();

function now() {
  return Date.now();
}

export async function getOrSetServerCache(key, loader, { ttlMs = 30000 } = {}) {
  const existing = cacheStore.get(key);
  const currentTime = now();

  if (existing?.value !== undefined && existing.expiresAt > currentTime) {
    return existing.value;
  }

  if (existing?.promise) {
    return existing.promise;
  }

  const promise = Promise.resolve()
    .then(loader)
    .then((value) => {
      cacheStore.set(key, {
        value,
        expiresAt: now() + ttlMs,
      });
      return value;
    })
    .catch((error) => {
      cacheStore.delete(key);
      throw error;
    });

  cacheStore.set(key, {
    promise,
    expiresAt: currentTime + ttlMs,
  });

  return promise;
}

export function invalidateServerCache(prefix) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }
}
