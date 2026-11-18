import type {
  ImportReceipt,
  Order,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductType,
  RawCartLine,
  SafeUser,
  Supplier,
  User,
} from '../types/vphone';

const TOKEN_KEY = 'vphone_java_token';
const ORDER_META_KEY = 'vphone_order_meta_v1';

export interface OrderMeta {
  phuongThucThanhToan?: PaymentMethod;
  trangThaiThanhToan?: PaymentStatus;
  maGiaoDich?: string;
  ngayBaoChuyenKhoan?: string;
  ngayXacNhanThanhToan?: string;
  nguoiXacNhanThanhToan?: string;
  lyDoHuy?: string;
  nguoiHuy?: string;
  ngayHuy?: string;
  maGiamGia?: string;
  tienGiam?: number;
  tamTinh?: number;
  tongSauGiam?: number;
}

function loadAllOrderMeta(): Record<string, OrderMeta> {
  try {
    const raw = localStorage.getItem(ORDER_META_KEY);
    return raw ? (JSON.parse(raw) as Record<string, OrderMeta>) : {};
  } catch {
    return {};
  }
}

export function saveOrderMeta(ma: string, patch: OrderMeta): void {
  try {
    const all = loadAllOrderMeta();
    all[ma] = { ...(all[ma] || {}), ...patch };
    localStorage.setItem(ORDER_META_KEY, JSON.stringify(all));
  } catch {
    // Ignore storage errors
  }
}

export interface JavaServerInfo {
  cheDo: string;
  csdl: string;
}

export function getJavaToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setJavaToken(token: string | null): void {
  try {
    if (token) {
      sessionStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getJavaToken();
  const res = await fetch(`/api/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-Token': token } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof data.loi === 'string' ? data.loi : `Lỗi máy chủ (${res.status})`;
    throw new Error(msg);
  }
  return data as T;
}

function resolveDefaultProductImage(loai: ProductType, ten: string, hang: string): string {
  if (loai === 'PHU_KIEN') {
    return '/src/assets/images/prod_tech_accessories.jpg';
  }
  const hint = `${ten} ${hang}`.toLowerCase();
  if (hint.includes('iphone') || hint.includes('apple')) {
    return '/src/assets/images/prod_iphone_pro.jpg';
  }
  if (hint.includes('galaxy') || hint.includes('samsung')) {
    return '/src/assets/images/prod_galaxy_ultra.jpg';
  }
  return '/src/assets/images/prod_ceramic_phone.jpg';
}

function mapProduct(raw: Record<string, unknown>): Product {
  const loai: ProductType = raw.loai === 'PHU_KIEN' ? 'PHU_KIEN' : 'DIEN_THOAI';
  const ten = String(raw.ten || '');
  const hang = String(raw.hang || '');
  const rawAnh = raw.anh !== undefined ? String(raw.anh).trim() : '';
  return {
    ma: String(raw.ma || ''),
    ten,
    hang,
    loai,
    gia: Number(raw.gia || 0),
    giaBan: Number(raw.giaBan ?? raw.gia ?? 0),
    ton: Number(raw.ton || 0),
    ram: raw.ram !== undefined ? Number(raw.ram) : undefined,
    boNho: raw.boNho !== undefined ? Number(raw.boNho) : undefined,
    mauSac: raw.mauSac !== undefined ? String(raw.mauSac) : undefined,
    loaiPhuKien: raw.loaiPhuKien !== undefined ? String(raw.loaiPhuKien) : undefined,
    anh: rawAnh || resolveDefaultProductImage(loai, ten, hang),
  };
}

function mapSafeUser(raw: Record<string, unknown>): SafeUser {
  return {
    ma: String(raw.ma || ''),
    hoTen: String(raw.hoTen || ''),
    email: String(raw.email || ''),
    sdt: String(raw.sdt || ''),
    vaiTro: raw.vaiTro === 'QUAN_TRI' ? 'QUAN_TRI' : 'KHACH_HANG',
    trangThai: 'HOAT_DONG',
    diaChi: raw.diaChi !== undefined ? String(raw.diaChi) : undefined,
    chucVu: raw.chucVu !== undefined ? String(raw.chucVu) : undefined,
    authProvider: 'LOCAL',
  };
}

function mapOrder(raw: Record<string, unknown>): Order {
  const ma = String(raw.ma || '');
  const tong = Number(raw.tong || 0);
  const rawLines = Array.isArray(raw.chiTiet) ? raw.chiTiet : [];
  const meta = loadAllOrderMeta()[ma] || {};
  return {
    ma,
    maKhach: String(raw.maKhach || ''),
    khach: String(raw.khach || ''),
    ngay: String(raw.ngay || ''),
    trangThai: (raw.trangThai as OrderStatus) || 'CHO_XAC_NHAN',
    phuongThucThanhToan:
      (raw.phuongThucThanhToan as PaymentMethod) || meta.phuongThucThanhToan || 'COD',
    trangThaiThanhToan:
      (raw.trangThaiThanhToan as PaymentStatus) || meta.trangThaiThanhToan || 'CHUA_THANH_TOAN',
    maGiaoDich: (typeof raw.maGiaoDich === 'string' && raw.maGiaoDich) ? raw.maGiaoDich : meta.maGiaoDich,
    ngayBaoChuyenKhoan: meta.ngayBaoChuyenKhoan,
    ngayXacNhanThanhToan: meta.ngayXacNhanThanhToan,
    nguoiXacNhanThanhToan: meta.nguoiXacNhanThanhToan,
    lyDoHuy: meta.lyDoHuy,
    nguoiHuy: meta.nguoiHuy,
    ngayHuy: meta.ngayHuy,
    maGiamGia: meta.maGiamGia,
    tienGiam: meta.tienGiam ?? 0,
    tamTinh: meta.tamTinh ?? tong,
    tong: meta.tongSauGiam ?? tong,
    chiTiet: rawLines.map((item) => {
      const line = item as Record<string, unknown>;
      return {
        ma: String(line.ma || ''),
        ten: String(line.ten || ''),
        soLuong: Number(line.soLuong || 0),
        donGia: Number(line.donGia || 0),
        thanhTien: Number(line.thanhTien || 0),
      };
    }),
  };
}

function mapReceipt(raw: Record<string, unknown>): ImportReceipt {
  const rawLines = Array.isArray(raw.chiTiet) ? raw.chiTiet : [];
  return {
    ma: String(raw.ma || ''),
    maNCC: String(raw.maNCC || raw.ncc || ''),
    ncc: String(raw.ncc || ''),
    ngay: String(raw.ngay || ''),
    tong: Number(raw.tong || 0),
    chiTiet: rawLines.map((item) => {
      const line = item as Record<string, unknown>;
      const soLuong = Number(line.soLuong || 0);
      const giaNhap = Number(line.giaNhap || 0);
      return {
        ma: String(line.ma || ''),
        ten: String(line.ten || ''),
        soLuong,
        giaNhap,
        thanhTien: soLuong * giaNhap,
      };
    }),
  };
}

export const javaApi = {
  async getInfo(): Promise<JavaServerInfo> {
    return api<JavaServerInfo>('GET', 'info');
  },

  async login(email: string, matKhau: string): Promise<SafeUser> {
    const res = await api<Record<string, unknown>>('POST', 'login', { email, matKhau });
    if (typeof res.token === 'string') {
      setJavaToken(res.token);
    }
    return mapSafeUser(res);
  },

  async register(input: {
    hoTen: string;
    email: string;
    matKhau: string;
    sdt: string;
    diaChi: string;
  }): Promise<SafeUser> {
    const res = await api<Record<string, unknown>>('POST', 'register', {
      hoTen: input.hoTen,
      email: input.email,
      matKhau: input.matKhau,
      soDienThoai: input.sdt,
      diaChi: input.diaChi,
    });
    return mapSafeUser(res);
  },

  async googleLogin(email: string, hoTen?: string): Promise<SafeUser> {
    const res = await api<Record<string, unknown>>('POST', 'google-login', {
      email,
      hoTen: hoTen || '',
    });
    if (typeof res.token === 'string') {
      setJavaToken(res.token);
    }
    return mapSafeUser(res);
  },

  async logout(): Promise<void> {
    try {
      await api('POST', 'logout', {});
    } catch {
      // Ignore logout errors
    } finally {
      setJavaToken(null);
    }
  },

  async getMe(): Promise<SafeUser> {
    const res = await api<Record<string, unknown>>('GET', 'me');
    return mapSafeUser(res);
  },

  async getProducts(): Promise<Product[]> {
    const list = await api<Record<string, unknown>[]>('GET', 'sanpham');
    return Array.isArray(list) ? list.map(mapProduct) : [];
  },

  async createProduct(payload: {
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
  }): Promise<Product> {
    const res = await api<Record<string, unknown>>('POST', 'sanpham', payload);
    return mapProduct(res);
  },

  async updateProduct(
    ma: string,
    payload: {
      ten: string;
      hang: string;
      gia: number;
      ton: number;
      ram?: number;
      boNho?: number;
      mauSac?: string;
      loaiPhuKien?: string;
      anh?: string;
    },
  ): Promise<Product> {
    const res = await api<Record<string, unknown>>('PUT', `sanpham/${encodeURIComponent(ma)}`, payload);
    return mapProduct(res);
  },

  async deleteProduct(ma: string): Promise<void> {
    await api('DELETE', `sanpham/${encodeURIComponent(ma)}`);
  },

  async getCart(): Promise<RawCartLine[]> {
    const res = await api<{ items?: Record<string, unknown>[] }>('GET', 'gio');
    const items = Array.isArray(res.items) ? res.items : [];
    return items.map((item) => ({
      ma: String(item.ma || ''),
      soLuong: Number(item.soLuong || 0),
    }));
  },

  async addToCart(ma: string, soLuong: number): Promise<RawCartLine[]> {
    const res = await api<{ items?: Record<string, unknown>[] }>('POST', 'gio', { ma, soLuong });
    const items = Array.isArray(res.items) ? res.items : [];
    return items.map((item) => ({
      ma: String(item.ma || ''),
      soLuong: Number(item.soLuong || 0),
    }));
  },

  async removeFromCart(ma: string): Promise<RawCartLine[]> {
    const res = await api<{ items?: Record<string, unknown>[] }>(
      'DELETE',
      `gio/${encodeURIComponent(ma)}`,
    );
    const items = Array.isArray(res.items) ? res.items : [];
    return items.map((item) => ({
      ma: String(item.ma || ''),
      soLuong: Number(item.soLuong || 0),
    }));
  },

  async getOrders(): Promise<Order[]> {
    const list = await api<Record<string, unknown>[]>('GET', 'donhang');
    return Array.isArray(list) ? list.map(mapOrder) : [];
  },

  async placeOrder(phuongThucThanhToan: PaymentMethod = 'COD'): Promise<Order> {
    const res = await api<Record<string, unknown>>('POST', 'donhang', {
      phuongThucThanhToan,
    });
    return mapOrder(res);
  },

  async reportTransfer(ma: string, maGiaoDich: string): Promise<Order> {
    const res = await api<Record<string, unknown>>(
      'POST',
      `donhang/${encodeURIComponent(ma)}/baochuyenkhoan`,
      { maGiaoDich },
    );
    return mapOrder(res);
  },

  async confirmPayment(ma: string, maGiaoDich: string): Promise<Order> {
    const res = await api<Record<string, unknown>>(
      'POST',
      `donhang/${encodeURIComponent(ma)}/xacnhanthanhtoan`,
      { maGiaoDich },
    );
    return mapOrder(res);
  },

  async updateOrderStatus(ma: string, trangThai: OrderStatus): Promise<Order> {
    const res = await api<Record<string, unknown>>(
      'POST',
      `donhang/${encodeURIComponent(ma)}/trangthai`,
      { trangThai },
    );
    return mapOrder(res);
  },

  async getSuppliers(): Promise<Supplier[]> {
    const list = await api<Record<string, unknown>[]>('GET', 'nhacungcap');
    return Array.isArray(list)
      ? list.map((s) => ({
          ma: String(s.ma || ''),
          ten: String(s.ten || ''),
          diaChi: String(s.diaChi || ''),
          sdt: String(s.sdt || ''),
        }))
      : [];
  },

  async createSupplier(s: Supplier): Promise<void> {
    await api('POST', 'nhacungcap', s);
  },

  async updateSupplier(s: Supplier): Promise<void> {
    await api('PUT', `nhacungcap/${encodeURIComponent(s.ma)}`, s);
  },

  async deleteSupplier(ma: string): Promise<void> {
    await api('DELETE', `nhacungcap/${encodeURIComponent(ma)}`);
  },

  async getReceipts(): Promise<ImportReceipt[]> {
    const list = await api<Record<string, unknown>[]>('GET', 'phieunhap');
    return Array.isArray(list) ? list.map(mapReceipt) : [];
  },

  async createReceipt(
    maNCC: string,
    items: { ma: string; soLuong: number; giaNhap: number }[],
  ): Promise<ImportReceipt> {
    const res = await api<Record<string, unknown>>('POST', 'phieunhap', { maNCC, items });
    return mapReceipt(res);
  },

  async getUsers(): Promise<User[]> {
    const list = await api<Record<string, unknown>[]>('GET', 'nguoidung');
    return Array.isArray(list)
      ? list.map((u) => ({
          ...mapSafeUser(u),
          matKhauHash: '',
        }))
      : [];
  },
};
