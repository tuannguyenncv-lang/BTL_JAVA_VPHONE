import java.awt.*;
import java.util.ArrayList;
import javax.swing.*;
import javax.swing.table.DefaultTableModel;

/**
 * Demo VPHONE bằng giao diện Swing đơn giản (1 file, dùng chung code sẵn có).
 *
 * Chạy (trong thư mục src, JDK 11+):
 *     javac *.java
 *     java DemoUI
 *
 * Tài khoản demo: khach@vphone.vn / 123456 (khách) | admin@vphone.vn / admin123 (quản trị)
 * Demo này chỉ làm luồng KHÁCH HÀNG: xem + tìm sản phẩm, thêm vào giỏ, đặt hàng.
 */
public class DemoUI extends JFrame {
    private final CuaHang ch = new CuaHang();
    private KhachHang kh;                       // khách đang đăng nhập
    private ArrayList<SanPham> dsHienThi = new ArrayList<>();

    private final CardLayout cards = new CardLayout();
    private final JPanel root = new JPanel(cards);

    private final DefaultTableModel mdSp  = bangMoi("Mã", "Tên", "Hãng", "Giá", "Tồn");
    private final DefaultTableModel mdGio = bangMoi("Tên", "SL", "Thành tiền");
    private final JTable tbSp  = new JTable(mdSp);
    private final JTable tbGio = new JTable(mdGio);
    private final JTextField txtTim = new JTextField(15);
    private final JSpinner spSl = new JSpinner(new SpinnerNumberModel(1, 1, 99, 1));
    private final JLabel lbTong = new JLabel("Tổng: 0đ");
    private final JLabel lbChao = new JLabel();

    public DemoUI() {
        super("VPHONE - Demo bán điện thoại");
        ch.napDuLieuMau();
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setSize(820, 600);
        setLocationRelativeTo(null);
        root.add(manHinhDangNhap(), "login");
        root.add(manHinhBanHang(), "shop");
        add(root);
        cards.show(root, "login");
    }

    // ------------------------------------------------------------ đăng nhập
    private JPanel manHinhDangNhap() {
        JPanel p = new JPanel(new GridBagLayout());
        GridBagConstraints g = new GridBagConstraints();
        g.insets = new Insets(5, 5, 5, 5);
        g.gridx = 0; g.gridy = 0; g.gridwidth = 2;
        p.add(new JLabel("VPHONE - Đăng nhập (demo khách hàng)"), g);

        JTextField txtEmail = new JTextField("khach@vphone.vn", 20);
        JPasswordField txtMk = new JPasswordField("123456", 20);
        g.gridwidth = 1; g.gridy = 1; p.add(new JLabel("Email:"), g);
        g.gridx = 1; p.add(txtEmail, g);
        g.gridx = 0; g.gridy = 2; p.add(new JLabel("Mật khẩu:"), g);
        g.gridx = 1; p.add(txtMk, g);

        JButton btn = new JButton("Đăng nhập");
        btn.addActionListener(e -> {
            NguoiDung nd = ch.nguoiDung.dangNhap(txtEmail.getText().trim(),
                    new String(txtMk.getPassword()));
            if (nd == null) {
                baoLoi("Sai email hoặc mật khẩu.");
            } else if (nd instanceof KhachHang) {
                kh = (KhachHang) nd;
                lbChao.setText("Xin chào " + nd.getHoTen() + " (" + nd.getVaiTro() + ")");
                txtTim.setText("");
                napBangSanPham(ch.sanPham.layTatCa());
                napBangGio();
                cards.show(root, "shop");
            } else {
                baoLoi("Demo này là luồng khách hàng.\nHãy đăng nhập: khach@vphone.vn / 123456");
            }
        });
        g.gridx = 0; g.gridy = 3; g.gridwidth = 2; p.add(btn, g);
        g.gridy = 4;
        p.add(new JLabel("Khách: khach@vphone.vn / 123456    |    Admin: admin@vphone.vn / admin123"), g);
        return p;
    }

    // ------------------------------------------------------------ bán hàng
    private JPanel manHinhBanHang() {
        JPanel p = new JPanel(new BorderLayout(5, 5));

        // thanh trên: chào + đăng xuất
        JPanel tren = new JPanel(new BorderLayout());
        tren.add(lbChao, BorderLayout.WEST);
        JButton btnThoat = new JButton("Đăng xuất");
        btnThoat.addActionListener(e -> { kh = null; cards.show(root, "login"); });
        tren.add(btnThoat, BorderLayout.EAST);
        p.add(tren, BorderLayout.NORTH);

        // giữa: bảng sản phẩm (trên) + bảng giỏ (dưới)
        JPanel giua = new JPanel(new GridLayout(2, 1, 5, 5));
        JPanel pSp = new JPanel(new BorderLayout());
        JPanel tim = new JPanel(new FlowLayout(FlowLayout.LEFT));
        tim.add(new JLabel("Tìm:"));
        tim.add(txtTim);
        JButton btnTim = new JButton("Tìm");
        btnTim.addActionListener(e -> {
            String tk = txtTim.getText().trim();
            napBangSanPham(tk.isEmpty() ? ch.sanPham.layTatCa() : ch.sanPham.timKiem(tk));
        });
        tim.add(btnTim);
        pSp.add(tim, BorderLayout.NORTH);
        pSp.add(new JScrollPane(tbSp), BorderLayout.CENTER);
        giua.add(pSp);

        JPanel pGio = new JPanel(new BorderLayout());
        pGio.add(new JLabel("Giỏ hàng"), BorderLayout.NORTH);
        pGio.add(new JScrollPane(tbGio), BorderLayout.CENTER);
        pGio.add(lbTong, BorderLayout.SOUTH);
        giua.add(pGio);
        p.add(giua, BorderLayout.CENTER);

        // dưới: các nút thao tác
        JPanel duoi = new JPanel(new FlowLayout());
        duoi.add(new JLabel("Số lượng:"));
        duoi.add(spSl);
        JButton btnThem = new JButton("Thêm vào giỏ");
        btnThem.addActionListener(e -> themVaoGio());
        JButton btnXoa = new JButton("Xóa khỏi giỏ");
        btnXoa.addActionListener(e -> xoaKhoiGio());
        JButton btnDat = new JButton("Đặt hàng");
        btnDat.addActionListener(e -> datHang());
        duoi.add(btnThem); duoi.add(btnXoa); duoi.add(btnDat);
        p.add(duoi, BorderLayout.SOUTH);
        return p;
    }

    // ------------------------------------------------------------ thao tác
    private void themVaoGio() {
        int row = tbSp.getSelectedRow();
        if (row < 0) { baoLoi("Chọn 1 sản phẩm trong bảng trên."); return; }
        SanPham sp = dsHienThi.get(row);
        int sl = (Integer) spSl.getValue();
        try {
            kh.getGioHang().themSanPham(sp, sl);   // hết hàng -> OutOfStockException
            napBangGio();
        } catch (InvalidQuantityException | OutOfStockException e) {
            baoLoi(e.getMessage());
        }
    }

    private void xoaKhoiGio() {
        int row = tbGio.getSelectedRow();
        if (row < 0) { baoLoi("Chọn 1 món trong giỏ hàng."); return; }
        String ma = kh.getGioHang().getDanhSachChiTiet().get(row).getSanPham().getMaSP();
        kh.getGioHang().xoaSanPham(ma);
        napBangGio();
    }

    private void datHang() {
        if (kh.getGioHang().isEmpty()) { baoLoi("Giỏ đang trống."); return; }
        try {
            DonHang dh = kh.datHang(ch.donHang);   // trừ tồn kho, tạo đơn
            napBangGio();
            napBangSanPham(ch.sanPham.layTatCa());
            JOptionPane.showMessageDialog(this,
                    "Đặt hàng thành công!\nMã đơn: " + dh.getMaDonHang()
                    + "\nTổng tiền: " + Fmt.tien(dh.tinhTongTien()),
                    "Thành công", JOptionPane.INFORMATION_MESSAGE);
        } catch (OutOfStockException e) {
            baoLoi("[Hết hàng] " + e.getMessage());
        }
    }

    // ------------------------------------------------------------ phụ
    private void napBangSanPham(ArrayList<SanPham> ds) {
        dsHienThi = ds;
        mdSp.setRowCount(0);
        for (SanPham sp : ds) {
            mdSp.addRow(new Object[]{sp.getMaSP(), sp.getTenSP(), sp.getHang(),
                    Fmt.tien(sp.getGiaBan()), sp.getSoLuongTon()});
        }
    }

    private void napBangGio() {
        mdGio.setRowCount(0);
        for (ChiTietGioHang ct : kh.getGioHang().getDanhSachChiTiet()) {
            mdGio.addRow(new Object[]{ct.getSanPham().getTenSP(), ct.getSoLuong(),
                    Fmt.tien(ct.getThanhTien())});
        }
        lbTong.setText("Tổng: " + Fmt.tien(kh.getGioHang().tinhTongTien()));
    }

    private static DefaultTableModel bangMoi(String... cot) {
        return new DefaultTableModel(cot, 0) {
            @Override public boolean isCellEditable(int r, int c) { return false; }
        };
    }

    private void baoLoi(String msg) {
        JOptionPane.showMessageDialog(this, msg, "Lỗi", JOptionPane.ERROR_MESSAGE);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> new DemoUI().setVisible(true));
    }
}
