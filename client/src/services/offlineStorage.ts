/**
 * IndexedDB Offline Audio Cache
 * Allows storing full MP3 audio files in the browser for offline background playback.
 */

const DB_NAME = "vozlivre_offline_store";
const DB_VERSION = 1;
const STORE_NAME = "audio_blobs";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "audioId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export interface CachedAudioEntry {
  audioId: string;
  blob: Blob;
  title: string;
  duration: number;
  cachedAt: number;
  size: number;
}

export async function saveAudioToOfflineCache(
  audioId: string,
  blob: Blob,
  title: string,
  duration: number
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const entry: CachedAudioEntry = {
      audioId,
      blob,
      title,
      duration,
      cachedAt: Date.now(),
      size: blob.size,
    };
    const req = store.put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function getOfflineAudio(audioId: string): Promise<CachedAudioEntry | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(audioId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function isAudioCached(audioId: string): Promise<boolean> {
  const item = await getOfflineAudio(audioId);
  return !!item;
}

export async function removeOfflineAudio(audioId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(audioId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function listCachedAudios(): Promise<CachedAudioEntry[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getCacheStats(): Promise<{ count: number; totalBytes: number }> {
  const items = await listCachedAudios();
  const totalBytes = items.reduce((acc, item) => acc + (item.size || 0), 0);
  return {
    count: items.length,
    totalBytes,
  };
}

export async function clearAllOfflineCache(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
