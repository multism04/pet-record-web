import { useCallback, useEffect, useState } from 'react';
import { exportBackup } from '../backup';
import { getBackupStatus } from '../db';

type Props = {
  // 記録やペットが変わるたびに増える値。変わったら状態を取り直す
  refreshKey: unknown;
  hasData: boolean;
};

// 最後のバックアップ以降に変更があるとき、画面上部に出して保存を促す
export default function BackupBanner({ refreshKey, hasData }: Props) {
  const [dirty, setDirty] = useState(false);
  const [lastBackupAt, setLastBackupAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const st = await getBackupStatus();
    setDirty(st.dirty);
    setLastBackupAt(st.lastBackupAt);
  }, []);

  useEffect(() => {
    // 変更の目印は書き込み完了後に非同期で付くため、少し待ってから読む
    const t = setTimeout(() => void refresh(), 300);
    return () => clearTimeout(t);
  }, [refreshKey, refresh]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  if (!hasData || !dirty) return null;

  async function handleBackup() {
    try {
      setBusy(true);
      await exportBackup();
    } catch (e) {
      alert(`バックアップに失敗しました: ${String(e)}`);
    } finally {
      setBusy(false);
      await refresh();
    }
  }

  const last = lastBackupAt
    ? `前回のバックアップ: ${new Date(lastBackupAt).toLocaleDateString('ja-JP')}`
    : 'まだバックアップがありません';

  return (
    <div
      style={{
        background: '#fff4e5',
        borderBottom: '1px solid #ffcc80',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4, color: '#7a4a00' }}>
        <strong>バックアップしていない変更があります</strong>
        <br />
        <span style={{ fontSize: 12 }}>{last}</span>
      </div>
      <button
        onClick={handleBackup}
        disabled={busy}
        style={{
          background: '#ef6c00',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          padding: '8px 12px',
          fontSize: 13,
          fontWeight: 700,
          opacity: busy ? 0.6 : 1,
          whiteSpace: 'nowrap',
        }}
      >
        {busy ? '保存中…' : '今すぐ保存'}
      </button>
    </div>
  );
}
