import { useEffect, useState, type CSSProperties } from 'react';

type Props = {
  visible: boolean;
  photos: string[];
  initialIndex: number;
  onClose: () => void;
};

// 写真タップで開く拡大表示（複数枚あれば左右で切り替え可能）
export default function PhotoViewerModal({ visible, photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % photos.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, photos.length, onClose]);

  if (!visible || photos.length === 0) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <img
        src={photos[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
      />

      {photos.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i - 1 + photos.length) % photos.length);
            }}
            style={navBtnStyle('left')}
          >
            ‹
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIndex((i) => (i + 1) % photos.length);
            }}
            style={navBtnStyle('right')}
          >
            ›
          </button>
          <div
            style={{
              position: 'absolute',
              bottom: 40,
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 12px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.15)',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {index + 1} / {photos.length}
          </div>
        </>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        style={{
          position: 'absolute',
          top: 20,
          right: 20,
          width: 36,
          height: 36,
          borderRadius: 18,
          background: 'rgba(255,255,255,0.15)',
          color: '#fff',
          fontSize: 22,
          fontWeight: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        ×
      </button>
    </div>
  );
}

function navBtnStyle(side: 'left' | 'right'): CSSProperties {
  return {
    position: 'absolute',
    top: '50%',
    marginTop: -24,
    left: side === 'left' ? 8 : undefined,
    right: side === 'right' ? 8 : undefined,
    width: 48,
    height: 48,
    borderRadius: 24,
    background: 'rgba(255,255,255,0.15)',
    color: '#fff',
    fontSize: 30,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}
