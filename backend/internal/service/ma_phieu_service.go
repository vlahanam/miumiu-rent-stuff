package service

import (
	"fmt"

	"miumiu-rent-stuff/internal/model"

	"gorm.io/gorm"
)

// GenerateMaPhieu sinh mã phiếu tự động dạng DT-XXXX
// Lấy MAX(id) hiện tại và +1 để dự đoán ID tiếp theo
func GenerateMaPhieu(db *gorm.DB) string {
	var maxID uint
	db.Model(&model.ThueDo{}).Select("COALESCE(MAX(id), 0)").Scan(&maxID)
	return fmt.Sprintf("DT-%04d", maxID+1)
}
