package model

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
)

// KhachHang maps to table `khach_hang`
type KhachHang struct {
	ID           uint      `json:"id"            gorm:"primaryKey;autoIncrement"`
	Ten          string    `json:"ten"           gorm:"column:ten;type:varchar(100);not null"`
	SoDienThoai  string    `json:"so_dien_thoai" gorm:"column:so_dien_thoai;type:varchar(20);uniqueIndex;not null"`
	DiaChi       *string   `json:"dia_chi"       gorm:"column:dia_chi;type:varchar(255)"`
	NgayTao      time.Time `json:"ngay_tao"      gorm:"column:ngay_tao;autoCreateTime"`
	NgayCapNhat  time.Time `json:"ngay_cap_nhat" gorm:"column:ngay_cap_nhat;autoUpdateTime"`
}

func (KhachHang) TableName() string { return "khach_hang" }

// CreateKhachHangInput dùng cho POST /khach-hang
type CreateKhachHangInput struct {
	Ten         string  `json:"ten"           binding:"required"`
	SoDienThoai string  `json:"so_dien_thoai" binding:"required"`
	DiaChi      *string `json:"dia_chi"`
}

func (i CreateKhachHangInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.Ten,
			validation.Required.Error("Tên khách hàng không được để trống"),
			validation.Length(1, 100).Error("Tên tối đa 100 ký tự"),
		),
		validation.Field(&i.SoDienThoai,
			validation.Required.Error("Số điện thoại không được để trống"),
			validation.Length(1, 20).Error("Số điện thoại tối đa 20 ký tự"),
			is.Digit.Error("Số điện thoại chỉ chứa chữ số"),
		),
		validation.Field(&i.DiaChi,
			validation.Length(0, 255).Error("Địa chỉ tối đa 255 ký tự"),
		),
	)
}

// UpdateKhachHangInput dùng cho PUT /khach-hang/:id
type UpdateKhachHangInput struct {
	Ten         *string `json:"ten"`
	SoDienThoai *string `json:"so_dien_thoai"`
	DiaChi      *string `json:"dia_chi"`
}

func (i UpdateKhachHangInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.Ten,
			validation.Length(1, 100).Error("Tên tối đa 100 ký tự"),
		),
		validation.Field(&i.SoDienThoai,
			validation.Length(1, 20).Error("Số điện thoại tối đa 20 ký tự"),
			is.Digit.Error("Số điện thoại chỉ chứa chữ số"),
		),
		validation.Field(&i.DiaChi,
			validation.Length(0, 255).Error("Địa chỉ tối đa 255 ký tự"),
		),
	)
}
