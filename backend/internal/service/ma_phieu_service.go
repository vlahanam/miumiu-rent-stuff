package service

import (
	"fmt"

	"miumiu-rent-stuff/internal/model"

	"gorm.io/gorm"
)

// GenerateMaPhieu sinh mã phiếu tự động dạng DT-XXXX đảm bảo không trùng
func GenerateMaPhieu(db *gorm.DB) string {
	var maxID uint
	db.Model(&model.ThueDo{}).Select("COALESCE(MAX(id), 0)").Scan(&maxID)

	for next := maxID + 1; ; next++ {
		candidate := fmt.Sprintf("DT-%04d", next)
		var count int64
		db.Model(&model.ThueDo{}).Where("ma_phieu_thue = ?", candidate).Count(&count)
		if count == 0 {
			return candidate
		}
	}
}
