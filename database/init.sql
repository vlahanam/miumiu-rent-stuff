-- =============================================================================
-- MiuMiu Rent Stuff - Database Initialization
-- =============================================================================

CREATE DATABASE IF NOT EXISTS miumiu_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE miumiu_db;

-- -----------------------------------------------------------------------------
-- Table: san_pham (sản phẩm)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS san_pham (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_san_pham       VARCHAR(30)     NOT NULL,
    ten_san_pham      VARCHAR(255)    NOT NULL,
    slug              VARCHAR(255)    NOT NULL,
    hinh_anh          TEXT            NULL,
    gia_goc_san_pham  DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    gia_thue_ngay     DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    -- 1: Trống lịch, 2: Đã cho thuê, 3: Đang bảo dưỡng
    trang_thai        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    ngay_tao          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uk_ma_san_pham (ma_san_pham),
    UNIQUE INDEX uk_slug (slug),
    INDEX idx_trang_thai_gia (trang_thai, gia_thue_ngay),
    FULLTEXT INDEX ft_ten_san_pham (ten_san_pham),
    CONSTRAINT chk_san_pham_trang_thai CHECK (trang_thai IN (1, 2, 3))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: nguoi_dung (nhân viên / người dùng hệ thống)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nguoi_dung (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ten            VARCHAR(100)    NOT NULL,
    email          VARCHAR(100)    NOT NULL,
    mat_khau       VARCHAR(255)    NOT NULL,
    ngay_tao       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uk_nguoi_dung_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: khach_hang (khách hàng)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS khach_hang (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ten            VARCHAR(100)    NOT NULL,
    so_dien_thoai  VARCHAR(20)     NOT NULL,
    dia_chi        VARCHAR(255)    NULL,
    ngay_tao       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uk_khach_hang_sdt (so_dien_thoai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: thue_do (phiếu thuê)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS thue_do (
    id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    ma_phieu_thue     VARCHAR(30)     NOT NULL,
    khach_hang_id     BIGINT UNSIGNED NOT NULL,
    nguoi_dung_id     BIGINT UNSIGNED NOT NULL COMMENT 'Nhân viên lập phiếu',
    ngay_bat_dau      DATETIME        NULL COMMENT 'Thời gian bắt đầu thuê (dự kiến)',
    ngay_hen_tra      DATETIME        NULL COMMENT 'Thời gian trả (dự kiến)',
    so_ngay_thue      SMALLINT UNSIGNED NULL COMMENT 'Số ngày thuê',
    ngay_tra_thuc_te  DATETIME        NULL COMMENT 'Thời gian trả thực tế',
    tong_tien_thue    DECIMAL(12, 2)  NOT NULL DEFAULT 0.00,
    -- 1: Tiền mặt, 2: Chuyển khoản, 3: Căn cước công dân
    loai_coc          TINYINT UNSIGNED NOT NULL DEFAULT 1,
    tien_coc          DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT 'Chỉ dùng khi loai_coc = 1 hoặc 2',
    tien_phat         DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT 'Phí trễ hạn hoặc hư hỏng',
    -- 1: Chờ xác nhận, 2: Đang thuê, 3: Đã trả, 4: Quá hạn, 5: Đã hủy
    trang_thai        TINYINT UNSIGNED NOT NULL DEFAULT 1,
    ghi_chu           TEXT            NULL,
    ngay_tao          TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uk_ma_phieu_thue (ma_phieu_thue),
    INDEX idx_trang_thai_thue (trang_thai),
    INDEX idx_ngay_hen_tra (ngay_hen_tra),
    INDEX idx_khach_hang (khach_hang_id),
    INDEX idx_nguoi_dung (nguoi_dung_id),
    CONSTRAINT fk_thuedo_khachhang FOREIGN KEY (khach_hang_id) REFERENCES khach_hang (id) ON DELETE RESTRICT,
    CONSTRAINT fk_thuedo_nguoidung FOREIGN KEY (nguoi_dung_id) REFERENCES nguoi_dung (id) ON DELETE RESTRICT,
    CONSTRAINT chk_thuedo_loai_coc CHECK (loai_coc IN (1, 2, 3)),
    CONSTRAINT chk_thuedo_ngay CHECK (ngay_hen_tra IS NULL OR ngay_bat_dau IS NULL OR ngay_hen_tra >= ngay_bat_dau),
    CONSTRAINT chk_thuedo_trang_thai CHECK (trang_thai IN (1, 2, 3, 4, 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: chi_tiet_thue_do (chi tiết phiếu thuê)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chi_tiet_thue_do (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    thue_do_id     BIGINT UNSIGNED NOT NULL,
    san_pham_id    BIGINT UNSIGNED NOT NULL,
    gia_thue_ngay  DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT 'Giá thuê/ngày tại thời điểm lập phiếu',
    tien_coc       DECIMAL(12, 2)  NOT NULL DEFAULT 0.00 COMMENT 'Tiền cọc của sản phẩm tại thời điểm lập phiếu',
    PRIMARY KEY (id),
    UNIQUE INDEX uk_thuedo_sanpham (thue_do_id, san_pham_id),
    INDEX idx_san_pham (san_pham_id),
    CONSTRAINT fk_ct_thuedo  FOREIGN KEY (thue_do_id)  REFERENCES thue_do (id)   ON DELETE CASCADE,
    CONSTRAINT fk_ct_sanpham FOREIGN KEY (san_pham_id) REFERENCES san_pham (id)  ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- Table: cai_dat (cài đặt)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cai_dat (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    khoa           VARCHAR(100)    NOT NULL COMMENT 'Mã cấu hình, ví dụ: ten_cua_hang, phi_tre_han_moi_ngay',
    gia_tri        TEXT            NULL     COMMENT 'Giá trị cấu hình (lưu dạng chuỗi)',
    -- 1: Chuỗi, 2: Số, 3: Boolean, 4: JSON
    kieu_du_lieu   TINYINT UNSIGNED NOT NULL DEFAULT 1,
    mo_ta          VARCHAR(255)    NULL     COMMENT 'Mô tả ý nghĩa cấu hình',
    ngay_tao       TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ngay_cap_nhat  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE INDEX uk_cai_dat_khoa (khoa),
    CONSTRAINT chk_cai_dat_kieu CHECK (kieu_du_lieu IN (1, 2, 3, 4))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO cai_dat (khoa, gia_tri, kieu_du_lieu, mo_ta) VALUES
    ('pham_tram_gia_coc',     '85',         2, 'Số phần trăm giá trị cọc'),
    ('so_dien_thoai_lien_he', '0365193713', 1, 'Số điện thoại liên hệ của shop'),