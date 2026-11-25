package service

import (
	"fmt"
	"strconv"
	"strings"

	"miumiu-rent-stuff/internal/model"

	"gorm.io/gorm"
)

// MaSanPhamPrefix là tiền tố mặc định cho mã SKU sản phẩm tự sinh
const MaSanPhamPrefix = "MIU-"

func isASCIIAllDigits(s string) bool {
	if s == "" {
		return false
	}
	for i := 0; i < len(s); i++ {
		if s[i] < '0' || s[i] > '9' {
			return false
		}
	}
	return true
}

// GenerateMaSanPham sinh mã sản phẩm (SKU) tự động dạng MIU-XXX (MIU-001, MIU-002, ...)
// đảm bảo không trùng lặp trong DB (kể cả không phân biệt chữ hoa/thường trên MySQL).
func GenerateMaSanPham(db *gorm.DB) string {
	var existingSKUs []string
	db.Model(&model.SanPham{}).
		Where("UPPER(ma_san_pham) LIKE ?", MaSanPhamPrefix+"%").
		Pluck("ma_san_pham", &existingSKUs)

	var maxNum uint64
	for _, sku := range existingSKUs {
		upper := strings.ToUpper(strings.TrimSpace(sku))
		if !strings.HasPrefix(upper, MaSanPhamPrefix) {
			continue
		}
		suffix := upper[len(MaSanPhamPrefix):]
		// Giới hạn 18 chữ số để tránh tràn uint64 và đảm bảo vừa VARCHAR(30)
		if len(suffix) == 0 || len(suffix) > 18 || !isASCIIAllDigits(suffix) {
			continue
		}
		n, err := strconv.ParseUint(suffix, 10, 64)
		if err == nil && n > maxNum {
			maxNum = n
		}
	}

	for next := maxNum + 1; ; next++ {
		candidate := fmt.Sprintf("%s%03d", MaSanPhamPrefix, next)
		var count int64
		db.Model(&model.SanPham{}).
			Where("UPPER(ma_san_pham) = ?", candidate).
			Count(&count)
		if count == 0 {
			return candidate
		}
	}
}
