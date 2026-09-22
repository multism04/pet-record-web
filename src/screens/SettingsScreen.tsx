import { useEffect, useRef, useState } from 'react';
import { DEFAULT_GEMINI_MODEL, MODEL_SETTING, listAvailableModels } from '../ai';
import { exportBackup, importBackupFromFile } from '../backup';
import { APP_VERSION, DEFAULT_COLOR } from '../constants';
import { getSetting, setSetting } from '../db';
import { getApiKey, setApiKey as saveApiKey } from '../secure';

type Props = {
  onClose: () => void;
  onDataRestored: () => void;
};

export default function SettingsScreen({ onClose, onDataRestored }: Props) {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      setApiKey((await getApiKey()) ?? '');
      setModel((await getSetting(MODEL_SETTING)) ?? DEFAULT_GEMINI_MODEL);
      setLoaded(true);
    })();
  }, []);

  async function handleExport() {
    try {
      setBusy(true);
      await exportBackup();
    } catch (e) {
      alert(`バックアップに失敗しました: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (
      !confirm('現在のデータ（ペット・記録・写真）はすべて消え、バックアップの内容に置き換わります。よろしいですか？')
    ) {
      return;
    }
    try {
      setBusy(true);
      const result = await importBackupFromFile(file);
      alert(`復元しました\nペット${result.pets}件・記録${result.records}件・写真${result.photos}件を復元しました。`);
      onDataRestored();
    } catch (e) {
      alert(`復元に失敗しました: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckModels() {
    await saveApiKey(apiKey.trim() || null);
    try {
      setChecking(true);
      const list = await listAvailableModels();
      if (list.length === 0) {
        alert('このキーで使えるモデルがありませんでした。');
      }
      setModels(list);
    } catch (e) {
      alert(`取得に失敗しました: ${String(e)}`);
    } finally {
      setChecking(false);
    }
  }

  async function handleSave() {
    await saveApiKey(apiKey.trim() || null);
    await setSetting(MODEL_SETTING, model.trim() || DEFAULT_GEMINI_MODEL);
    alert('AIの設定を保存しました。');
    onClose();
  }

  if (!loaded) return null;

  return (
    <div className="app-body">
      <div className="header-bar">
        <button className="header-cancel" onClick={onClose}>
          閉じる
        </button>
        <span className="header-title">設定</span>
        <button className="header-save" style={{ color: DEFAULT_COLOR }} onClick={handleSave}>
          保存
        </button>
      </div>

      <div className="screen">
        <div className="screen-pad">
          <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>AI（文章の自動振り分け）</p>
          <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>
            入力した文章をAI（Google Gemini）が各カテゴリに自動で振り分けます。利用にはGeminiのAPIキーが必要です（個人利用なら無料枠で使えます）。
          </p>

          <a
            className="link"
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block', marginBottom: 12 }}
          >
            ▶ APIキーを取得する（Google AI Studio）
          </a>

          <p className="field-label">Gemini APIキー</p>
          <input
            className="text-input"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza... で始まるキー"
            autoCapitalize="off"
            autoCorrect="off"
          />
          <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
            ⚠️ APIキーはこの端末のブラウザ内に保存されます（暗号化はされません）。共有端末やパソコンでは入力しないでください。
          </p>

          <p className="field-label">モデル名</p>
          <input
            className="text-input"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_GEMINI_MODEL}
            autoCapitalize="off"
            autoCorrect="off"
          />
          <p style={{ fontSize: 12, color: '#999', marginTop: 6 }}>
            新しいキーでは古いモデル（gemini-2.x系）が使えません。既定の {DEFAULT_GEMINI_MODEL} のままでOK。
            404 が出る場合は下のボタンで使えるモデルを調べ、新しめの flash 系を選んでください。
          </p>

          <button
            className="btn btn-secondary"
            style={{ marginTop: 12, opacity: checking ? 0.6 : 1 }}
            onClick={handleCheckModels}
            disabled={checking}
          >
            {checking ? '調べています…' : '使えるモデルを調べる'}
          </button>

          {models.length > 0 && (
            <div className="chip-row" style={{ marginTop: 12 }}>
              {models.map((m) => (
                <button
                  key={m}
                  className={`chip${model === m ? ' active' : ''}`}
                  style={model === m ? { background: DEFAULT_COLOR } : undefined}
                  onClick={() => setModel(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          )}

          {/* バックアップ */}
          <div style={{ marginTop: 36, borderTop: '1px solid #eee', paddingTop: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>データのバックアップ</p>
            <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, marginBottom: 12 }}>
              全データ（ペット・記録・写真）を1つのファイルに書き出せます。スマホ版アプリで書き出したバックアップも、ここから読み込めます。
            </p>
            <button
              className="btn"
              style={{ background: DEFAULT_COLOR, opacity: busy ? 0.6 : 1 }}
              onClick={handleExport}
              disabled={busy}
            >
              バックアップを書き出す
            </button>
            <button
              className="btn btn-outline"
              style={{ marginTop: 10, opacity: busy ? 0.6 : 1 }}
              onClick={() => importInputRef.current?.click()}
              disabled={busy}
            >
              バックアップから復元
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
          </div>

          {/* アプリについて */}
          <div style={{ marginTop: 36, borderTop: '1px solid #eee', paddingTop: 16 }}>
            <p style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>アプリについて</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, color: '#555' }}>バージョン</span>
              <span style={{ fontSize: 14, color: '#333', fontWeight: 600 }}>{APP_VERSION}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
