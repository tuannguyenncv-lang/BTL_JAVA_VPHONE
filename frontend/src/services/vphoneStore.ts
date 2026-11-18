import {
  SEED_ORDERS,
  SEED_PRODUCTS,
  SEED_PROMOS,
  SEED_RECEIPTS,
  SEED_REVIEWS,
  SEED_SUPPLIERS,
  SEED_USERS,
} from '../data/seedData';
import type {
  ImportReceipt,
  Order,
  OrderStatus,
  PaymentMethod,
  Product,
  ProductReview,
  ProductType,
  PromoCode,
  RawCartLine,
  SafeUser,
  Supplier,
  User,
  UserRole,
  UserStatus,
} from '../types/vphone';
import { hashPasswordWithSalt, verifyPassword } from '../utils/passwordHash';
import { buildCartSummary, evaluatePromoCode } from '../utils/vphoneLogic';

const STORAGE_KEY = 'vphone_store_v3';
const SESSION_KEY = 'vphone_session_v3';

export interface StoreState {
  users: User[];
  products: Product[];
  promos: PromoCode[];
  suppliers: Supplier[];
  orders: Order[];
  receipts: ImportReceipt[];
  reviews: ProductReview[];
  carts: Record<string, RawCartLine[]>;
}

function getDefaultState(): StoreState {
  return {
    users: SEED_USERS.map((u) => ({ ...u })),
    products: SEED_PRODUCTS.map((p) => ({ ...p })),
    promos: SEED_PROMOS.map((pr) => ({ ...pr })),
    suppliers: SEED_SUPPLIERS.map((s) => ({ ...s })),
    orders: SEED_ORDERS.map((o) => ({
      ...o,
      chiTiet: o.chiTiet.map((l) => ({ ...l })),
    })),
    receipts: SEED_RECEIPTS.map((r) => ({
      ...r,
      chiTiet: r.chiTiet.map((l) => ({ ...l })),
    })),
    reviews: SEED_REVIEWS.map((rv) => ({ ...rv })),
    carts: {},
  };
}

export function loadStoreState(): StoreState {
  const defaults = getDefaultState();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<StoreState>;
    const users = Array.isArray(parsed.users) && parsed.users.length
      ? parsed.users.map((u) => ({
          ...u,
          trangThai: u.trangThai === 'BI_KHOA' ? ('BI_KHOA' as UserStatus) : ('HOAT_DONG' as UserStatus),
        }))
      : defaults.users;
    return {
      users,
      products: Array.isArray(parsed.products) && parsed.products.length ? parsed.products : defaults.products,
      promos: Array.isArray(parsed.promos) ? parsed.promos : defaults.promos,
      suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : defaults.suppliers,
      orders: Array.isArray(parsed.orders) ? parsed.orders : defaults.orders,
      receipts: Array.isArray(parsed.receipts) ? parsed.receipts : defaults.receipts,
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : defaults.reviews,
      carts: parsed.carts && typeof parsed.carts === 'object' ? parsed.carts : {},
    };
  } catch {
    return defaults;
  }
}

export function saveStoreState(state: StoreState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors
  }
}

export function toSafeUser(user: User): SafeUser {
  const { matKhauHash: _omitted, ...safe } = user;
  void _omitted;
  return {
    ...safe,
    trangThai: user.trangThai || 'HOAT_DONG',
  };
}

export function loadSessionUser(users: User[]): SafeUser | null {
  try {
    const ma = localStorage.getItem(SESSION_KEY);
    if (!ma) return null;
    const found = users.find((u) => u.ma === ma);
    if (!found || found.trangThai === 'BI_KHOA') {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return toSafeUser(found);
  } catch {
    return null;
  }
}

export function saveSessionUser(ma: string | null): void {
  try {
    if (ma) localStorage.setItem(SESSION_KEY, ma);
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

function nowFormatted(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function nextSequentialCode(existing: string[], prefix: string, pad = 2): string {
  let maxNum = 0;
  for (const code of existing) {
    if (code.startsWith(prefix)) {
      const n = parseInt(code.slice(prefix.length), 10);
      if (Number.isFinite(n) && n > maxNum) maxNum = n;
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(pad, '0')}`;
}

function rolePrefix(role: UserRole): string {
  switch (role) {
    case 'NHAN_VIEN_BAN_HANG':
      return 'NV';
    case 'THU_KHO':
      return 'TK';
    case 'QUAN_TRI':
      return 'QT';
    default:
      return 'KH';
  }
}

/* ---------------- Auth & User Management (RBAC) ---------------- */

export function authenticateUser(state: StoreState, email: string, matKhau: string): SafeUser {
  const normalized = email.trim().toLowerCase();
  const found = state.users.find((u) => u.email.trim().toLowerCase() === normalized);
  if (!found || !verifyPassword(matKhau, found.matKhauHash)) {
    throw new Error('Email hoặc mật khẩu không chính xác.');
  }
  if (found.trangThai === 'BI_KHOA') {
    throw new Error('Tài khoản của bạn đã bị khóa bởi quản trị viên.');
  }
  return toSafeUser(found);
}

export function registerCustomer(
  state: StoreState,
  input: { hoTen: string; email: string; matKhau: string; sdt: string; diaChi: string },
): { nextState: StoreState; user: SafeUser } {
  const email = input.email.trim().toLowerCase();
  if (state.users.some((u) => u.email.trim().toLowerCase() === email)) {
    throw new Error('Email này đã được đăng ký trong hệ thống.');
  }
  const ma = nextSequentialCode(
    state.users.map((u) => u.ma),
    'KH',
  );
  const newUser: User = {
    ma,
    hoTen: input.hoTen.trim(),
    email,
    matKhauHash: hashPasswordWithSalt(input.matKhau),
    sdt: input.sdt.trim(),
    vaiTro: 'KHACH_HANG',
    trangThai: 'HOAT_DONG',
    diaChi: input.diaChi.trim(),
    authProvider: 'LOCAL',
  };
  return {
    nextState: { ...state, users: [...state.users, newUser] },
    user: toSafeUser(newUser),
  };
}

export function upsertGoogleUser(
  state: StoreState,
  input: {
    uid: string;
    email: string;
    hoTen: string;
    avatarUrl?: string;
    isBootstrappedAdmin?: boolean;
    resolvedRole?: UserRole;
    resolvedStatus?: UserStatus;
  },
): { nextState: StoreState; user: SafeUser; isNewUser: boolean } {
  const email = input.email.trim().toLowerCase();
  const idx = state.users.findIndex(
    (u) => u.firebaseUid === input.uid || u.email.trim().toLowerCase() === email,
  );
  const desiredRole: UserRole =
    input.resolvedRole || (input.isBootstrappedAdmin ? 'QUAN_TRI' : 'KHACH_HANG');

  if (idx >= 0) {
    const existing = state.users[idx];
    const nextRole: UserRole = input.resolvedRole
      ? input.resolvedRole
      : input.isBootstrappedAdmin
        ? 'QUAN_TRI'
        : existing.vaiTro;
    const nextStatus: UserStatus = input.resolvedStatus || existing.trangThai || 'HOAT_DONG';
    const updated: User = {
      ...existing,
      hoTen: input.hoTen.trim() || existing.hoTen,
      email,
      vaiTro: nextRole,
      trangThai: nextStatus,
      authProvider: 'GOOGLE',
      firebaseUid: input.uid,
      avatarUrl: input.avatarUrl || existing.avatarUrl,
    };
    const nextUsers = [...state.users];
    nextUsers[idx] = updated;
    return {
      nextState: { ...state, users: nextUsers },
      user: toSafeUser(updated),
      isNewUser: false,
    };
  }

  const ma = nextSequentialCode(
    state.users.map((u) => u.ma),
    desiredRole === 'QUAN_TRI' ? 'QT' : 'KH',
  );
  const created: User = {
    ma,
    hoTen: input.hoTen.trim() || email.split('@')[0],
    email,
    matKhauHash: 'google-oauth-firebase',
    sdt: '',
    vaiTro: desiredRole,
    trangThai: input.resolvedStatus || 'HOAT_DONG',
    chucVu: desiredRole === 'QUAN_TRI' ? 'Quản trị hệ thống (Google)' : undefined,
    authProvider: 'GOOGLE',
    firebaseUid: input.uid,
    avatarUrl: input.avatarUrl,
  };
  return {
    nextState: { ...state, users: [...state.users, created] },
    user: toSafeUser(created),
    isNewUser: true,
  };
}

export function createUserByAdmin(
  state: StoreState,
  input: {
    hoTen: string;
    email: string;
    matKhau: string;
    sdt: string;
    vaiTro: UserRole;
    trangThai: UserStatus;
    diaChi?: string;
    chucVu?: string;
  },
): { nextState: StoreState; user: User } {
  const email = input.email.trim().toLowerCase();
  if (state.users.some((u) => u.email.trim().toLowerCase() === email)) {
    throw new Error('Email này đã tồn tại trong hệ thống.');
  }
  if (!input.matKhau.trim() || input.matKhau.trim().length < 6) {
    throw new Error('Mật khẩu phải có ít nhất 6 ký tự.');
  }
  const prefix = rolePrefix(input.vaiTro);
  const ma = nextSequentialCode(
    state.users.map((u) => u.ma),
    prefix,
  );
  const created: User = {
    ma,
    hoTen: input.hoTen.trim(),
    email,
    matKhauHash: hashPasswordWithSalt(input.matKhau.trim()),
    sdt: input.sdt.trim(),
    vaiTro: input.vaiTro,
    trangThai: input.trangThai,
    diaChi: input.vaiTro === 'KHACH_HANG' ? input.diaChi?.trim() : undefined,
    chucVu: input.vaiTro !== 'KHACH_HANG' ? input.chucVu?.trim() : undefined,
    authProvider: 'LOCAL',
  };
  return {
    nextState: { ...state, users: [...state.users, created] },
    user: created,
  };
}

export function updateUserByAdmin(
  state: StoreState,
  ma: string,
  patch: {
    hoTen: string;
    email: string;
    matKhau?: string;
    sdt: string;
    vaiTro: UserRole;
    trangThai: UserStatus;
    diaChi?: string;
    chucVu?: string;
  },
  currentAdminMa?: string,
): { nextState: StoreState; user: User } {
  const idx = state.users.findIndex((u) => u.ma === ma);
  if (idx < 0) throw new Error('Không tìm thấy tài khoản.');
  const existing = state.users[idx];

  const email = patch.email.trim().toLowerCase();
  if (state.users.some((u) => u.ma !== ma && u.email.trim().toLowerCase() === email)) {
    throw new Error('Email này đã được sử dụng bởi tài khoản khác.');
  }

  if (currentAdminMa && ma === currentAdminMa) {
    if (patch.trangThai === 'BI_KHOA') {
      throw new Error('Không thể tự khóa tài khoản Quản trị đang đăng nhập.');
    }
    if (patch.vaiTro !== 'QUAN_TRI') {
      throw new Error('Không thể tự hạ quyền tài khoản Quản trị đang đăng nhập.');
    }
  }

  const wasActiveAdmin = existing.vaiTro === 'QUAN_TRI' && existing.trangThai === 'HOAT_DONG';
  const remainsActiveAdmin = patch.vaiTro === 'QUAN_TRI' && patch.trangThai === 'HOAT_DONG';
  if (wasActiveAdmin && !remainsActiveAdmin) {
    const otherActiveAdmins = state.users.filter(
      (u) => u.ma !== ma && u.vaiTro === 'QUAN_TRI' && u.trangThai === 'HOAT_DONG',
    );
    if (otherActiveAdmins.length === 0) {
      throw new Error('Hệ thống cần ít nhất 1 Quản trị viên đang hoạt động.');
    }
  }

  const nextHash =
    patch.matKhau && patch.matKhau.trim()
      ? hashPasswordWithSalt(patch.matKhau.trim())
      : existing.matKhauHash;

  const updated: User = {
    ...existing,
    hoTen: patch.hoTen.trim(),
    email,
    matKhauHash: nextHash,
    sdt: patch.sdt.trim(),
    vaiTro: patch.vaiTro,
    trangThai: patch.trangThai,
    diaChi: patch.vaiTro === 'KHACH_HANG' ? patch.diaChi?.trim() : undefined,
    chucVu: patch.vaiTro !== 'KHACH_HANG' ? patch.chucVu?.trim() : undefined,
  };
  const nextUsers = [...state.users];
  nextUsers[idx] = updated;
  return {
    nextState: { ...state, users: nextUsers },
    user: updated,
  };
}

export function toggleUserLock(
  state: StoreState,
  ma: string,
  currentAdminMa?: string,
): { nextState: StoreState; user: User } {
  const idx = state.users.findIndex((u) => u.ma === ma);
  if (idx < 0) throw new Error('Không tìm thấy tài khoản.');
  const existing = state.users[idx];
  const nextStatus: UserStatus = existing.trangThai === 'BI_KHOA' ? 'HOAT_DONG' : 'BI_KHOA';

  if (currentAdminMa && ma === currentAdminMa && nextStatus === 'BI_KHOA') {
    throw new Error('Không thể tự khóa tài khoản đang đăng nhập.');
  }

  if (existing.vaiTro === 'QUAN_TRI' && nextStatus === 'BI_KHOA') {
    const otherActiveAdmins = state.users.filter(
      (u) => u.ma !== ma && u.vaiTro === 'QUAN_TRI' && u.trangThai === 'HOAT_DONG',
    );
    if (otherActiveAdmins.length === 0) {
      throw new Error('Không thể khóa Quản trị viên hoạt động cuối cùng.');
    }
  }

  const updated: User = { ...existing, trangThai: nextStatus };
  const nextUsers = [...state.users];
  nextUsers[idx] = updated;
  return {
    nextState: { ...state, users: nextUsers },
    user: updated,
  };
}

/* ---------------- Products & Reviews ---------------- */

export function upsertProduct(
  state: StoreState,
  payload: {
    isEdit: boolean;
    ma: string;
    ten: string;
    hang: string;
    loai: ProductType;
    gia: number;
    ton: number;
    ram?: number;
    boNho?: number;
    mauSac?: string;
    loaiPhuKien?: string;
    anh?: string;
    flashSaleGia?: number;
    manHinh?: string;
    chip?: string;
    camera?: string;
    pin?: string;
  },
): StoreState {
  const ma = payload.ma.trim().toUpperCase();
  const giaBan = payload.loai === 'PHU_KIEN' ? Math.round(payload.gia * 0.95) : payload.gia;

  if (!payload.isEdit) {
    if (state.products.some((p) => p.ma.toUpperCase() === ma)) {
      throw new Error(`Mã sản phẩm ${ma} đã tồn tại.`);
    }
    const created: Product = {
      ma,
      ten: payload.ten.trim(),
      hang: payload.hang.trim(),
      loai: payload.loai,
      gia: payload.gia,
      giaBan,
      ton: payload.ton,
      ram: payload.ram,
      boNho: payload.boNho,
      mauSac: payload.mauSac?.trim() || undefined,
      loaiPhuKien: payload.loaiPhuKien?.trim() || undefined,
      anh: payload.anh?.trim() || undefined,
      flashSaleGia: payload.flashSaleGia,
      manHinh: payload.manHinh?.trim() || undefined,
      chip: payload.chip?.trim() || undefined,
      camera: payload.camera?.trim() || undefined,
      pin: payload.pin?.trim() || undefined,
    };
    return { ...state, products: [...state.products, created] };
  }

  const nextProducts = state.products.map((p) =>
    p.ma === ma
      ? {
          ...p,
          ten: payload.ten.trim(),
          hang: payload.hang.trim(),
          gia: payload.gia,
          giaBan,
          ton: payload.ton,
          ram: payload.ram,
          boNho: payload.boNho,
          mauSac: payload.mauSac?.trim() || undefined,
          loaiPhuKien: payload.loaiPhuKien?.trim() || undefined,
          anh: payload.anh?.trim() || undefined,
          flashSaleGia: payload.flashSaleGia,
          manHinh: payload.manHinh?.trim() || undefined,
          chip: payload.chip?.trim() || undefined,
        }
      : p,
  );
  return { ...state, products: nextProducts };
}

export function deleteProductByCode(state: StoreState, ma: string): StoreState {
  return {
    ...state,
    products: state.products.filter((p) => p.ma !== ma),
  };
}

export function addProductReview(
  state: StoreState,
  input: { maSanPham: string; user: SafeUser; sao: number; binhLuan: string },
): StoreState {
  const rev: ProductReview = {
    id: `REV${Date.now()}`,
    maSanPham: input.maSanPham,
    maKhach: input.user.ma,
    tenKhach: input.user.hoTen,
    sao: Math.min(5, Math.max(1, Math.round(input.sao))),
    binhLuan: input.binhLuan.trim(),
    ngay: nowFormatted().split(' ')[0],
  };
  return { ...state, reviews: [rev, ...state.reviews] };
}

/* ---------------- Cart & Orders ---------------- */

export function addToCart(
  state: StoreState,
  userMa: string,
  productMa: string,
  qty: number,
): StoreState {
  const sp = state.products.find((p) => p.ma === productMa);
  if (!sp) throw new Error('Không tìm thấy sản phẩm.');
  if (sp.ton <= 0) throw new Error('Sản phẩm tạm hết hàng.');
  const curCart = state.carts[userMa] || [];
  const existing = curCart.find((l) => l.ma === productMa);
  const targetQty = (existing?.soLuong || 0) + qty;
  if (targetQty > sp.ton) {
    throw new Error(`Số lượng vượt quá tồn kho (${sp.ton}).`);
  }
  const nextCart = existing
    ? curCart.map((l) => (l.ma === productMa ? { ...l, soLuong: targetQty } : l))
    : [...curCart, { ma: productMa, soLuong: qty }];
  return { ...state, carts: { ...state.carts, [userMa]: nextCart } };
}

export function updateCartQuantity(
  state: StoreState,
  userMa: string,
  productMa: string,
  qty: number,
): StoreState {
  if (qty <= 0) return removeFromCart(state, userMa, productMa);
  const sp = state.products.find((p) => p.ma === productMa);
  if (!sp) return state;
  if (qty > sp.ton) {
    throw new Error(`Tồn kho chỉ còn ${sp.ton} sản phẩm.`);
  }
  const curCart = state.carts[userMa] || [];
  return {
    ...state,
    carts: {
      ...state.carts,
      [userMa]: curCart.map((l) => (l.ma === productMa ? { ...l, soLuong: qty } : l)),
    },
  };
}

export function removeFromCart(state: StoreState, userMa: string, productMa: string): StoreState {
  const curCart = state.carts[userMa] || [];
  return {
    ...state,
    carts: {
      ...state.carts,
      [userMa]: curCart.filter((l) => l.ma !== productMa),
    },
  };
}

export function placeOrderFromCart(
  state: StoreState,
  user: SafeUser,
  options: { promoCode?: string; paymentMethod: PaymentMethod },
): { nextState: StoreState; order: Order } {
  const rawLines = state.carts[user.ma] || [];
  if (!rawLines.length) throw new Error('Giỏ hàng đang trống.');
  const summary = buildCartSummary(rawLines, state.products);
  if (!summary.items.length) throw new Error('Không có sản phẩm hợp lệ trong giỏ.');

  for (const item of summary.items) {
    const sp = state.products.find((p) => p.ma === item.ma);
    if (!sp || sp.ton < item.soLuong) {
      throw new Error(`"${item.ten}" không đủ tồn kho.`);
    }
  }

  let discount = 0;
  let appliedCode: string | undefined;
  if (options.promoCode) {
    const promo = state.promos.find(
      (p) => p.ma.toUpperCase() === options.promoCode!.trim().toUpperCase(),
    );
    const todayIso = new Date().toISOString().slice(0, 10);
    const evalRes = evaluatePromoCode(promo, summary, todayIso);
    if (!evalRes.valid) throw new Error(evalRes.error || 'Mã giảm giá không hợp lệ.');
    discount = evalRes.discount;
    appliedCode = promo!.ma;
  }

  const ma = nextSequentialCode(
    state.orders.map((o) => o.ma),
    'DH',
    3,
  );
  const finalTotal = Math.max(0, summary.tong - discount);

  const order: Order = {
    ma,
    maKhach: user.ma,
    khach: user.hoTen,
    ngay: nowFormatted(),
    trangThai: 'CHO_XAC_NHAN',
    phuongThucThanhToan: options.paymentMethod,
    trangThaiThanhToan: 'CHUA_THANH_TOAN',
    maGiamGia: appliedCode,
    tienGiam: discount,
    tamTinh: summary.tong,
    tong: finalTotal,
    chiTiet: summary.items.map((item) => ({
      ma: item.ma,
      ten: item.ten,
      donGia: item.donGia,
      soLuong: item.soLuong,
      thanhTien: item.thanhTien,
    })),
  };

  const nextProducts = state.products.map((sp) => {
    const ordered = summary.items.find((i) => i.ma === sp.ma);
    return ordered ? { ...sp, ton: Math.max(0, sp.ton - ordered.soLuong) } : sp;
  });

  return {
    nextState: {
      ...state,
      products: nextProducts,
      orders: [order, ...state.orders],
      carts: { ...state.carts, [user.ma]: [] },
    },
    order,
  };
}

export function transitionOrderStatus(
  state: StoreState,
  orderMa: string,
  nextStatus: OrderStatus,
  canManageOrders: boolean,
  currentUserMa: string,
  options?: { lyDoHuy?: string; nguoiHuy?: string },
): StoreState {
  const order = state.orders.find((o) => o.ma === orderMa);
  if (!order) throw new Error('Không tìm thấy đơn hàng.');

  if (!canManageOrders) {
    if (order.maKhach !== currentUserMa || order.trangThai !== 'CHO_XAC_NHAN' || nextStatus !== 'DA_HUY') {
      throw new Error('Bạn không có quyền thực hiện thao tác này.');
    }
  }

  if (order.trangThai === 'HOAN_THANH' || order.trangThai === 'DA_HUY') {
    throw new Error('Đơn hàng đã đóng, không thể thay đổi trạng thái.');
  }

  const lyDoHuy = options?.lyDoHuy?.trim() || '';
  if (nextStatus === 'DA_HUY' && lyDoHuy.length < 3) {
    throw new Error('Vui lòng nhập lý do hủy đơn hàng (tối thiểu 3 ký tự).');
  }

  const nextProducts =
    nextStatus === 'DA_HUY'
      ? state.products.map((sp) => {
          const line = order.chiTiet.find((l) => l.ma === sp.ma);
          return line ? { ...sp, ton: sp.ton + line.soLuong } : sp;
        })
      : state.products;

  return {
    ...state,
    products: nextProducts,
    orders: state.orders.map((o) => {
      if (o.ma !== orderMa) return o;
      if (nextStatus === 'DA_HUY') {
        return {
          ...o,
          trangThai: nextStatus,
          lyDoHuy,
          nguoiHuy: options?.nguoiHuy || (canManageOrders ? 'Nhân viên cửa hàng' : o.khach),
          ngayHuy: nowFormatted(),
        };
      }
      if (nextStatus === 'HOAN_THANH') {
        return {
          ...o,
          trangThai: nextStatus,
          trangThaiThanhToan: 'DA_THANH_TOAN',
          ngayXacNhanThanhToan: o.ngayXacNhanThanhToan || nowFormatted(),
        };
      }
      return { ...o, trangThai: nextStatus };
    }),
  };
}

export function reportOrderTransfer(
  state: StoreState,
  orderMa: string,
  customerMa: string,
  maGiaoDich?: string,
): StoreState {
  const order = state.orders.find((o) => o.ma === orderMa);
  if (!order) throw new Error('Không tìm thấy đơn hàng.');
  if (order.maKhach !== customerMa) {
    throw new Error('Bạn không có quyền xác nhận chuyển khoản cho đơn này.');
  }
  if (order.phuongThucThanhToan === 'COD') {
    throw new Error('Đơn thanh toán COD không cần xác nhận chuyển khoản.');
  }
  if (order.trangThai === 'DA_HUY') {
    throw new Error('Đơn hàng đã bị hủy.');
  }
  if (order.trangThaiThanhToan === 'DA_THANH_TOAN') {
    throw new Error('Đơn hàng này đã được cửa hàng xác nhận nhận tiền.');
  }
  const cleanRef = (maGiaoDich || '').trim().toUpperCase();
  const suffix = String(Date.now()).slice(-4);
  const finalRef = cleanRef || `DEMO-${order.ma}-${suffix}`;
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.ma === orderMa
        ? {
            ...o,
            trangThaiThanhToan: 'CHO_XAC_NHAN',
            maGiaoDich: finalRef,
            ngayBaoChuyenKhoan: nowFormatted(),
          }
        : o,
    ),
  };
}

export function confirmOrderPayment(
  state: StoreState,
  orderMa: string,
  staffName: string,
  maGiaoDichInput?: string,
): StoreState {
  const order = state.orders.find((o) => o.ma === orderMa);
  if (!order) throw new Error('Không tìm thấy đơn hàng.');
  if (order.trangThai === 'DA_HUY') {
    throw new Error('Không thể xác nhận thanh toán cho đơn đã hủy.');
  }
  const finalRef = (maGiaoDichInput?.trim() || order.maGiaoDich || `CK-${order.ma}`).toUpperCase();
  return {
    ...state,
    orders: state.orders.map((o) =>
      o.ma === orderMa
        ? {
            ...o,
            trangThaiThanhToan: 'DA_THANH_TOAN',
            maGiaoDich: finalRef,
            ngayXacNhanThanhToan: nowFormatted(),
            nguoiXacNhanThanhToan: staffName,
          }
        : o,
    ),
  };
}

/* ---------------- Promos ---------------- */

export function upsertPromo(state: StoreState, promo: PromoCode): StoreState {
  const code = promo.ma.trim().toUpperCase();
  const exists = state.promos.some((p) => p.ma.toUpperCase() === code);
  const nextPromos = exists
    ? state.promos.map((p) => (p.ma.toUpperCase() === code ? { ...promo, ma: code } : p))
    : [{ ...promo, ma: code }, ...state.promos];
  return { ...state, promos: nextPromos };
}

export function togglePromoStatus(state: StoreState, code: string): StoreState {
  return {
    ...state,
    promos: state.promos.map((p) =>
      p.ma === code ? { ...p, kichHoat: !p.kichHoat } : p,
    ),
  };
}

export function deletePromoByCode(state: StoreState, code: string): StoreState {
  return {
    ...state,
    promos: state.promos.filter((p) => p.ma !== code),
  };
}

/* ---------------- Suppliers & Import Receipts ---------------- */

export function upsertSupplier(
  state: StoreState,
  isEdit: boolean,
  supplier: Supplier,
): StoreState {
  const ma = supplier.ma.trim().toUpperCase();
  if (!isEdit) {
    if (state.suppliers.some((s) => s.ma.toUpperCase() === ma)) {
      throw new Error(`Mã nhà cung cấp ${ma} đã tồn tại.`);
    }
    return {
      ...state,
      suppliers: [
        ...state.suppliers,
        {
          ma,
          ten: supplier.ten.trim(),
          diaChi: supplier.diaChi.trim(),
          sdt: supplier.sdt.trim(),
        },
      ],
    };
  }
  return {
    ...state,
    suppliers: state.suppliers.map((s) =>
      s.ma === ma
        ? {
            ma,
            ten: supplier.ten.trim(),
            diaChi: supplier.diaChi.trim(),
            sdt: supplier.sdt.trim(),
          }
        : s,
    ),
  };
}

export function deleteSupplierByCode(state: StoreState, ma: string): StoreState {
  if (state.receipts.some((r) => r.maNCC === ma)) {
    throw new Error('Nhà cung cấp đã có phiếu nhập, không thể xóa.');
  }
  return {
    ...state,
    suppliers: state.suppliers.filter((s) => s.ma !== ma),
  };
}

export function createImportReceipt(
  state: StoreState,
  maNCC: string,
  lines: { ma: string; soLuong: number; giaNhap: number }[],
): { nextState: StoreState; receipt: ImportReceipt } {
  const sup = state.suppliers.find((s) => s.ma === maNCC);
  if (!sup) throw new Error('Vui lòng chọn nhà cung cấp hợp lệ.');
  if (!lines.length) throw new Error('Phiếu nhập cần ít nhất 1 sản phẩm.');

  const chiTiet = lines.map((l) => {
    const sp = state.products.find((p) => p.ma === l.ma);
    if (!sp) throw new Error(`Không tìm thấy sản phẩm ${l.ma}.`);
    return {
      ma: sp.ma,
      ten: sp.ten,
      soLuong: l.soLuong,
      giaNhap: l.giaNhap,
    };
  });

  const tong = chiTiet.reduce((acc, l) => acc + l.soLuong * l.giaNhap, 0);
  const ma = nextSequentialCode(
    state.receipts.map((r) => r.ma),
    'PN',
  );
  const receipt: ImportReceipt = {
    ma,
    maNCC: sup.ma,
    ncc: sup.ten,
    ngay: nowFormatted(),
    tong,
    chiTiet,
  };

  const addedQtyByProduct = new Map<string, number>();
  for (const l of chiTiet) {
    addedQtyByProduct.set(l.ma, (addedQtyByProduct.get(l.ma) || 0) + l.soLuong);
  }

  const nextProducts = state.products.map((sp) => {
    const add = addedQtyByProduct.get(sp.ma);
    return add ? { ...sp, ton: sp.ton + add } : sp;
  });

  return {
    nextState: {
      ...state,
      products: nextProducts,
      receipts: [receipt, ...state.receipts],
    },
    receipt,
  };
}
