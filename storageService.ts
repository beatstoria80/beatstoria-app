/**
 * TITAN STABILITY LAYER (IndexedDB Wrapper v4.0)
 * Optimized for high-frequency updates and single-instance connectivity.
 */

const DB_NAME = 'SportWearNeuralDB';
const DB_VERSION = 4; // Incremented version to add NoteLM store
const STORE_NAME = 'projects';
const NOTELM_STORE = 'notelm_docs';

// SINGLETON DB INSTANCE
let dbInstance: IDBDatabase | null = null;

export const initDB = (): Promise<IDBDatabase> => {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("NeuralDB Critical Error:", (event.target as any).error);
      reject((event.target as any).error);
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      
      window.addEventListener('beforeunload', () => {
          if (dbInstance) {
              dbInstance.close();
              dbInstance = null;
          }
      });

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      // NEW: Persistent Store for NoteLM Documents
      if (!db.objectStoreNames.contains(NOTELM_STORE)) {
        db.createObjectStore(NOTELM_STORE, { keyPath: 'id' });
      }
    };
  });
};

const isValidKey = (key: any): boolean => {
  return typeof key === 'string' && key.trim().length > 0;
};

// --- PROJECT METHODS ---
export const saveProjectToDB = async (project: any): Promise<void> => {
  if (!project || !isValidKey(project.id) || project.id === 'page-default') return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(project);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject((e.target as any).error);
    } catch (err) { reject(err); }
  });
};

export const getProjectByIdFromDB = async (id: string): Promise<any | null> => {
  if (!isValidKey(id)) return null;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject((e.target as any).error);
    } catch (err) { reject(err); }
  });
};

export const getAllProjectsFromDB = async (): Promise<any[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
          const results = request.result || [];
          results.sort((a: any, b: any) => b.lastSaved - a.lastSaved);
          resolve(results);
      };
      request.onerror = (e) => reject((e.target as any).error);
    } catch (err) { reject(err); }
  });
};

export const deleteProjectFromDB = async (id: string): Promise<void> => {
  if (!isValidKey(id)) return;
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as any).error);
    } catch (err) { reject(err); }
  });
};

export const clearAllProjectsFromDB = async (): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject((e.target as any).error);
    } catch (err) { reject(err); }
  });
};

// --- NOTELM PERSISTENCE METHODS ---
export const saveNoteDoc = async (doc: any): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([NOTELM_STORE], 'readwrite');
        tx.objectStore(NOTELM_STORE).put(doc);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};

export const getAllNoteDocs = async (): Promise<any[]> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([NOTELM_STORE], 'readonly');
        const req = tx.objectStore(NOTELM_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
    });
};

export const deleteNoteDoc = async (id: string): Promise<void> => {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction([NOTELM_STORE], 'readwrite');
        tx.objectStore(NOTELM_STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
};