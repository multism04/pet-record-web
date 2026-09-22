type Props = {
  name: string;
  color: string;
  photoPath?: string | null;
  size?: number;
};

// プロフィール写真があればそれを、なければ色付きの丸＋頭文字を表示する。
export default function Avatar({ name, color, photoPath, size = 44 }: Props) {
  const dimStyle = { width: size, height: size, borderRadius: size / 2 };

  if (photoPath) {
    return (
      <img
        src={photoPath}
        alt={name}
        style={{ ...dimStyle, objectFit: 'cover', background: '#eee', display: 'block' }}
      />
    );
  }

  return (
    <div
      style={{
        ...dimStyle,
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span style={{ color: '#fff', fontWeight: 'bold', fontSize: size * 0.45 }}>
        {name.charAt(0)}
      </span>
    </div>
  );
}
