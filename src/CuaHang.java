/** Gom các lớp quản lý lại một chỗ; nạp dữ liệu từ Oracle hoặc dữ liệu mẫu trong bộ nhớ. */
public class CuaHang {
    public final SanPhamManager sanPham;
    public final NguoiDungManager nguoiDung;
    public final DonHangManager donHang;
    public final NhaCungCapManager nhaCungCap;
    public final PhieuNhapManager phieuNhap;

    private final boolean dungCSDL;
    private final SanPhamDAO sanPhamDAO;
    private final NguoiDungDAO nguoiDungDAO;
    private final NhaCungCapDAO nhaCungCapDAO;
    private final DonHangDAO donHangDAO;
    private final PhieuNhapDAO phieuNhapDAO;

    /** dungCSDL = true: ghi mọi thay đổi xuống Oracle; false: chỉ lưu trong bộ nhớ (ArrayList). */
    public CuaHang(boolean dungCSDL) {
        this.dungCSDL = dungCSDL;
        sanPhamDAO = dungCSDL ? new SanPhamDAO() : null;
        nguoiDungDAO = dungCSDL ? new NguoiDungDAO() : null;
        nhaCungCapDAO = dungCSDL ? new NhaCungCapDAO() : null;
        donHangDAO = dungCSDL ? new DonHangDAO() : null;
        phieuNhapDAO = dungCSDL ? new PhieuNhapDAO() : null;
        sanPham = new SanPhamManager(sanPhamDAO);
        nguoiDung = new NguoiDungManager(nguoiDungDAO);
        nhaCungCap = new NhaCungCapManager(nhaCungCapDAO);
        donHang = new DonHangManager(donHangDAO);
        phieuNhap = new PhieuNhapManager(phieuNhapDAO);
    }

    public boolean isDungCSDL() { return dungCSDL; }

    /**
     * Thử kết nối Oracle: tạo các bảng nếu chưa có, đọc dữ liệu lên ArrayList, nạp dữ liệu mẫu nếu CSDL trống.
     * Không kết nối được thì báo và chuyển sang chế độ bộ nhớ.
     */
    public static CuaHang khoiTao() {
        try {
            DatabaseInit.taoBang();
            CuaHang ch = new CuaHang(true);
            ch.napTuCSDL();
            if (ch.sanPham.layTatCa().isEmpty() && ch.nguoiDung.layTatCa().isEmpty()) {
                ch.napDuLieuMau();
                System.out.println("(CSDL con trong: da nap du lieu mau)");
            }
            System.out.println("Che do: Oracle - " + DBConnection.moTa());
            return ch;
        } catch (DataAccessException e) {
            System.out.println("[Canh bao] " + e.getMessage());
            System.out.println("-> Chuyen sang che do BO NHO (du lieu se mat khi tat chuong trinh).");
            System.out.println("   Hay bat Oracle (OracleServiceFREE, TNSListener), chay sql/01_tao_user_oracle.sql roi chay lai de luu vao CSDL.");
            CuaHang ch = new CuaHang(false);
            ch.napDuLieuMau();
            return ch;
        }
    }

    /** Đọc toàn bộ dữ liệu từ Oracle vào các ArrayList (theo thứ tự phụ thuộc khóa ngoại). */
    private void napTuCSDL() {
        sanPham.napDanhSach(sanPhamDAO.layTatCa());
        nguoiDung.napDanhSach(nguoiDungDAO.layTatCa());
        nhaCungCap.napDanhSach(nhaCungCapDAO.layTatCa());
        donHang.napDanhSach(donHangDAO.layTatCa(sanPham));
        phieuNhap.napDanhSach(phieuNhapDAO.layTatCa(sanPham, nhaCungCap));
    }

    public void napDuLieuMau() {
        try {
            DienThoai sp01 = new DienThoai("SP01", "iPhone 15", "Apple", 22990000, 10, 6, 128, "Den");
            sp01.setAnh("/src/assets/images/prod_iphone_pro.jpg");
            sanPham.them(sp01);
            DienThoai sp02 = new DienThoai("SP02", "Galaxy S24", "Samsung", 19990000, 5, 8, 256, "Xam");
            sp02.setAnh("/src/assets/images/prod_galaxy_ultra.jpg");
            sanPham.them(sp02);
            DienThoai sp03 = new DienThoai("SP03", "Redmi Note 13", "Xiaomi", 5990000, 20, 8, 128, "Xanh");
            sp03.setAnh("/src/assets/images/prod_ceramic_phone.jpg");
            sanPham.them(sp03);
            DienThoai sp04 = new DienThoai("SP04", "Galaxy A55", "Samsung", 9990000, 8, 8, 256, "Tim");
            sp04.setAnh("/src/assets/images/prod_galaxy_ultra.jpg");
            sanPham.them(sp04);
            PhuKien pk01 = new PhuKien("PK01", "Cap sac Type-C 1m", "Anker", 250000, 50, "Cap sac");
            pk01.setAnh("/src/assets/images/prod_tech_accessories.jpg");
            sanPham.them(pk01);
            PhuKien pk02 = new PhuKien("PK02", "Op lung iPhone 15", "Spigen", 450000, 3, "Op lung");
            pk02.setAnh("/src/assets/images/prod_tech_accessories.jpg");
            sanPham.them(pk02);
            DienThoai sp05 = new DienThoai("SP05", "iPhone 16 Pro Max", "Apple", 34990000, 12, 8, 256, "Titan Sa Mac");
            sp05.setAnh("/src/assets/images/prod_iphone_pro.jpg");
            sanPham.them(sp05);
            DienThoai sp06 = new DienThoai("SP06", "Galaxy Z Fold6", "Samsung", 41990000, 6, 12, 512, "Xam Titan");
            sp06.setAnh("/src/assets/images/prod_galaxy_ultra.jpg");
            sanPham.them(sp06);
            DienThoai sp07 = new DienThoai("SP07", "Xiaomi 14 Ultra", "Xiaomi", 29990000, 9, 16, 512, "Den");
            sp07.setAnh("/src/assets/images/prod_ceramic_phone.jpg");
            sanPham.them(sp07);
            DienThoai sp08 = new DienThoai("SP08", "OPPO Find X8 Pro", "OPPO", 27990000, 7, 16, 512, "Trang Ngoc");
            sp08.setAnh("/src/assets/images/prod_ceramic_phone.jpg");
            sanPham.them(sp08);
            PhuKien pk03 = new PhuKien("PK03", "AirPods Pro 2 USB-C", "Apple", 5990000, 15, "Tai nghe");
            pk03.setAnh("/src/assets/images/prod_tech_accessories.jpg");
            sanPham.them(pk03);
            PhuKien pk04 = new PhuKien("PK04", "Sac du phong Anker 20000mAh", "Anker", 1290000, 25, "Sac du phong");
            pk04.setAnh("/src/assets/images/prod_tech_accessories.jpg");
            sanPham.them(pk04);

            nhaCungCap.them(new NhaCungCap("NCC01", "Cong ty FPT Trading", "Ha Noi", "0241234567"));
            nhaCungCap.them(new NhaCungCap("NCC02", "Cong ty Viettel Store", "Ha Noi", "0247654321"));

            nguoiDung.them(new QuanTriVien("QT001", "Quan tri VPHONE", "admin@vphone.vn",
                    "admin123", "0900000001", "Chu cua hang"));
            nguoiDung.them(new KhachHang("KH001", "Nguyen Van A", "khach@vphone.vn",
                    "123456", "0900000002", "Ba Dinh, Ha Noi"));
        } catch (InvalidPriceException | InvalidQuantityException e) {
            throw new IllegalStateException("Du lieu mau khong hop le: " + e.getMessage());
        }
    }
}
