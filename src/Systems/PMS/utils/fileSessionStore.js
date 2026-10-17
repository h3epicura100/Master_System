/**
 * fileSessionStore.js
 * 
 * IndexedDB-backed storage for File blobs to survive mobile browser page
 * reloads/discards during native file picker interactions.
 */

const DB_NAME = 'PMS_Attachment_Store';
const DB_VERSION = 1;
const STORE_NAME = 'staged_files';

/**
 * Open or initialize the IndexedDB database
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error || new Error('Failed to open IndexedDB'));
    };
  });
}

/**
 * Persist an array of File objects under a unique sessionKey
 * @param {string} sessionKey
 * @param {File[]} files
 */
export async function saveFilesToSession(sessionKey, files) {
  if (!sessionKey) return;
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    if (!files || files.length === 0) {
      store.delete(sessionKey);
      return;
    }

    // Convert files to serializable records
    const serializedFiles = files.map((file) => ({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      lastModified: file.lastModified || Date.now(),
      blob: file, // IndexedDB natively handles Blob / File instances
    }));

    const record = {
      key: sessionKey,
      files: serializedFiles,
      updatedAt: Date.now(),
    };

    store.put(record);

    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.warn('[fileSessionStore] Error saving files to IndexedDB:', err);
  }
}

/**
 * Retrieve saved File objects from IndexedDB for a sessionKey
 * @param {string} sessionKey
 * @returns {Promise<File[]>}
 */
export async function restoreFilesFromSession(sessionKey) {
  if (!sessionKey) return [];
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve) => {
      const request = store.get(sessionKey);

      request.onsuccess = (event) => {
        const result = event.target.result;
        if (!result || !Array.isArray(result.files) || result.files.length === 0) {
          resolve([]);
          return;
        }

        // Reconstruct genuine File objects from stored blobs
        const reconstructedFiles = result.files.map((item) => {
          if (item.blob instanceof File) {
            return item.blob;
          }
          if (item.blob instanceof Blob) {
            return new File([item.blob], item.name, {
              type: item.type,
              lastModified: item.lastModified,
            });
          }
          return null;
        }).filter(Boolean);

        resolve(reconstructedFiles);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('[fileSessionStore] Error restoring files from IndexedDB:', err);
    return [];
  }
}

/**
 * Clear saved files from IndexedDB for a sessionKey
 * @param {string} sessionKey
 */
export async function clearFilesFromSession(sessionKey) {
  if (!sessionKey) return;
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(sessionKey);

    return new Promise((resolve) => {
      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
    });
  } catch (err) {
    console.warn('[fileSessionStore] Error clearing files from IndexedDB:', err);
  }
}

/**
 * Clean up old entries older than 24 hours
 */
export async function purgeOldSessionFiles(maxAgeMs = 24 * 60 * 60 * 1000) {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.openCursor();

    const cutoff = Date.now() - maxAgeMs;

    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        if (cursor.value.updatedAt && cursor.value.updatedAt < cutoff) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  } catch (err) {
    console.warn('[fileSessionStore] Error purging old files:', err);
  }
}
