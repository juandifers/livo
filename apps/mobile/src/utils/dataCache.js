import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_PREFIX = 'livo:cache:v1:';
const STORAGE_INDEX_KEY = `${STORAGE_PREFIX}__index`;
const memoryStore = new Map();
let diskIndexCache = null;

const nowMs = () => Date.now();

const getStorageKey = (key) => `${STORAGE_PREFIX}${key}`;

const normalizeTtl = (ttlMs) => {
  if (!Number.isFinite(ttlMs)) return Number.POSITIVE_INFINITY;
  return Math.max(0, ttlMs);
};

const isFresh = (timestamp, ttlMs) => nowMs() - timestamp <= normalizeTtl(ttlMs);

const parseEnvelope = (raw) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.ts !== 'number' || !Object.prototype.hasOwnProperty.call(parsed, 'value')) {
      return null;
    }
    return parsed;
  } catch (_) {
    return null;
  }
};

const getDiskIndex = async () => {
  if (Array.isArray(diskIndexCache)) return diskIndexCache;
  if (typeof AsyncStorage.getItem !== 'function') {
    diskIndexCache = [];
    return diskIndexCache;
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_INDEX_KEY);
    const parsed = JSON.parse(raw || '[]');
    diskIndexCache = Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    diskIndexCache = [];
  }

  return diskIndexCache;
};

const saveDiskIndex = async (keys) => {
  diskIndexCache = keys;
  if (typeof AsyncStorage.setItem !== 'function') return;
  try {
    await AsyncStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(keys));
  } catch (_) {
    // Best effort cache index persistence.
  }
};

const addToDiskIndex = async (key) => {
  const index = await getDiskIndex();
  if (index.includes(key)) return;
  await saveDiskIndex([...index, key]);
};

const removeFromDiskIndex = async (key) => {
  const index = await getDiskIndex();
  if (!index.includes(key)) return;
  await saveDiskIndex(index.filter((value) => value !== key));
};

export const readCachedValue = async (
  key,
  { memoryTtlMs = 0, diskTtlMs = 0, allowStale = false } = {}
) => {
  const memoryEntry = memoryStore.get(key);
  if (memoryEntry) {
    const memoryFresh = isFresh(memoryEntry.ts, memoryTtlMs);
    if (memoryFresh || allowStale) {
      return {
        hit: true,
        stale: !memoryFresh,
        value: memoryEntry.value,
        source: 'memory'
      };
    }
  }

  if (typeof AsyncStorage.getItem !== 'function') {
    return { hit: false, stale: false, value: null, source: null };
  }

  try {
    const storageKey = getStorageKey(key);
    const raw = await AsyncStorage.getItem(storageKey);
    const envelope = parseEnvelope(raw);
    if (!envelope) {
      return { hit: false, stale: false, value: null, source: null };
    }

    const diskFresh = isFresh(envelope.ts, diskTtlMs);
    memoryStore.set(key, { ts: envelope.ts, value: envelope.value });

    if (diskFresh || allowStale) {
      return {
        hit: true,
        stale: !diskFresh,
        value: envelope.value,
        source: 'disk'
      };
    }
  } catch (_) {
    // Best effort cache reads.
  }

  return { hit: false, stale: false, value: null, source: null };
};

export const writeCachedValue = async (key, value, { persistToDisk = true } = {}) => {
  const ts = nowMs();
  memoryStore.set(key, { ts, value });

  if (!persistToDisk || typeof AsyncStorage.setItem !== 'function') return;

  try {
    const storageKey = getStorageKey(key);
    await AsyncStorage.setItem(storageKey, JSON.stringify({ ts, value }));
    await addToDiskIndex(key);
  } catch (_) {
    // Best effort cache writes.
  }
};

export const removeCachedValue = async (key) => {
  memoryStore.delete(key);

  if (typeof AsyncStorage.removeItem !== 'function') {
    return;
  }

  try {
    await AsyncStorage.removeItem(getStorageKey(key));
  } catch (_) {
    // Best effort cache cleanup.
  }

  await removeFromDiskIndex(key);
};

export const invalidateCachePrefix = async (prefix) => {
  const memoryKeys = [...memoryStore.keys()].filter((key) => key.startsWith(prefix));
  memoryKeys.forEach((key) => memoryStore.delete(key));

  const diskIndex = await getDiskIndex();
  const diskKeysToRemove = diskIndex.filter((key) => key.startsWith(prefix));

  if (!diskKeysToRemove.length) {
    return;
  }

  if (typeof AsyncStorage.multiRemove === 'function') {
    try {
      await AsyncStorage.multiRemove(diskKeysToRemove.map(getStorageKey));
    } catch (_) {
      // Best effort cache invalidation.
    }
  } else if (typeof AsyncStorage.removeItem === 'function') {
    for (const key of diskKeysToRemove) {
      try {
        await AsyncStorage.removeItem(getStorageKey(key));
      } catch (_) {
        // Best effort cache invalidation.
      }
    }
  }

  await saveDiskIndex(diskIndex.filter((key) => !key.startsWith(prefix)));
};

export const clearInMemoryCache = () => {
  memoryStore.clear();
};

