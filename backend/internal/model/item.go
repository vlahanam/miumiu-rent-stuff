package model

import (
	"time"

	validation "github.com/go-ozzo/ozzo-validation/v4"
)

type Item struct {
	ID          uint      `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name" gorm:"type:varchar(255);not null"`
	Description string    `json:"description" gorm:"type:text"`
	PricePerDay float64   `json:"price_per_day" gorm:"type:decimal(10,2);not null"`
	IsAvailable bool      `json:"is_available" gorm:"default:true"`
	ImageURL    string    `json:"image_url" gorm:"type:varchar(500)"`
	Category    string    `json:"category" gorm:"type:varchar(100)"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

func (i Item) Validate() error {
	return validation.ValidateStruct(&i,
		validation.Field(&i.Name,
			validation.Required.Error("Tên sản phẩm không được để trống"),
			validation.Length(1, 255).Error("Tên sản phẩm không được vượt quá 255 ký tự"),
		),
		validation.Field(&i.PricePerDay,
			validation.Required.Error("Giá thuê không được để trống"),
			validation.Min(0.0).Error("Giá thuê phải lớn hơn hoặc bằng 0"),
		),
		validation.Field(&i.Category,
			validation.Length(0, 100).Error("Danh mục không được vượt quá 100 ký tự"),
		),
	)
}
