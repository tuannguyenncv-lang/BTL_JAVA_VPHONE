import type {
  CartItem,
  CartSummary,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductFilter,
  ProductReview,
  PromoCode,
  RawCartLine,
  StoreStats,
  User,
  UserRole,
  UserStatus,
  ViewId,
} from '../types/vphone';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CHO_XAC_NHAN: 'Chờ xác nhận',
  DANG_GIAO: 'Đang giao',
  HOAN_THANH: 'Hoàn thành',
  DA_HUY: 'Đã hủy',
};

export const ORDER_NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  CHO_XAC_NHAN: ['DANG_GIAO', 'DA_HUY'],
  DANG_GIAO: ['HOAN_THANH'],
  HOAN_THANH: [],
  DA_HUY: [],
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  COD: 'Thanh toán khi nhận (COD)',
  CHUYEN_KHOAN: 'Chuyển khoản ngân hàng',
  VI_DIEN_TU: 'Ví điện tử (MoMo / VNPay)',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  CHUA_THANH_TOAN: 'Chưa thanh toán',
  CHO_XAC_NHAN: 'Chờ đối soát CK',
  DA_THANH_TOAN: 'Đã nhận tiền',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  KHACH_HANG: 'Khách hàng',
  NHAN_VIEN_BAN_HANG: 'Nhân viên bán hàng',
  THU_KHO: 'Thủ kho',
  QUAN_TRI: 'Quản trị viên',
};

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  HOAT_DONG: 'Đang hoạt động',
  BI_KHOA: 'Đã khóa',
};

const VIEW_PERMISSIONS: Record<ViewId, UserRole[] | 'PUBLIC'> = {
  sanpham: 'PUBLIC',
  gio: ['KHACH_HANG'],
  donhang: ['KHACH_HANG', 'NHAN_VIEN_BAN_HANG', 'QUAN_TRI'],
  khuyenmai: ['NHAN_VIEN_BAN_HANG', 'QUAN_TRI'],
  nhaphang: ['THU_KHO', 'QUAN_TRI'],
  thongke: ['NHAN_VIEN_BAN_HANG', 'QUAN_TRI'],
  nguoidung: ['QUAN_TRI'],
};

export function canAccessView(role: UserRole | undefined, view: ViewId): boolean {
  const rule = VIEW_PERMISSIONS[view];
  if (rule === 'PUBLIC') return true;
  if (!role) return false;
  return rule.includes(role);
}

export function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(Math.round(amount))} ₫`;
}

export function isFlashSaleActive(product: Product): boolean {
  return (
    typeof product.flashSaleGia === 'number' &&
    product.flashSaleGia > 0 &&
    product.flashSaleGia < product.giaBan
  );
}

export function getEffectivePrice(product: Product): {
  price: number;
  originalPrice: number;
  hasDiscount: boolean;
  isFlashSale: boolean;
} {
  const flash = isFlashSaleActive(product);
  const price = flash ? (product.flashSaleGia as number) : product.giaBan;
  const originalPrice = product.gia;
  return {
    price,
    originalPrice,
    hasDiscount: price < originalPrice,
    isFlashSale: flash,
  };
}

export function getProductSpecs(product: Product): string[] {
  if (product.loai === 'DIEN_THOAI') {
    return [
      product.ram ? `${product.ram}GB RAM` : '',
      product.boNho ? `${product.boNho}GB` : '',
      product.mauSac || '',
    ].filter(Boolean);
  }
  return [product.loaiPhuKien || ''].filter(Boolean);
}

export function getProductRatingSummary(
  maSanPham: string,
  reviews: ProductReview[],
): { average: number; count: number } {
  const matched = reviews.filter((r) => r.maSanPham === maSanPham);
  if (!matched.length) return { average: 0, count: 0 };
  const total = matched.reduce((acc, r) => acc + r.sao, 0);
  return {
    average: Number((total / matched.length).toFixed(1)),
    count: matched.length,
  };
}

export function getRelatedProducts(
  product: Product,
  allProducts: Product[],
  limit = 3,
): Product[] {
  return allProducts
    .filter((p) => p.ma !== product.ma)
    .sort((a, b) => {
      const aScore = (a.loai === product.loai ? 2 : 0) + (a.hang === product.hang ? 1 : 0);
      const bScore = (b.loai === product.loai ? 2 : 0) + (b.hang === product.hang ? 1 : 0);
      return bScore - aScore;
    })
    .slice(0, limit);
}

function parsePriceInput(raw: string): number | null {
  const t = raw.trim().toLowerCase().replace(/[,.\s]/g, '');
  if (!t) return null;
  if (t.endsWith('tr')) {
    const num = Number(t.slice(0, -2));
    return Number.isFinite(num) ? num * 1_000_000 : NaN;
  }
  if (t.endsWith('k')) {
    const num = Number(t.slice(0, -1));
    return Number.isFinite(num) ? num * 1_000 : NaN;
  }
  const n = Number(raw.trim());
  return Number.isFinite(n) ? n : NaN;
}

export function filterAndSortProducts(
  products: Product[],
  filter: ProductFilter,
  reviews: ProductReview[],
): Product[] {
  const tokens = filter.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const minVal = parsePriceInput(filter.min);
  const maxVal = parsePriceInput(filter.max);

  const filtered = products.filter((p) => {
    if (tokens.length > 0) {
      const ramHint = p.ram ? `${p.ram}gb ${p.ram} gb ram` : '';
      const ssdHint = p.boNho ? `${p.boNho}gb ${p.boNho} gb ${p.boNho}ssd ssd rom` : '';
      const hay = `${p.ma} ${p.ten} ${p.hang} ${ramHint} ${ssdHint} ${p.chip || ''} ${p.mauSac || ''} ${p.loaiPhuKien || ''}`.toLowerCase();
      if (!tokens.every((token) => hay.includes(token))) return false;
    }
    if (filter.hang !== 'ALL' && p.hang !== filter.hang) return false;
    if (filter.ram && filter.ram !== 'ALL' && p.ram !== Number(filter.ram)) return false;
    if (filter.boNho && filter.boNho !== 'ALL' && p.boNho !== Number(filter.boNho)) return false;
    if (filter.loai === 'FLASH_SALE') {
      if (!isFlashSaleActive(p)) return false;
    } else if (filter.loai !== 'ALL' && p.loai !== filter.loai) {
      return false;
    }
    if (filter.stockState === 'IN_STOCK' && p.ton <= 0) return false;
    if (filter.stockState === 'LOW_STOCK' && (p.ton <= 0 || p.ton > 5)) return false;
    if (filter.stockState === 'OUT_OF_STOCK' && p.ton !== 0) return false;

    const eff = getEffectivePrice(p).price;
    if (minVal !== null && !Number.isNaN(minVal) && eff < minVal) return false;
    if (maxVal !== null && !Number.isNaN(maxVal) && eff > maxVal) return false;
    return true;
  });

  if (filter.sort === 'gia_tang') {
    return [...filtered].sort((a, b) => getEffectivePrice(a).price - getEffectivePrice(b).price);
  }
  if (filter.sort === 'gia_giam') {
    return [...filtered].sort((a, b) => getEffectivePrice(b).price - getEffectivePrice(a).price);
  }
  if (filter.sort === 'danh_gia') {
    return [...filtered].sort(
      (a, b) =>
        getProductRatingSummary(b.ma, reviews).average -
        getProductRatingSummary(a.ma, reviews).average,
    );
  }
  return filtered;
}

export function paginateItems<T>(items: T[], page: number, pageSize: number) {
  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    currentPage,
    totalPages,
    totalItems,
  };
}

export function buildCartSummary(rawLines: RawCartLine[], products: Product[]): CartSummary {
  const items: CartItem[] = [];
  let tong = 0;
  let tongGiam = 0;
  let soLuong = 0;

  for (const line of rawLines) {
    const sp = products.find((p) => p.ma === line.ma);
    if (!sp) continue;
    const eff = getEffectivePrice(sp);
    const qty = Math.max(1, Math.min(line.soLuong, sp.ton || line.soLuong));
    const thanhTien = eff.price * qty;
    tong += thanhTien;
    tongGiam += Math.max(0, eff.originalPrice - eff.price) * qty;
    soLuong += qty;
    items.push({
      ma: sp.ma,
      ten: sp.ten,
      hang: sp.hang,
      loai: sp.loai,
      mauSac: sp.mauSac,
      anh: sp.anh,
      ton: sp.ton,
      donGia: eff.price,
      soLuong: qty,
      thanhTien,
      isFlashSale: eff.isFlashSale,
    });
  }

  return { items, tong, tongGiam, soLuong };
}

export function evaluatePromoCode(
  promo: PromoCode | undefined,
  cart: CartSummary,
  todayIso: string,
): { valid: boolean; discount: number; error?: string } {
  if (!promo) return { valid: false, discount: 0, error: 'Mã giảm giá không tồn tại.' };
  if (!promo.kichHoat) return { valid: false, discount: 0, error: 'Mã giảm giá đang tạm ngừng.' };
  if (promo.hanDung < todayIso) return { valid: false, discount: 0, error: 'Mã giảm giá đã hết hạn.' };

  const eligibleAmount =
    promo.apDungCho === 'ALL'
      ? cart.tong
      : cart.items
          .filter((i) => i.loai === promo.apDungCho)
          .reduce((acc, i) => acc + i.thanhTien, 0);

  if (eligibleAmount <= 0) {
    return {
      valid: false,
      discount: 0,
      error: `Mã chỉ áp dụng cho ${promo.apDungCho === 'PHU_KIEN' ? 'phụ kiện' : 'điện thoại'}.`,
    };
  }
  if (cart.tong < promo.donToiThieu) {
    return {
      valid: false,
      discount: 0,
      error: `Cần đơn tối thiểu ${formatVnd(promo.donToiThieu)}.`,
    };
  }

  const discount =
    promo.loai === 'PHAN_TRAM'
      ? Math.round(eligibleAmount * (promo.giaTri / 100))
      : Math.min(eligibleAmount, promo.giaTri);

  return { valid: true, discount };
}

export function computeStoreStats(
  products: Product[],
  orders: Order[],
  users: User[],
): StoreStats {
  let tongGiaTriTon = 0;
  let giaCaoNhat: Product | null = null;
  const sapHet: Product[] = [];

  for (const p of products) {
    const eff = getEffectivePrice(p).price;
    tongGiaTriTon += eff * p.ton;
    if (!giaCaoNhat || eff > getEffectivePrice(giaCaoNhat).price) {
      giaCaoNhat = p;
    }
    if (p.ton <= 5) {
      sapHet.push(p);
    }
  }
  sapHet.sort((a, b) => a.ton - b.ton);

  const donTheoTrangThai: Record<OrderStatus, number> = {
    CHO_XAC_NHAN: 0,
    DANG_GIAO: 0,
    HOAN_THANH: 0,
    DA_HUY: 0,
  };
  let doanhThu = 0;
  for (const o of orders) {
    donTheoTrangThai[o.trangThai] = (donTheoTrangThai[o.trangThai] || 0) + 1;
    if (o.trangThai === 'HOAN_THANH') {
      doanhThu += o.tong;
    }
  }

  return {
    tongGiaTriTon,
    doanhThu,
    soSanPham: products.length,
    soKhachHang: users.filter((u) => u.vaiTro === 'KHACH_HANG').length,
    giaCaoNhat,
    donTheoTrangThai,
    sapHet,
  };
}

export function computeRevenueSeries(
  orders: Order[],
  mode: 'day' | 'month',
): { key: string; label: string; revenue: number; orders: number }[] {
  const map = new Map<string, { label: string; revenue: number; orders: number }>();
  for (const o of orders) {
    if (o.trangThai !== 'HOAN_THANH') continue;
    const datePart = o.ngay.split(' ')[0] || o.ngay;
    const parts = datePart.split('/');
    const key =
      mode === 'month' && parts.length === 3 ? `${parts[2]}-${parts[1]}` : datePart;
    const label =
      mode === 'month' && parts.length === 3 ? `T${parts[1]}/${parts[2].slice(2)}` : datePart.slice(0, 5);
    const cur = map.get(key) || { label, revenue: 0, orders: 0 };
    cur.revenue += o.tong;
    cur.orders += 1;
    map.set(key, cur);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, val]) => ({ key, ...val }));
}

export function computeTopSellingProducts(
  orders: Order[],
  products: Product[],
  limit = 5,
): { ma: string; ten: string; hang: string; soLuongBan: number; doanhThu: number }[] {
  const map = new Map<string, { ma: string; ten: string; hang: string; soLuongBan: number; doanhThu: number }>();
  for (const o of orders) {
    if (o.trangThai === 'DA_HUY') continue;
    for (const line of o.chiTiet) {
      const sp = products.find((p) => p.ma === line.ma);
      const cur = map.get(line.ma) || {
        ma: line.ma,
        ten: line.ten,
        hang: sp?.hang || 'VPHONE',
        soLuongBan: 0,
        doanhThu: 0,
      };
      cur.soLuongBan += line.soLuong;
      cur.doanhThu += line.thanhTien;
      map.set(line.ma, cur);
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.soLuongBan - a.soLuongBan || b.doanhThu - a.doanhThu)
    .slice(0, limit);
}

/* ---------------- Validation Helpers ---------------- */

export function validateRequired(val: string): string {
  return val.trim() ? '' : 'Vui lòng nhập thông tin này.';
}

export function validateEmail(val: string): string {
  const v = val.trim();
  if (!v) return 'Vui lòng nhập email.';
  return /^\S+@\S+\.\S+$/.test(v) ? '' : 'Email không hợp lệ.';
}

export function validatePhone(val: string): string {
  const v = val.trim();
  if (!v) return '';
  return /^[0-9+().\s-]{9,20}$/.test(v) ? '' : 'Số điện thoại không hợp lệ (9–20 ký tự).';
}

export function validatePositiveNumber(val: string, label = 'giá trị'): string {
  const v = val.trim();
  if (!v) return `Vui lòng nhập ${label}.`;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? '' : `${label.charAt(0).toUpperCase() + label.slice(1)} phải lớn hơn 0.`;
}

export function validateNonNegativeNumber(val: string): string {
  const v = val.trim();
  if (!v) return 'Vui lòng nhập giá trị.';
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? '' : 'Giá trị phải >= 0.';
}

export function validateInteger(val: string, min = 0): string {
  const v = val.trim();
  if (!v) return 'Vui lòng nhập số lượng.';
  const n = Number(v);
  return Number.isSafeInteger(n) && n >= min ? '' : `Nhập số nguyên từ ${min} trở lên.`;
}

export function validateImageUrl(val: string): string {
  const v = val.trim();
  if (!v) return '';
  return /^(https?:\/\/|\/)[^\s]*$/i.test(v) ? '' : 'Dùng đường dẫn /... hoặc URL http(s).';
}

export function validatePriceRange(
  minStr: string,
  maxStr: string,
): { minErr: string; maxErr: string } {
  const minVal = parsePriceInput(minStr);
  const maxVal = parsePriceInput(maxStr);
  const minErr =
    minVal !== null && (Number.isNaN(minVal) || minVal < 0)
      ? 'Giá tối thiểu phải >= 0.'
      : '';
  let maxErr =
    maxVal !== null && (Number.isNaN(maxVal) || maxVal < 0)
      ? 'Giá tối đa phải >= 0.'
      : '';
  if (!minErr && !maxErr && minVal !== null && maxVal !== null && minVal > maxVal) {
    maxErr = 'Giá đến phải >= giá từ.';
  }
  return { minErr, maxErr };
}
