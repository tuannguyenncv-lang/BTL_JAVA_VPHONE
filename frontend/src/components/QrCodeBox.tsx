import { useMemo } from 'react';
import QRCode from 'qrcode';

interface QrCodeBoxProps {
  value: string;
  size?: number;
  label?: string;
}

export function QrCodeBox({ value, size = 148, label = 'Mã QR thanh toán' }: QrCodeBoxProps) {
  const matrix = useMemo(() => {
    const qr = QRCode.create(value || 'VPHONE', { errorCorrectionLevel: 'M' });
    const count = qr.modules.size;
    const rects: { x: number; y: number }[] = [];
    for (let r = 0; r < count; r += 1) {
      for (let c = 0; c < count; c += 1) {
        if (qr.modules.get(r, c)) {
          rects.push({ x: c, y: r });
        }
      }
    }
    return { count, rects };
  }, [value]);

  const quiet = 2;
  const viewSize = matrix.count + quiet * 2;

  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-2 shadow-xs dark:border-slate-700">
      <svg
        role="img"
        aria-label={label}
        width={size}
        height={size}
        viewBox={`0 0 ${viewSize} ${viewSize}`}
        shapeRendering="crispEdges"
        className="block"
      >
        <rect width={viewSize} height={viewSize} fill="#ffffff" />
        {matrix.rects.map((pt) => (
          <rect
            key={`${pt.x}-${pt.y}`}
            x={pt.x + quiet}
            y={pt.y + quiet}
            width={1}
            height={1}
            fill="#0f172a"
          />
        ))}
      </svg>
    </div>
  );
}
