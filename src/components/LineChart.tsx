export type ChartPoint = { label: string; value: number };

type Props = {
  data: ChartPoint[];
  color: string;
  unit?: string;
  // 'zero'=0が下端／'auto'=最小値付近を下端（変化が見やすい）
  baseline?: 'zero' | 'auto';
};

const CHART_H = 170;
const COL_W = 52;
const DOT = 8;
const TOP_PAD = 18;
const AXIS_W = 36;
const TICKS = 4;

// div の絶対配置だけで描く折れ線グラフ（スマホ版と同じロジック）。
export default function LineChart({ data, color, unit = '', baseline = 'zero' }: Props) {
  if (data.length === 0) {
    return <p className="muted" style={{ textAlign: 'center', padding: '30px 0' }}>データがありません。</p>;
  }

  const values = data.map((d) => d.value);
  const maxV = Math.max(...values);
  const minV = Math.min(...values);

  let low = 0;
  let high = maxV;
  if (baseline === 'auto') {
    const pad = (maxV - minV) * 0.2 || maxV * 0.1 || 1;
    low = Math.max(0, minV - pad);
    high = maxV + pad;
  }
  const span = high - low || 1;

  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  const pts = data.map((d, i) => {
    const x = i * COL_W + COL_W / 2;
    const ratio = (d.value - low) / span;
    const y = CHART_H - Math.max(0, Math.min(1, ratio)) * CHART_H;
    return { x, y, value: d.value, label: d.label };
  });

  const contentWidth = data.length * COL_W;

  const ticks = Array.from({ length: TICKS + 1 }, (_, i) => {
    const ratio = i / TICKS;
    return { value: low + ratio * span, y: CHART_H - ratio * CHART_H };
  });

  const segments = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    segments.push(
      <div
        key={`seg-${i}`}
        style={{
          position: 'absolute',
          left: midX - length / 2,
          top: midY - 1,
          width: length,
          height: 2,
          background: color,
          transform: `rotate(${angle}deg)`,
        }}
      />
    );
  }

  return (
    <div>
      <p style={{ fontSize: 11, color: '#999', margin: '0 0 4px' }}>
        最大 {fmt(maxV)}
        {unit} ／ 最小 {fmt(minV)}
        {unit}
      </p>

      <div style={{ display: 'flex' }}>
        {/* Y軸目盛りラベル（固定列） */}
        <div style={{ position: 'relative', width: AXIS_W, height: TOP_PAD + CHART_H, flexShrink: 0 }}>
          {ticks.map((t, i) => (
            <span
              key={`axis-${i}`}
              style={{
                position: 'absolute',
                top: TOP_PAD + t.y - 6,
                right: 6,
                left: 0,
                fontSize: 10,
                color: '#aaa',
                textAlign: 'right',
              }}
            >
              {fmt(t.value)}
            </span>
          ))}
        </div>

        <div className="hscroll">
          <div style={{ width: contentWidth, flexShrink: 0 }}>
            <div style={{ position: 'relative', height: CHART_H, marginTop: TOP_PAD }}>
              {ticks.map((t, i) => (
                <div
                  key={`grid-${i}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: t.y,
                    width: contentWidth,
                    height: 1,
                    background: '#eee',
                  }}
                />
              ))}
              {segments}
              {pts.map((p, i) => (
                <div key={`dot-${i}`}>
                  <span
                    style={{
                      position: 'absolute',
                      left: i * COL_W,
                      width: COL_W,
                      top: Math.max(-TOP_PAD, p.y - TOP_PAD),
                      fontSize: 10,
                      color: '#666',
                      textAlign: 'center',
                    }}
                  >
                    {fmt(p.value)}
                  </span>
                  <div
                    style={{
                      position: 'absolute',
                      left: p.x - DOT / 2,
                      top: p.y - DOT / 2,
                      width: DOT,
                      height: DOT,
                      borderRadius: DOT / 2,
                      border: '2px solid #fff',
                      background: color,
                    }}
                  />
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', marginTop: 6 }}>
              {pts.map((p, i) => (
                <span
                  key={`lbl-${i}`}
                  style={{ width: COL_W, textAlign: 'center', fontSize: 10, color: '#888' }}
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {baseline === 'auto' && (
        <p style={{ fontSize: 10, color: '#bbb', marginTop: 6 }}>
          ※ 変化を見やすくするため、目盛りは0からではありません
        </p>
      )}
    </div>
  );
}
