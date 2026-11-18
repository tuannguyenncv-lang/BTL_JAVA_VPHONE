-- ============================================================================
-- VPHONE - Oracle Database Schema, Views, Triggers & Stored Procedures
-- Phù hợp môn Cơ sở dữ liệu Oracle & Bài tập lớn Công nghệ Java
-- ============================================================================

-- 1. BẢNG DỮ LIỆU CHÍNH (Mật khẩu lưu dạng SHA-256 + Salt, không lưu plaintext)
CREATE TABLE NGUOI_DUNG (
    MA_ND         VARCHAR2(20)  PRIMARY KEY,
    HO_TEN        NVARCHAR2(100) NOT NULL,
    EMAIL         VARCHAR2(120) NOT NULL UNIQUE,
    MAT_KHAU_HASH VARCHAR2(200) NOT NULL, -- Định dạng: sha256$<salt>$<hex>
    SDT           VARCHAR2(20),
    VAI_TRO       VARCHAR2(30)  NOT NULL CHECK (VAI_TRO IN ('KHACH_HANG', 'NHAN_VIEN_BAN_HANG', 'THU_KHO', 'QUAN_TRI')),
    DIA_CHI       NVARCHAR2(255),
    CHUC_VU       NVARCHAR2(100),
    NGAY_TAO      DATE DEFAULT SYSDATE
);

CREATE TABLE SAN_PHAM (
    MA_SP          VARCHAR2(20)  PRIMARY KEY,
    TEN_SP         NVARCHAR2(150) NOT NULL,
    HANG           NVARCHAR2(60)  NOT NULL,
    LOAI           VARCHAR2(20)  NOT NULL CHECK (LOAI IN ('DIEN_THOAI', 'PHU_KIEN')),
    GIA_NIEM_YET   NUMBER(15, 2) NOT NULL CHECK (GIA_NIEM_YET > 0),
    GIA_BAN        NUMBER(15, 2) NOT NULL CHECK (GIA_BAN > 0),
    FLASH_SALE_GIA NUMBER(15, 2),
    FLASH_SALE_DEN DATE,
    SO_LUONG_TON   NUMBER(10)    DEFAULT 0 CHECK (SO_LUONG_TON >= 0),
    RAM_GB         NUMBER(5),
    BO_NHO_GB      NUMBER(6),
    MAU_SAC        NVARCHAR2(60),
    LOAI_PHU_KIEN  NVARCHAR2(80),
    ANH_URL        VARCHAR2(500)
);

CREATE TABLE MA_GIAM_GIA (
    MA_CODE      VARCHAR2(30)  PRIMARY KEY,
    MO_TA        NVARCHAR2(200) NOT NULL,
    LOAI_GIAM    VARCHAR2(20)  NOT NULL CHECK (LOAI_GIAM IN ('PHAN_TRAM', 'SO_TIEN')),
    GIA_TRI      NUMBER(15, 2) NOT NULL CHECK (GIA_TRI > 0),
    DON_TOI_THIEU NUMBER(15, 2) DEFAULT 0,
    AP_DUNG_CHO  VARCHAR2(20)  DEFAULT 'ALL' CHECK (AP_DUNG_CHO IN ('ALL', 'DIEN_THOAI', 'PHU_KIEN')),
    HAN_DUNG     DATE          NOT NULL,
    KICH_HOAT    NUMBER(1)     DEFAULT 1 CHECK (KICH_HOAT IN (0, 1))
);

CREATE TABLE DON_HANG (
    MA_DH            VARCHAR2(20)  PRIMARY KEY,
    MA_KHACH         VARCHAR2(20)  NOT NULL REFERENCES NGUOI_DUNG(MA_ND),
    NGAY_DAT         DATE          DEFAULT SYSDATE NOT NULL,
    TRANG_THAI       VARCHAR2(20)  DEFAULT 'CHO_XAC_NHAN'
                     CHECK (TRANG_THAI IN ('CHO_XAC_NHAN', 'DANG_GIAO', 'HOAN_THANH', 'DA_HUY')),
    PHUONG_THUC_TT   VARCHAR2(30)  DEFAULT 'COD'
                     CHECK (PHUONG_THUC_TT IN ('COD', 'CHUYEN_KHOAN', 'VI_DIEN_TU')),
    MA_GIAM_GIA      VARCHAR2(30)  REFERENCES MA_GIAM_GIA(MA_CODE),
    TIEN_GIAM        NUMBER(15, 2) DEFAULT 0,
    TONG_TIEN        NUMBER(15, 2) DEFAULT 0 CHECK (TONG_TIEN >= 0)
);

CREATE TABLE CHI_TIET_DON_HANG (
    MA_DH       VARCHAR2(20)  NOT NULL REFERENCES DON_HANG(MA_DH) ON DELETE CASCADE,
    MA_SP       VARCHAR2(20)  NOT NULL REFERENCES SAN_PHAM(MA_SP),
    SO_LUONG    NUMBER(10)    NOT NULL CHECK (SO_LUONG > 0),
    DON_GIA     NUMBER(15, 2) NOT NULL CHECK (DON_GIA >= 0),
    THANH_TIEN  NUMBER(15, 2) NOT NULL CHECK (THANH_TIEN >= 0),
    PRIMARY KEY (MA_DH, MA_SP)
);

CREATE TABLE DANH_GIA (
    MA_DG       VARCHAR2(20)  PRIMARY KEY,
    MA_SP       VARCHAR2(20)  NOT NULL REFERENCES SAN_PHAM(MA_SP) ON DELETE CASCADE,
    MA_KHACH    VARCHAR2(20)  NOT NULL REFERENCES NGUOI_DUNG(MA_ND),
    SO_SAO      NUMBER(1)     NOT NULL CHECK (SO_SAO BETWEEN 1 AND 5),
    BINH_LUAN   NVARCHAR2(500) NOT NULL,
    NGAY_TAO    DATE          DEFAULT SYSDATE
);

CREATE TABLE NHA_CUNG_CAP (
    MA_NCC  VARCHAR2(20)  PRIMARY KEY,
    TEN_NCC NVARCHAR2(150) NOT NULL,
    DIA_CHI NVARCHAR2(255),
    SDT     VARCHAR2(20)
);

CREATE TABLE PHIEU_NHAP (
    MA_PN    VARCHAR2(20)  PRIMARY KEY,
    MA_NCC   VARCHAR2(20)  NOT NULL REFERENCES NHA_CUNG_CAP(MA_NCC),
    MA_THU_KHO VARCHAR2(20) REFERENCES NGUOI_DUNG(MA_ND),
    NGAY_NHAP DATE         DEFAULT SYSDATE NOT NULL,
    TONG_TIEN NUMBER(15, 2) DEFAULT 0
);

CREATE TABLE CHI_TIET_PHIEU_NHAP (
    MA_PN     VARCHAR2(20)  NOT NULL REFERENCES PHIEU_NHAP(MA_PN) ON DELETE CASCADE,
    MA_SP     VARCHAR2(20)  NOT NULL REFERENCES SAN_PHAM(MA_SP),
    SO_LUONG  NUMBER(10)    NOT NULL CHECK (SO_LUONG > 0),
    GIA_NHAP  NUMBER(15, 2) NOT NULL CHECK (GIA_NHAP > 0),
    PRIMARY KEY (MA_PN, MA_SP)
);

-- ============================================================================
-- 2. VIEWS THỐNG KÊ & BÁO CÁO ORACLE
-- ============================================================================

-- View doanh thu theo tháng (chỉ tính đơn hoàn thành)
CREATE OR REPLACE VIEW V_DOANH_THU_THANG AS
SELECT
    TO_CHAR(NGAY_DAT, 'YYYY-MM') AS THANG,
    COUNT(MA_DH)                 AS SO_DON_HOAN_THANH,
    SUM(TONG_TIEN)               AS TONG_DOANH_THU,
    SUM(TIEN_GIAM)               AS TONG_KHUYEN_MAI
FROM DON_HANG
WHERE TRANG_THAI = 'HOAN_THANH'
GROUP BY TO_CHAR(NGAY_DAT, 'YYYY-MM')
ORDER BY THANG DESC;

-- View Top sản phẩm bán chạy
CREATE OR REPLACE VIEW V_TOP_BAN_CHAY AS
SELECT
    sp.MA_SP,
    sp.TEN_SP,
    sp.HANG,
    sp.LOAI,
    SUM(ct.SO_LUONG)   AS TONG_SO_LUONG_BAN,
    SUM(ct.THANH_TIEN) AS TONG_DOANH_THU
FROM CHI_TIET_DON_HANG ct
JOIN DON_HANG dh ON dh.MA_DH = ct.MA_DH
JOIN SAN_PHAM sp ON sp.MA_SP = ct.MA_SP
WHERE dh.TRANG_THAI <> 'DA_HUY'
GROUP BY sp.MA_SP, sp.TEN_SP, sp.HANG, sp.LOAI
ORDER BY TONG_SO_LUONG_BAN DESC;

-- View cảnh báo sắp hết hàng (tồn <= 5)
CREATE OR REPLACE VIEW V_CANH_BAO_TON_KHO AS
SELECT MA_SP, TEN_SP, HANG, LOAI, SO_LUONG_TON, GIA_BAN
FROM SAN_PHAM
WHERE SO_LUONG_TON <= 5
ORDER BY SO_LUONG_TON ASC;

-- ============================================================================
-- 3. TRIGGERS NGHIỆP VỤ TỰ ĐỘNG
-- ============================================================================

-- Trigger 1: Tự động giảm 5% giá bán đối với phụ kiện khi thêm/sửa sản phẩm
CREATE OR REPLACE TRIGGER TRG_TINH_GIA_BAN_PHU_KIEN
BEFORE INSERT OR UPDATE OF GIA_NIEM_YET, LOAI ON SAN_PHAM
FOR EACH ROW
BEGIN
    IF :NEW.LOAI = 'PHU_KIEN' THEN
        :NEW.GIA_BAN := ROUND(:NEW.GIA_NIEM_YET * 0.95, 0);
    ELSE
        :NEW.GIA_BAN := :NEW.GIA_NIEM_YET;
    END IF;
END;
/

-- Trigger 2: Kiểm tra & trừ tồn kho khi thêm chi tiết đơn hàng
CREATE OR REPLACE TRIGGER TRG_GIAM_TON_KHO_DAT_HANG
BEFORE INSERT ON CHI_TIET_DON_HANG
FOR EACH ROW
DECLARE
    v_ton NUMBER;
BEGIN
    SELECT SO_LUONG_TON INTO v_ton
    FROM SAN_PHAM
    WHERE MA_SP = :NEW.MA_SP
    FOR UPDATE;

    IF v_ton < :NEW.SO_LUONG THEN
        RAISE_APPLICATION_ERROR(-20001, 'Số lượng tồn kho không đủ cho sản phẩm ' || :NEW.MA_SP);
    END IF;

    UPDATE SAN_PHAM
    SET SO_LUONG_TON = SO_LUONG_TON - :NEW.SO_LUONG
    WHERE MA_SP = :NEW.MA_SP;
END;
/

-- Trigger 3: Hoàn lại tồn kho tự động khi đơn hàng chuyển sang DA_HUY
CREATE OR REPLACE TRIGGER TRG_HOAN_TON_KHO_HUY_DON
AFTER UPDATE OF TRANG_THAI ON DON_HANG
FOR EACH ROW
WHEN (OLD.TRANG_THAI <> 'DA_HUY' AND NEW.TRANG_THAI = 'DA_HUY')
BEGIN
    FOR rec IN (SELECT MA_SP, SO_LUONG FROM CHI_TIET_DON_HANG WHERE MA_DH = :NEW.MA_DH) LOOP
        UPDATE SAN_PHAM
        SET SO_LUONG_TON = SO_LUONG_TON + rec.SO_LUONG
        WHERE MA_SP = rec.MA_SP;
    END LOOP;
END;
/

-- Trigger 4: Tăng tồn kho tự động khi lập chi tiết phiếu nhập
CREATE OR REPLACE TRIGGER TRG_TANG_TON_KHO_NHAP_HANG
AFTER INSERT ON CHI_TIET_PHIEU_NHAP
FOR EACH ROW
BEGIN
    UPDATE SAN_PHAM
    SET SO_LUONG_TON = SO_LUONG_TON + :NEW.SO_LUONG
    WHERE MA_SP = :NEW.MA_SP;
END;
/

-- ============================================================================
-- 4. STORED PROCEDURES GIAO DỊCH AN TOÀN
-- ============================================================================

-- Procedure 1: Áp dụng mã giảm giá và trả về số tiền được giảm
CREATE OR REPLACE PROCEDURE SP_AP_DUNG_MA_GIAM_GIA (
    p_ma_code    IN  VARCHAR2,
    p_tam_tinh   IN  NUMBER,
    p_tien_giam  OUT NUMBER
) AS
    v_loai      MA_GIAM_GIA.LOAI_GIAM%TYPE;
    v_gia_tri   MA_GIAM_GIA.GIA_TRI%TYPE;
    v_toi_thieu MA_GIAM_GIA.DON_TOI_THIEU%TYPE;
    v_han       MA_GIAM_GIA.HAN_DUNG%TYPE;
    v_kich_hoat MA_GIAM_GIA.KICH_HOAT%TYPE;
BEGIN
    SELECT LOAI_GIAM, GIA_TRI, DON_TOI_THIEU, HAN_DUNG, KICH_HOAT
    INTO v_loai, v_gia_tri, v_toi_thieu, v_han, v_kich_hoat
    FROM MA_GIAM_GIA
    WHERE UPPER(MA_CODE) = UPPER(p_ma_code);

    IF v_kich_hoat = 0 OR v_han < TRUNC(SYSDATE) THEN
        RAISE_APPLICATION_ERROR(-20002, 'Mã giảm giá đã hết hạn hoặc ngừng kích hoạt.');
    END IF;

    IF p_tam_tinh < v_toi_thieu THEN
        RAISE_APPLICATION_ERROR(-20003, 'Đơn hàng chưa đạt giá trị tối thiểu để áp dụng mã.');
    END IF;

    IF v_loai = 'PHAN_TRAM' THEN
        p_tien_giam := ROUND(p_tam_tinh * (v_gia_tri / 100), 0);
    ELSE
        p_tien_giam := LEAST(p_tam_tinh, v_gia_tri);
    END IF;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(-20004, 'Mã giảm giá không tồn tại.');
END;
/

-- Procedure 2: Cập nhật trạng thái đơn hàng theo luồng hợp lệ
CREATE OR REPLACE PROCEDURE SP_CAP_NHAT_TRANG_THAI_DON (
    p_ma_dh      IN VARCHAR2,
    p_trang_thai IN VARCHAR2
) AS
    v_hien_tai DON_HANG.TRANG_THAI%TYPE;
BEGIN
    SELECT TRANG_THAI INTO v_hien_tai FROM DON_HANG WHERE MA_DH = p_ma_dh FOR UPDATE;

    IF v_hien_tai = 'CHO_XAC_NHAN' AND p_trang_thai IN ('DANG_GIAO', 'DA_HUY') THEN
        UPDATE DON_HANG SET TRANG_THAI = p_trang_thai WHERE MA_DH = p_ma_dh;
    ELSIF v_hien_tai = 'DANG_GIAO' AND p_trang_thai = 'HOAN_THANH' THEN
        UPDATE DON_HANG SET TRANG_THAI = p_trang_thai WHERE MA_DH = p_ma_dh;
    ELSE
        RAISE_APPLICATION_ERROR(-20005, 'Chuyển trạng thái đơn hàng không hợp lệ.');
    END IF;
    COMMIT;
END;
/
