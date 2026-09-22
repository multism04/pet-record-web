// 写真処理（Web版）。
// ネイティブ版はファイルとして保存するが、Web版はブラウザのファイルシステムに
// アクセスできないため、選んだ画像を data URL（base64）に変換してそのまま
// IndexedDB に保存する。

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

// data URL → { base64本体, 拡張子 }（バックアップ書き出し用）
export function dataUrlToB64(dataUrl: string): { b64: string; ext: string } {
  const match = /^data:image\/([a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { b64: '', ext: 'jpg' };
  const [, mime, b64] = match;
  const ext = mime === 'jpeg' ? 'jpg' : mime;
  return { b64, ext };
}

// base64本体 + 拡張子 → data URL（バックアップ復元用）
export function b64ToDataUrl(b64: string, ext: string): string {
  const mime = ext === 'jpg' ? 'jpeg' : ext;
  return `data:image/${mime};base64,${b64}`;
}
