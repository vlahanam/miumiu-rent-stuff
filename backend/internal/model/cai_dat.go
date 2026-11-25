package model

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
)

// CaiDat maps to table `cai_dat`
// kieu_du_lieu: 1=Chuỗi, 2=Số, 3=Boolean, 4=JSON
type CaiDat struct {
	ID          uint      `json:"id"            gorm:"primaryKey;autoIncrement"`
	Khoa        string    `json:"khoa"          gorm:"column:khoa;type:varchar(100);uniqueIndex;not null"`
	GiaTri      *string   `json:"gia_tri"       gorm:"column:gia_tri;type:text"`
	KieuDuLieu  uint8     `json:"kieu_du_lieu"  gorm:"column:kieu_du_lieu;type:tinyint unsigned;not null;default:1"`
	MoTa        *string   `json:"mo_ta"         gorm:"column:mo_ta;type:varchar(255)"`
	NgayTao     time.Time `json:"ngay_tao"      gorm:"column:ngay_tao;autoCreateTime"`
	NgayCapNhat time.Time `json:"ngay_cap_nhat" gorm:"column:ngay_cap_nhat;autoUpdateTime"`
}

func (CaiDat) TableName() string { return "cai_dat" }

// UpdateCaiDatInput cho PUT /cai-dat/:khoa
type UpdateCaiDatInput struct {
	GiaTri *string `json:"gia_tri"`
}

func (i UpdateCaiDatInput) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.GiaTri, validation.NotNil.Error("Giá trị cài đặt không được để trống")),
	)
}
