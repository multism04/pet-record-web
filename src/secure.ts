// APIキーの保存（Web版）。
// ブラウザには端末のセキュアストレージに相当するものが無いため localStorage に保存する。
// 暗号化はされない点に注意（設定画面でその旨を案内している）。

const API_KEY = 'gemini_api_key';

export async function getApiKey(): Promise<string | null> {
  return localStorage.getItem(API_KEY);
}

export async function setApiKey(value: string | null): Promise<void> {
  const v = value?.trim() ?? '';
  if (v !== '') {
    localStorage.setItem(API_KEY, v);
  } else {
    localStorage.removeItem(API_KEY);
  }
}
