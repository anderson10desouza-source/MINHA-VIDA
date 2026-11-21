const DB_NAME = 'meu_mundo_minha_vida_audio';
const STORE_NAME = 'devotional_audios';

function openAudioDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function saveDevotionalAudio(id: string, dataUrl: string): Promise<void> {
  try {
    const db = await openAudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(dataUrl, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Fallback silently to in-memory / localStorage if IndexedDB blocked
  }
}

export async function loadAllDevotionalAudios(): Promise<Record<string, string>> {
  try {
    const db = await openAudioDb();
    const result = await new Promise<Record<string, string>>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const map: Record<string, string> = {};
      const cursorReq = store.openCursor();
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          if (typeof cursor.key === 'string' && typeof cursor.value === 'string') {
            map[cursor.key] = cursor.value;
          }
          cursor.continue();
        } else {
          resolve(map);
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
    db.close();
    return result;
  } catch {
    return {};
  }
}

export async function deleteDevotionalAudio(id: string): Promise<void> {
  try {
    const db = await openAudioDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // ignore
  }
}
