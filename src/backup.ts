// バックアップの書き出し／読み込み（Web版）。
// スマホ版（pet-record-app/src/backup.ts）と全く同じJSON形式を使うため、
// どちらのアプリで書き出したファイルも、もう一方のアプリで読み込める。

import {
  addPet,
  addPhoto,
  addRecord,
  clearAllData,
  getAllPhotos,
  getAllRecords,
  getDefaultPetId,
  getPets,
  markBackedUp,
  setDefaultPetId,
} from './db';
import { dataUrlToB64, b64ToDataUrl } from './photos';
import type { Pet } from './types';
import { todayYmd } from './utils';

const BACKUP_VERSION = 1;

type BackupPet = Omit<Pet, 'photo_path'> & { photo_b64: string | null; photo_ext: string | null };
type BackupData = {
  app: string;
  version: number;
  exportedAt: string;
  default_pet_id: number | null;
  pets: BackupPet[];
  records: {
    pet_id: number;
    date: string;
    category: string;
    text_value: string | null;
    numeric_value: number | null;
    unit: string | null;
  }[];
  photos: { pet_id: number; date: string; b64: string; ext: string }[];
};

// 戻り値: バックアップが保存された（または端末に書き出された）なら true、共有をキャンセルしたなら false
export async function exportBackup(): Promise<boolean> {
  const startedAt = new Date().toISOString();
  const pets = await getPets();
  const records = await getAllRecords();
  const photos = await getAllPhotos();
  const defaultPetId = await getDefaultPetId();

  const backupPets: BackupPet[] = pets.map((p) => {
    const { photo_path, ...rest } = p;
    const { b64, ext } = photo_path ? dataUrlToB64(photo_path) : { b64: '', ext: '' };
    return {
      ...rest,
      photo_b64: photo_path && b64 ? b64 : null,
      photo_ext: photo_path && ext ? ext : null,
    };
  });

  const backupPhotos: BackupData['photos'] = [];
  for (const ph of photos) {
    const { b64, ext } = dataUrlToB64(ph.file_path);
    if (b64) backupPhotos.push({ pet_id: ph.pet_id, date: ph.date, b64, ext });
  }

  const data: BackupData = {
    app: 'wagako-seichou-kiroku',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    default_pet_id: defaultPetId,
    pets: backupPets,
    records: records.map((r) => ({
      pet_id: r.pet_id,
      date: r.date,
      category: r.category,
      text_value: r.text_value,
      numeric_value: r.numeric_value,
      unit: r.unit,
    })),
    photos: backupPhotos,
  };

  // 端末の時刻（日本時間）の日付にする。toISOString はUTCなので朝9時前に前日の日付になってしまう
  const stamp = todayYmd().replace(/-/g, '');
  const fileName = `wagako_backup_${stamp}.json`;
  const json = JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });

  // スマホでは共有シートから Googleドライブ等へ直接保存できる（端末内のダウンロードだけだと端末ごと失うため）
  const file = new File([blob], fileName, { type: 'application/json' });
  if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      await markBackedUp(startedAt);
      return true;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false;
      // 共有に失敗したときはダウンロードにフォールバックする
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  await markBackedUp(startedAt);
  return true;
}

export async function importBackupFromFile(
  file: File
): Promise<{ pets: number; records: number; photos: number }> {
  const text = await file.text();
  let data: BackupData;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('バックアップファイルを読み取れませんでした。');
  }
  if (!data || !Array.isArray(data.pets) || !Array.isArray(data.records)) {
    throw new Error('このファイルは、我が子の成長記録のバックアップではないようです。');
  }

  await clearAllData();

  const idMap = new Map<number, number>();
  for (const bp of data.pets) {
    const photoPath = bp.photo_b64 ? b64ToDataUrl(bp.photo_b64, bp.photo_ext ?? 'jpg') : null;
    const newId = await addPet({
      name: bp.name,
      reading: bp.reading ?? null,
      species: bp.species,
      breed: bp.breed ?? null,
      sex: bp.sex ?? null,
      birthday: bp.birthday ?? null,
      adopted_date: bp.adopted_date ?? null,
      farewell_date: bp.farewell_date ?? null,
      photo_path: photoPath,
      note: bp.note ?? null,
      color: bp.color ?? null,
    });
    idMap.set(bp.id, newId);
  }

  let recCount = 0;
  for (const r of data.records) {
    const petId = idMap.get(r.pet_id);
    if (!petId) continue;
    await addRecord({
      pet_id: petId,
      date: r.date,
      category: r.category,
      text_value: r.text_value ?? null,
      numeric_value: r.numeric_value ?? null,
      unit: r.unit ?? null,
    });
    recCount++;
  }

  let photoCount = 0;
  for (const ph of data.photos ?? []) {
    const petId = idMap.get(ph.pet_id);
    if (!petId) continue;
    const dataUrl = b64ToDataUrl(ph.b64, ph.ext ?? 'jpg');
    await addPhoto(petId, ph.date, dataUrl);
    photoCount++;
  }

  if (data.default_pet_id != null && idMap.has(data.default_pet_id)) {
    await setDefaultPetId(idMap.get(data.default_pet_id)!);
  } else {
    await setDefaultPetId(null);
  }

  return { pets: data.pets.length, records: recCount, photos: photoCount };
}
