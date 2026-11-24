package service

import (
	"fmt"

	"miumiu-rent-stuff/internal/model"

	"github.com/gosimple/slug"
	"gorm.io/gorm"
)

// GenerateUniqueSlug sinh slug từ tên sản phẩm, đảm bảo không trùng trong DB
// Nếu trùng thì thêm hậu tố -1, -2, ...
// Bỏ qua excludeID nếu > 0 (dùng khi update để không tính chính nó)
func GenerateUniqueSlug(db *gorm.DB, name string, excludeID uint) string {
	base := slug.Make(name)
	if base == "" {
		base = "san-pham"
	}

	candidate := base
	for i := 1; ; i++ {
		var count int64
		q := db.Model(&model.SanPham{}).Where("slug = ?", candidate)
		if excludeID > 0 {
			q = q.Where("id != ?", excludeID)
		}
		q.Count(&count)
		if count == 0 {
			return candidate
		}
		candidate = fmt.Sprintf("%s-%d", base, i)
	}
}
