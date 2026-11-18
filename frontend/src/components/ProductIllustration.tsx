import { useState } from 'react';
import type { Product } from '../types/vphone';

interface ProductIllustrationProps {
  product: Pick<Product, 'ma' | 'ten' | 'hang' | 'loai' | 'mauSac' | 'loaiPhuKien' | 'anh'>;
  compact?: boolean;
  cover?: boolean;
}

function resolvePalette(product: ProductIllustrationProps['product']) {
  const colorHint = `${product.mauSac || ''} ${product.ten} ${product.hang}`.toLowerCase();
  if (colorHint.includes('sa mạc') || colorHint.includes('vàng')) {
    return { body: '#C6A98D', bezel: '#574636', screenTop: '#2B2118', screenBot: '#8D6E52', accent: '#E5D3BF' };
  }
  if (colorHint.includes('xanh dương') || colorHint.includes('blue')) {
    return { body: '#5B84B1', bezel: '#1D2D44', screenTop: '#0F2547', screenBot: '#3B82F6', accent: '#BFDBFE' };
  }
  if (colorHint.includes('xanh') || colorHint.includes('hazel')) {
    return { body: '#63766B', bezel: '#222B26', screenTop: '#16261E', screenBot: '#4E7A65', accent: '#C6DDD1' };
  }
  if (colorHint.includes('trắng') || colorHint.includes('ngọc') || colorHint.includes('silver')) {
    return { body: '#E5E7EB', bezel: '#374151', screenTop: '#1E293B', screenBot: '#64748B', accent: '#F8FAFC' };
  }
  if (colorHint.includes('xám') || colorHint.includes('titan')) {
    return { body: '#6B7280', bezel: '#1F2937', screenTop: '#111827', screenBot: '#3B5998', accent: '#D1D5DB' };
  }
  return { body: '#27272A', bezel: '#09090B', screenTop: '#111827', screenBot: '#2563EB', accent: '#93C5FD' };
}

export function ProductIllustration({
  product,
  compact = false,
  cover = false,
}: ProductIllustrationProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasValidImg = product.anh && /^(https?:\/\/|\/)[^\s]*$/i.test(product.anh) && !imgFailed;

  if (hasValidImg) {
    return (
      <img
        src={product.anh}
        alt={`Ảnh ${product.ten}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        onError={() => setImgFailed(true)}
        className={`h-full w-full ${cover ? 'object-cover' : 'object-contain'}`}
      />
    );
  }

  const palette = resolvePalette(product);
  const isAccessory = product.loai === 'PHU_KIEN';
  const kind = `${product.loaiPhuKien || ''} ${product.ten}`.toLowerCase();

  if (isAccessory) {
    if (kind.includes('tai nghe') || kind.includes('airpods')) {
      return (
        <svg
          viewBox="0 0 220 160"
          role="img"
          aria-label={`Minh họa ${product.ten}`}
          className={compact ? 'h-full w-full' : 'h-32 w-44'}
        >
          <rect x="52" y="28" width="116" height="104" rx="28" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="3" />
          <path d="M52 64h116" stroke="#CBD5E1" strokeWidth="2.5" />
          <rect x="94" y="58" width="32" height="6" rx="3" fill="#94A3B8" />
          <circle cx="110" cy="84" r="3" fill="#22C55E" />
          <rect x="76" y="42" width="68" height="8" rx="4" fill="#F1F5F9" />
        </svg>
      );
    }

    if (kind.includes('ốp')) {
      return (
        <svg
          viewBox="0 0 220 160"
          role="img"
          aria-label={`Minh họa ${product.ten}`}
          className={compact ? 'h-full w-full' : 'h-32 w-44'}
        >
          <rect x="74" y="14" width="72" height="132" rx="16" fill="#1E293B" stroke="#475569" strokeWidth="2.5" />
          <rect x="82" y="22" width="24" height="24" rx="6" fill="#0F172A" stroke="#64748B" strokeWidth="1.5" />
          <circle cx="110" cy="86" r="18" fill="none" stroke="#94A3B8" strokeWidth="3" />
          <rect x="108" y="108" width="4" height="12" rx="2" fill="#94A3B8" />
        </svg>
      );
    }

    return (
      <svg
        viewBox="0 0 220 160"
        role="img"
        aria-label={`Minh họa ${product.ten}`}
        className={compact ? 'h-full w-full' : 'h-32 w-44'}
      >
        <rect x="74" y="34" width="72" height="96" rx="16" fill="#1E293B" stroke="#475569" strokeWidth="2.5" />
        <rect x="86" y="18" width="8" height="16" rx="2" fill="#CBD5E1" />
        <rect x="126" y="18" width="8" height="16" rx="2" fill="#CBD5E1" />
        <rect x="92" y="54" width="36" height="8" rx="4" fill="#3B82F6" />
        <rect x="92" y="72" width="36" height="8" rx="4" fill="#64748B" />
        <rect x="92" y="90" width="36" height="8" rx="4" fill="#64748B" />
      </svg>
    );
  }

  const gradId = `scr-${product.ma.replace(/[^a-zA-Z0-9]/g, '')}`;
  const isPixel = product.hang.toLowerCase().includes('google');
  const isXiaomi = product.hang.toLowerCase().includes('xiaomi');

  return (
    <svg
      viewBox="0 0 220 160"
      role="img"
      aria-label={`Minh họa ${product.ten}`}
      className={compact ? 'h-full w-full' : 'h-32 w-44'}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.screenTop} />
          <stop offset="100%" stopColor={palette.screenBot} />
        </linearGradient>
      </defs>
      <rect x="46" y="12" width="66" height="136" rx="13" fill={palette.bezel} stroke={palette.body} strokeWidth="2.5" />
      <rect x="51" y="18" width="56" height="124" rx="9" fill={`url(#${gradId})`} />
      <rect x="70" y="22" width="18" height="4.5" rx="2.25" fill="#09090B" />
      <path d="M62 110c10-20 24-20 34 0" fill="none" stroke={palette.accent} strokeWidth="3.5" strokeLinecap="round" opacity="0.7" />
      <rect x="108" y="16" width="66" height="132" rx="13" fill={palette.body} stroke={palette.bezel} strokeWidth="2" />
      {isPixel ? (
        <rect x="112" y="34" width="58" height="16" rx="8" fill="#18181B" />
      ) : isXiaomi ? (
        <circle cx="141" cy="46" r="18" fill="#18181B" stroke="#3F3F46" strokeWidth="2" />
      ) : (
        <rect x="116" y="24" width="26" height="28" rx="7" fill="#18181B" opacity="0.88" />
      )}
      <circle cx="124" cy="33" r="4" fill="#3F3F46" stroke="#71717A" strokeWidth="1" />
      <circle cx="135" cy="43" r="4" fill="#3F3F46" stroke="#71717A" strokeWidth="1" />
      {!isPixel && <circle cx="124" cy="44" r="3.5" fill="#3F3F46" />}
    </svg>
  );
}
