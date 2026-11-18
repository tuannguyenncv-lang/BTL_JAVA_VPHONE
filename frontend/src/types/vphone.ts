export type UserRole = 'KHACH_HANG' | 'NHAN_VIEN_BAN_HANG' | 'THU_KHO' | 'QUAN_TRI';

export type UserStatus = 'HOAT_DONG' | 'BI_KHOA';

export interface User {
  ma: string;
  hoTen: string;
  email: string;
  matKhauHash: string;
  sdt: string;
  vaiTro: UserRole;
  trangThai: UserStatus;
  diaChi?: string;
  chucVu?: string;
  authProvider?: 'LOCAL' | 'GOOGLE';
  firebaseUid?: string;
  avatarUrl?: string;
}

export type SafeUser = Omit<User, 'matKhauHash'>;

export type ProductType = 'DIEN_THOAI' | 'PHU_KIEN';

export interface Product {
  ma: string;
  ten: string;
  hang: string;
  loai: ProductType;
  gia: number;
  giaBan: number;
  ton: number;
  ram?: number;
  boNho?: number;
  mauSac?: string;
  loaiPhuKien?: string;
  anh?: string;
  flashSaleGia?: number;
  flashSaleDen?: string;
  manHinh?: string;
  chip?: string;
  camera?: string;
  pin?: string;
  moTa?: string;
}

export interface ProductFilter {
  q: string;
  hang: string;
  ram: string;
  boNho: string;
  min: string;
  max: string;
  sort: '' | 'gia_tang' | 'gia_giam' | 'danh_gia';
  loai: 'ALL' | 'DIEN_THOAI' | 'PHU_KIEN' | 'FLASH_SALE';
  stockState: 'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}

export interface ProductReview {
  id: string;
  maSanPham: string;
  maKhach: string;
  tenKhach: string;
  sao: number;
  binhLuan: string;
  ngay: string;
}

export type PromoType = 'PHAN_TRAM' | 'SO_TIEN';

export interface PromoCode {
  ma: string;
  moTa: string;
  loai: PromoType;
  giaTri: number;
  donToiThieu: number;
  apDungCho: 'ALL' | ProductType;
  hanDung: string;
  kichHoat: boolean;
}

export interface RawCartLine {
  ma: string;
  soLuong: number;
}

export interface CartItem {
  ma: string;
  ten: string;
  hang: string;
  loai: ProductType;
  mauSac?: string;
  anh?: string;
  ton: number;
  donGia: number;
  soLuong: number;
  thanhTien: number;
  isFlashSale: boolean;
}

export interface CartSummary {
  items: CartItem[];
  tong: number;
  tongGiam: number;
  soLuong: number;
}

export type OrderStatus = 'CHO_XAC_NHAN' | 'DANG_GIAO' | 'HOAN_THANH' | 'DA_HUY';

export type PaymentMethod = 'COD' | 'CHUYEN_KHOAN' | 'VI_DIEN_TU';

export type PaymentStatus = 'CHUA_THANH_TOAN' | 'CHO_XAC_NHAN' | 'DA_THANH_TOAN';

export interface OrderLine {
  ma: string;
  ten: string;
  donGia: number;
  soLuong: number;
  thanhTien: number;
}

export interface Order {
  ma: string;
  maKhach: string;
  khach: string;
  ngay: string;
  trangThai: OrderStatus;
  phuongThucThanhToan: PaymentMethod;
  trangThaiThanhToan?: PaymentStatus;
  maGiaoDich?: string;
  ngayBaoChuyenKhoan?: string;
  ngayXacNhanThanhToan?: string;
  nguoiXacNhanThanhToan?: string;
  lyDoHuy?: string;
  nguoiHuy?: string;
  ngayHuy?: string;
  maGiamGia?: string;
  tienGiam: number;
  tamTinh: number;
  tong: number;
  chiTiet: OrderLine[];
}

export interface Supplier {
  ma: string;
  ten: string;
  diaChi: string;
  sdt: string;
}

export interface ImportReceiptLine {
  ma: string;
  ten: string;
  soLuong: number;
  giaNhap: number;
}

export interface ImportReceipt {
  ma: string;
  maNCC: string;
  ncc: string;
  ngay: string;
  tong: number;
  chiTiet: ImportReceiptLine[];
}

export interface StoreStats {
  tongGiaTriTon: number;
  doanhThu: number;
  soSanPham: number;
  soKhachHang: number;
  giaCaoNhat: Product | null;
  donTheoTrangThai: Record<OrderStatus, number>;
  sapHet: Product[];
}

export interface ToastMessage {
  id: string;
  title: string;
  kind: 'ok' | 'err';
  detail?: string;
}

export type ViewId =
  | 'sanpham'
  | 'gio'
  | 'donhang'
  | 'khuyenmai'
  | 'nhaphang'
  | 'thongke'
  | 'nguoidung';
