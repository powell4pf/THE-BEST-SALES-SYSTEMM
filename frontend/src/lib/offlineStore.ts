export type OfflineDraftKind = 'invoice' | 'payment' | 'stock';

export type OfflineDraft = {
  id: string;
  kind: OfflineDraftKind;
  method: 'POST' | 'PUT';
  path: string;
  body: string;
  createdAt: string;
  status: 'pending' | 'failed';
  error?: string;
};

type CacheEntry = { key: string; value: unknown; savedAt: number };

const DB_NAME = 'nurtured-choice-offline';
const DB_VERSION = 1;
const CACHE_STORE = 'api-cache';
const DRAFT_STORE = 'drafts';
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const notifyDraftsChanged = () => window.dispatchEvent(new Event('nurtured-choice-offline-drafts-changed'));

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('Offline storage is unavailable in this browser.')); return; }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open offline storage.'));
  });
}

async function run<T>(storeName: string, mode: IDBTransactionMode, action: (store: IDBObjectStore, resolve: (value: T) => void, reject: (reason?: unknown) => void) => void): Promise<T> {
  const db = await openDatabase();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    action(transaction.objectStore(storeName), resolve, reject);
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => reject(transaction.error ?? new Error('Offline storage operation failed.'));
  });
}

export async function cacheOfflineValue(key: string, value: unknown) {
  try { await run<void>(CACHE_STORE, 'readwrite', (store, resolve, reject) => { const request = store.put({ key, value, savedAt: Date.now() } satisfies CacheEntry); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); }); } catch { /* Offline cache is an enhancement; never block the app. */ }
}

export async function readOfflineValue<T>(key: string): Promise<T | null> {
  try {
    const entry = await run<CacheEntry | undefined>(CACHE_STORE, 'readonly', (store, resolve, reject) => { const request = store.get(key); request.onsuccess = () => resolve(request.result as CacheEntry | undefined); request.onerror = () => reject(request.error); });
    if (!entry || Date.now() - entry.savedAt > CACHE_MAX_AGE) return null;
    return entry.value as T;
  } catch { return null; }
}

export async function saveOfflineDraft(draft: Omit<OfflineDraft, 'id' | 'createdAt' | 'status'> & { id?: string }) {
  const result: OfflineDraft = { ...draft, id: draft.id ?? crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'pending' };
  await run<void>(DRAFT_STORE, 'readwrite', (store, resolve, reject) => { const request = store.put(result); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
  notifyDraftsChanged();
  return result;
}

export async function listOfflineDrafts(): Promise<OfflineDraft[]> {
  try { return await run<OfflineDraft[]>(DRAFT_STORE, 'readonly', (store, resolve, reject) => { const request = store.getAll(); request.onsuccess = () => resolve((request.result as OfflineDraft[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt))); request.onerror = () => reject(request.error); }); } catch { return []; }
}

export async function updateOfflineDraft(id: string, changes: Partial<OfflineDraft>) {
  const drafts = await listOfflineDrafts();
  const existing = drafts.find((draft) => draft.id === id);
  if (!existing) return;
  await run<void>(DRAFT_STORE, 'readwrite', (store, resolve, reject) => { const request = store.put({ ...existing, ...changes }); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
  notifyDraftsChanged();
}

export async function removeOfflineDraft(id: string) {
  await run<void>(DRAFT_STORE, 'readwrite', (store, resolve, reject) => { const request = store.delete(id); request.onsuccess = () => resolve(); request.onerror = () => reject(request.error); });
  notifyDraftsChanged();
}
