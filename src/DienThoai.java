public class DienThoai extends SanPham {
    private int ram;       // GB
    private int boNho;     // GB
    private String mauSac;

    public DienThoai(String maSP, String tenSP, String hang, double giaBan, int soLuongTon,
                     int ram, int boNho, String mauSac)
            throws InvalidPriceException, InvalidQuantityException {
        super(maSP, tenSP, hang, giaBan, soLuongTon);
        if (ram <= 0 || boNho <= 0) {
            throw new IllegalArgumentException("RAM va bo nho phai lon hon 0");
        }
        this.ram = ram;
        this.boNho = boNho;
        this.mauSac = mauSac == null ? "" : mauSac.trim();
    }

    public int getRam() { return ram; }
    public int getBoNho() { return boNho; }
    public String getMauSac() { return mauSac; }

    public void setRam(int ram) {
        if (ram <= 0) throw new IllegalArgumentException("RAM phai lon hon 0");
        this.ram = ram;
    }

    public void setBoNho(int boNho) {
        if (boNho <= 0) throw new IllegalArgumentException("Bo nho phai lon hon 0");
        this.boNho = boNho;
    }

    public void setMauSac(String mauSac) { this.mauSac = mauSac == null ? "" : mauSac.trim(); }

    @Override
    public void hienThiThongTin() {
        System.out.println(dongCoBan() + "  Dien thoai: " + ram + "GB RAM, "
                + boNho + "GB, mau " + mauSac);
    }
}
