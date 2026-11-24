package model

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
	"github.com/go-ozzo/ozzo-validation/v4/is"
)

// NguoiDung maps to table `nguoi_dung`
type NguoiDung struct {
	ID          uint      `json:"id"           gorm:"primaryKey;autoIncrement"`
	Ten         string    `json:"ten"          gorm:"column:ten;type:varchar(100);not null"`
	Email       string    `json:"email"        gorm:"column:email;type:varchar(100);uniqueIndex;not null"`
	MatKhau     string    `json:"-"            gorm:"column:mat_khau;type:varchar(255);not null"`
	NgayTao     time.Time `json:"ngay_tao"     gorm:"column:ngay_tao;autoCreateTime"`
	NgayCapNhat time.Time `json:"ngay_cap_nhat" gorm:"column:ngay_cap_nhat;autoUpdateTime"`
}

func (NguoiDung) TableName() string { return "nguoi_dung" }

// NguoiDungPublic là struct không có mat_khau để trả về client
type NguoiDungPublic struct {
	ID          uint      `json:"id"`
	Ten         string    `json:"ten"`
	Email       string    `json:"email"`
	NgayTao     time.Time `json:"ngay_tao"`
	NgayCapNhat time.Time `json:"ngay_cap_nhat"`
}

// ToPublic chuyển NguoiDung → NguoiDungPublic
func (n NguoiDung) ToPublic() NguoiDungPublic {
	return NguoiDungPublic{
		ID:          n.ID,
		Ten:         n.Ten,
		Email:       n.Email,
		NgayTao:     n.NgayTao,
		NgayCapNhat: n.NgayCapNhat,
	}
}

// LoginInput cho POST /auth/login
type LoginInput struct {
	Email   string `json:"email"    binding:"required"`
	MatKhau string `json:"mat_khau" binding:"required"`
}

func (i LoginInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.Email,
			validation.Required.Error("Email không được để trống"),
			is.Email.Error("Email không hợp lệ"),
		),
		validation.Field(&i.MatKhau,
			validation.Required.Error("Mật khẩu không được để trống"),
		),
	)
}

// UpdateProfileInput cho PUT /auth/me
type UpdateProfileInput struct {
	Ten        *string `json:"ten"`
	MatKhauCu  *string `json:"mat_khau_cu"`
	MatKhauMoi *string `json:"mat_khau_moi"`
}

func (i UpdateProfileInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.Ten,
			validation.Length(1, 100).Error("Tên tối đa 100 ký tự"),
		),
		validation.Field(&i.MatKhauMoi,
			validation.Length(6, 255).Error("Mật khẩu mới tối thiểu 6 ký tự"),
		),
	)
}
