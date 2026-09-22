// データ型の定義（pet-record-app（スマホ版）と同じ形にしてバックアップの互換性を保つ）

export type Pet = {
  id: number;
  name: string;
  reading: string | null;
  species: string;
  breed: string | null;
  sex: string | null;
  birthday: string | null; // YYYY-MM-DD
  adopted_date: string | null; // YYYY-MM-DD
  farewell_date: string | null; // YYYY-MM-DD
  photo_path: string | null; // Web版では data URL をそのまま保存
  note: string | null;
  color: string | null;
  created_at: string;
};

export type PetInput = Omit<Pet, 'id' | 'created_at'>;

export type Record = {
  id: number;
  pet_id: number;
  date: string; // YYYY-MM-DD
  category: string;
  text_value: string | null;
  numeric_value: number | null;
  unit: string | null;
  created_at: string;
};

export type RecordInput = Omit<Record, 'id' | 'created_at'>;

export type Photo = {
  id: number;
  pet_id: number;
  date: string; // YYYY-MM-DD
  file_path: string; // Web版では data URL
  created_at: string;
};
