package model

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/shopspring/decimal"
)

// SanPham maps to table `san_pham`
// trang_thai: 1=Trống lịch, 2=Đã cho thuê, 3=Đang bảo dưỡng
type SanPham struct {
	ID            uint            `json:"id"               gorm:"primaryKey;autoIncrement"`
	MaSanPham     string          `json:"ma_san_pham"      gorm:"column:ma_san_pham;type:varchar(30);uniqueIndex;not null"`
	TenSanPham    string          `json:"ten_san_pham"     gorm:"column:ten_san_pham;type:varchar(255);not null"`
	Slug          string          `json:"slug"             gorm:"column:slug;type:varchar(255);uniqueIndex;not null"`
	HinhAnh       *string         `json:"hinh_anh"         gorm:"column:hinh_anh;type:text"`
	GiaGocSanPham decimal.Decimal `json:"gia_goc_san_pham" gorm:"column:gia_goc_san_pham;type:decimal(12,2);not null;default:0"`
	GiaThueNgay   decimal.Decimal `json:"gia_thue_ngay"    gorm:"column:gia_thue_ngay;type:decimal(12,2);not null;default:0"`
	TrangThai     uint8           `json:"trang_thai"       gorm:"column:trang_thai;type:tinyint unsigned;not null;default:1"`
	NgayTao       time.Time       `json:"ngay_tao"         gorm:"column:ngay_tao;autoCreateTime"`
	NgayCapNhat   time.Time       `json:"ngay_cap_nhat"    gorm:"column:ngay_cap_nhat;autoUpdateTime"`
}

func (SanPham) TableName() string { return "san_pham" }

// SanPhamDetail là response chi tiết kèm lịch sử thuê và doanh thu
type SanPhamDetail struct {
	SanPham
	SoLanThue    int64           `json:"so_lan_thue"`
	TongDoanhThu decimal.Decimal `json:"tong_doanh_thu"`
	DaThuHoiVon  bool            `json:"da_thu_hoi_von"`
	LichSuThue   []LichSuThue    `json:"lich_su_thue"`
}

// LichSuThue là thông tin tóm tắt mỗi lần thuê trong lịch sử
type LichSuThue struct {
	MaPhieuThue  string     `json:"ma_phieu_thue"`
	TenKhachHang string     `json:"ten_khach_hang"`
	NgayBatDau   *time.Time `json:"ngay_bat_dau"`
	NgayHenTra   *time.Time `json:"ngay_hen_tra"`
	TrangThai    uint8      `json:"trang_thai"`
}

// CreateSanPhamInput dùng cho POST /san-pham
// Không có slug (tự sinh), không có trang_thai (mặc định 1)
type CreateSanPhamInput struct {
	MaSanPham     string          `json:"ma_san_pham"      binding:"required"`
	TenSanPham    string          `json:"ten_san_pham"     binding:"required"`
	HinhAnh       *string         `json:"hinh_anh"`
	GiaGocSanPham decimal.Decimal `json:"gia_goc_san_pham"`
	GiaThueNgay   decimal.Decimal `json:"gia_thue_ngay"`
}

func (i CreateSanPhamInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.MaSanPham,
			validation.Required.Error("Mã sản phẩm không được để trống"),
			validation.Length(1, 30).Error("Mã sản phẩm tối đa 30 ký tự"),
		),
		validation.Field(&i.TenSanPham,
			validation.Required.Error("Tên sản phẩm không được để trống"),
			validation.Length(1, 255).Error("Tên sản phẩm tối đa 255 ký tự"),
		),
	)
}

// UpdateSanPhamInput dùng cho PUT /san-pham/:id
type UpdateSanPhamInput struct {
	MaSanPham     *string          `json:"ma_san_pham"`
	TenSanPham    *string          `json:"ten_san_pham"`
	HinhAnh       *string          `json:"hinh_anh"`
	GiaGocSanPham *decimal.Decimal `json:"gia_goc_san_pham"`
	GiaThueNgay   *decimal.Decimal `json:"gia_thue_ngay"`
}

func (i UpdateSanPhamInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.MaSanPham,
			validation.Length(1, 30).Error("Mã sản phẩm tối đa 30 ký tự"),
		),
		validation.Field(&i.TenSanPham,
			validation.Length(1, 255).Error("Tên sản phẩm tối đa 255 ký tự"),
		),
	)
}

// PatchTrangThaiInput cho PATCH /san-pham/:id/trang-thai
type PatchTrangThaiInput struct {
	TrangThai uint8 `json:"trang_thai" binding:"required"`
}

func (i PatchTrangThaiInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.TrangThai,
			validation.Required.Error("Trạng thái không được để trống"),
			validation.In(uint8(1), uint8(2), uint8(3)).Error("Trạng thái không hợp lệ (1=Trống lịch, 2=Đã cho thuê, 3=Đang bảo dưỡng)"),
		),
	)
}
