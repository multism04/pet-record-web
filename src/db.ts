// データ層（Web版）。ネイティブ版の expo-sqlite の代わりに IndexedDB を使う。
// 関数名・振る舞いはスマホ版の src/db.ts に合わせてあり、呼び出し側（画面）は同じ感覚で使える。

import type { Pet, PetInput, Photo, Record, RecordInput } from './types';

const DB_NAME = 'pet_record_web';
const DB_VERSION = 1;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pets')) {
        db.createObjectStore('pets', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('records')) {
        const store = db.createObjectStore('records', { keyPath: 'id', autoIncrement: true });
        store.createIndex('pet_id', 'pet_id');
      }
      if (!db.objectStoreNames.contains('photos')) {
        const store = db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        store.createIndex('pet_id', 'pet_id');
      }
      if (!db.objectStoreNames.contains('meta')) {
        db.createObjectStore('meta', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function store(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDb();
  return db.transaction(name, mode).objectStore(name);
}

export async function initDb(): Promise<void> {
  await openDb();
}

// ---- ペット ----

export async function getPets(): Promise<Pet[]> {
  const s = await store('pets', 'readonly');
  const all = await wrap(s.getAll());
  return (all as Pet[]).sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
}

export async function countPets(): Promise<number> {
  const s = await store('pets', 'readonly');
  return wrap(s.count());
}

export async function getPet(id: number): Promise<Pet | null> {
  const s = await store('pets', 'readonly');
  const row = await wrap(s.get(id));
  return (row as Pet) ?? null;
}

export async function addPet(input: PetInput): Promise<number> {
  const s = await store('pets', 'readwrite');
  const row: Omit<Pet, 'id'> = { ...input, created_at: new Date().toISOString() };
  const id = await wrap(s.add(row) as IDBRequest<number>);
  return id;
}

export async function updatePet(id: number, input: PetInput): Promise<void> {
  const existing = await getPet(id);
  const s = await store('pets', 'readwrite');
  const row: Pet = { ...input, id, created_at: existing?.created_at ?? new Date().toISOString() };
  await wrap(s.put(row));
}

export async function deletePet(id: number): Promise<void> {
  const recs = await getAllRecordsForPet(id);
  const photos = await getAllPhotosForPet(id);
  const rs = await store('records', 'readwrite');
  await Promise.all(recs.map((r) => wrap(rs.delete(r.id))));
  const ps = await store('photos', 'readwrite');
  await Promise.all(photos.map((p) => wrap(ps.delete(p.id))));
  const s = await store('pets', 'readwrite');
  await wrap(s.delete(id));
}

async function getAllRecordsForPet(petId: number): Promise<Record[]> {
  const s = await store('records', 'readonly');
  const idx = s.index('pet_id');
  return wrap(idx.getAll(petId)) as Promise<Record[]>;
}

async function getAllPhotosForPet(petId: number): Promise<Photo[]> {
  const s = await store('photos', 'readonly');
  const idx = s.index('pet_id');
  return wrap(idx.getAll(petId)) as Promise<Photo[]>;
}

// ---- 記録（records） ----

export async function addRecord(input: RecordInput): Promise<number> {
  const s = await store('records', 'readwrite');
  const row: Omit<Record, 'id'> = { ...input, created_at: new Date().toISOString() };
  return wrap(s.add(row) as IDBRequest<number>);
}

export async function getRecordsByDate(petId: number, date: string): Promise<Record[]> {
  const all = await getAllRecordsForPet(petId);
  return all
    .filter((r) => r.date === date)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
}

export async function getRecordDatesInRange(
  petId: number,
  from: string,
  to: string
): Promise<string[]> {
  const all = await getAllRecordsForPet(petId);
  const set = new Set(all.filter((r) => r.date >= from && r.date <= to).map((r) => r.date));
  return Array.from(set).sort();
}

export async function getRecordCountsInRange(
  petId: number,
  from: string,
  to: string
): Promise<{ date: string; count: number }[]> {
  const all = await getAllRecordsForPet(petId);
  const map = new Map<string, number>();
  for (const r of all) {
    if (r.date < from || r.date > to) continue;
    map.set(r.date, (map.get(r.date) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDailyNumericSum(
  petId: number,
  category: string,
  from: string,
  to: string
): Promise<{ date: string; value: number }[]> {
  const all = await getAllRecordsForPet(petId);
  const map = new Map<string, number>();
  for (const r of all) {
    if (r.category !== category || r.numeric_value == null) continue;
    if (r.date < from || r.date > to) continue;
    map.set(r.date, (map.get(r.date) ?? 0) + r.numeric_value);
  }
  return Array.from(map.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function getDailyNumericLatest(
  petId: number,
  category: string,
  from: string,
  to: string
): Promise<{ date: string; value: number }[]> {
  const all = await getAllRecordsForPet(petId);
  const rows = all
    .filter(
      (r) => r.category === category && r.numeric_value != null && r.date >= from && r.date <= to
    )
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);
  const map = new Map<string, number>();
  for (const r of rows) map.set(r.date, r.numeric_value as number);
  return Array.from(map.entries())
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function updateRecord(id: number, input: RecordInput): Promise<void> {
  const s = await store('records', 'readwrite');
  const existing = (await wrap(s.get(id))) as Record | undefined;
  const row: Record = { ...input, id, created_at: existing?.created_at ?? new Date().toISOString() };
  await wrap(s.put(row));
}

export async function deleteRecord(id: number): Promise<void> {
  const s = await store('records', 'readwrite');
  await wrap(s.delete(id));
}

// ---- 写真（photos） ----

export async function addPhoto(petId: number, date: string, filePath: string): Promise<number> {
  const s = await store('photos', 'readwrite');
  const row: Omit<Photo, 'id'> = {
    pet_id: petId,
    date,
    file_path: filePath,
    created_at: new Date().toISOString(),
  };
  return wrap(s.add(row) as IDBRequest<number>);
}

export async function getPhotosByDate(petId: number, date: string): Promise<Photo[]> {
  const all = await getAllPhotosForPet(petId);
  return all
    .filter((p) => p.date === date)
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id - b.id);
}

export async function getPhotoDatesInRange(
  petId: number,
  from: string,
  to: string
): Promise<string[]> {
  const all = await getAllPhotosForPet(petId);
  const set = new Set(all.filter((p) => p.date >= from && p.date <= to).map((p) => p.date));
  return Array.from(set);
}

export async function deletePhoto(id: number): Promise<void> {
  const s = await store('photos', 'readwrite');
  await wrap(s.delete(id));
}

// ---- バックアップ／復元用 ----

export async function getAllRecords(): Promise<Record[]> {
  const s = await store('records', 'readonly');
  const all = (await wrap(s.getAll())) as Record[];
  return all.sort((a, b) => a.id - b.id);
}

export async function getAllPhotos(): Promise<Photo[]> {
  const s = await store('photos', 'readonly');
  const all = (await wrap(s.getAll())) as Photo[];
  return all.sort((a, b) => a.id - b.id);
}

export async function clearAllData(): Promise<void> {
  const db = await openDb();
  await Promise.all(
    ['pets', 'records', 'photos'].map(
      (name) =>
        new Promise<void>((resolve, reject) => {
          const req = db.transaction(name, 'readwrite').objectStore(name).clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        })
    )
  );
}

// ---- アプリ設定（meta） ----

export async function getSetting(key: string): Promise<string | null> {
  const s = await store('meta', 'readonly');
  const row = (await wrap(s.get(key))) as { key: string; value: string } | undefined;
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string | null): Promise<void> {
  const s = await store('meta', 'readwrite');
  if (value === null) {
    await wrap(s.delete(key));
  } else {
    await wrap(s.put({ key, value }));
  }
}

const DEFAULT_PET_KEY = 'default_pet_id';

export async function getDefaultPetId(): Promise<number | null> {
  const v = await getSetting(DEFAULT_PET_KEY);
  if (v === null) return null;
  const n = parseInt(v, 10);
  return isNaN(n) ? null : n;
}

export async function setDefaultPetId(id: number | null): Promise<void> {
  await setSetting(DEFAULT_PET_KEY, id === null ? null : String(id));
}
