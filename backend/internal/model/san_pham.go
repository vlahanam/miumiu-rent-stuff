package model

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
)

// SanPham maps to table `san_pham`
// trang_thai: 1=Trống lịch, 2=Đã cho thuê, 3=Đang bảo dưỡng
type SanPham struct {
	ID             uint      `json:"id"               gorm:"primaryKey;autoIncrement"`
	MaSanPham      string    `json:"ma_san_pham"      gorm:"column:ma_san_pham;type:varchar(30);uniqueIndex;not null"`
	TenSanPham     string    `json:"ten_san_pham"     gorm:"column:ten_san_pham;type:varchar(255);not null"`
	Slug           string    `json:"slug"             gorm:"column:slug;type:varchar(255);uniqueIndex;not null"`
	HinhAnh        *string   `json:"hinh_anh"         gorm:"column:hinh_anh;type:text"`
	GiaGocSanPham  float64   `json:"gia_goc_san_pham" gorm:"column:gia_goc_san_pham;type:decimal(12,2);not null;default:0"`
	GiaThuNgay     float64   `json:"gia_thue_ngay"    gorm:"column:gia_thue_ngay;type:decimal(12,2);not null;default:0"`
	TrangThai      uint8     `json:"trang_thai"       gorm:"column:trang_thai;type:tinyint unsigned;not null;default:1"`
	NgayTao        time.Time `json:"ngay_tao"         gorm:"column:ngay_tao;autoCreateTime"`
	NgayCapNhat    time.Time `json:"ngay_cap_nhat"    gorm:"column:ngay_cap_nhat;autoUpdateTime"`
}

func (SanPham) TableName() string { return "san_pham" }

// CreateSanPhamInput dùng cho POST /san-pham
type CreateSanPhamInput struct {
	MaSanPham     string  `json:"ma_san_pham"      binding:"required"`
	TenSanPham    string  `json:"ten_san_pham"     binding:"required"`
	Slug          string  `json:"slug"             binding:"required"`
	HinhAnh       *string `json:"hinh_anh"`
	GiaGocSanPham float64 `json:"gia_goc_san_pham"`
	GiaThuNgay    float64 `json:"gia_thue_ngay"`
	TrangThai     uint8   `json:"trang_thai"`
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
		validation.Field(&i.Slug,
			validation.Required.Error("Slug không được để trống"),
			validation.Length(1, 255).Error("Slug tối đa 255 ký tự"),
		),
		validation.Field(&i.GiaGocSanPham,
			validation.Min(0.0).Error("Giá gốc phải >= 0"),
		),
		validation.Field(&i.GiaThuNgay,
			validation.Min(0.0).Error("Giá thuê/ngày phải >= 0"),
		),
		validation.Field(&i.TrangThai,
			validation.In(uint8(0), uint8(1), uint8(2), uint8(3)).Error("Trạng thái không hợp lệ (1, 2, 3)"),
		),
	)
}

// UpdateSanPhamInput dùng cho PUT /san-pham/:id
type UpdateSanPhamInput struct {
	MaSanPham     *string  `json:"ma_san_pham"`
	TenSanPham    *string  `json:"ten_san_pham"`
	Slug          *string  `json:"slug"`
	HinhAnh       *string  `json:"hinh_anh"`
	GiaGocSanPham *float64 `json:"gia_goc_san_pham"`
	GiaThuNgay    *float64 `json:"gia_thue_ngay"`
	TrangThai     *uint8   `json:"trang_thai"`
}

func (i UpdateSanPhamInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.MaSanPham,
			validation.Length(1, 30).Error("Mã sản phẩm tối đa 30 ký tự"),
		),
		validation.Field(&i.TenSanPham,
			validation.Length(1, 255).Error("Tên sản phẩm tối đa 255 ký tự"),
		),
		validation.Field(&i.Slug,
			validation.Length(1, 255).Error("Slug tối đa 255 ký tự"),
		),
	)
}
