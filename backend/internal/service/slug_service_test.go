package service

import (
	"testing"

	"miumiu-rent-stuff/internal/model"

	"github.com/glebarez/sqlite"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func openTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Discard,
	})
	if err != nil {
		t.Fatalf("failed to open sqlite db: %v", err)
	}
	err = db.AutoMigrate(
		&model.SanPham{},
		&model.NguoiDung{},
		&model.KhachHang{},
		&model.ThueDo{},
		&model.ChiTietThueDo{},
		&model.CaiDat{},
	)
	if err != nil {
		t.Fatalf("failed to migrate test db: %v", err)
	}
	return db
}

func TestGenerateUniqueSlug(t *testing.T) {
	db := openTestDB(t)

	// 1. Tiếng Việt có dấu → slug chuẩn không dấu
	s1 := GenerateUniqueSlug(db, "Áo Dài Gấm Đỏ Đô Thêu Phụng", 0)
	if s1 != "ao-dai-gam-do-do-theu-phung" {
		t.Fatalf("expected 'ao-dai-gam-do-do-theu-phung', got %q", s1)
	}

	// Lưu SP 1 vào DB
	sp1 := model.SanPham{
		MaSanPham:     "MM-001",
		TenSanPham:    "Áo Dài Gấm Đỏ Đô Thêu Phụng",
		Slug:          s1,
		GiaGocSanPham: decimal.NewFromInt(2000000),
		GiaThueNgay:   decimal.NewFromInt(300000),
		TrangThai:     1,
	}
	if err := db.Create(&sp1).Error; err != nil {
		t.Fatalf("create sp1 failed: %v", err)
	}

	// 2. Cùng tên → tự gắn hậu tố -1
	s2 := GenerateUniqueSlug(db, "Áo Dài Gấm Đỏ Đô Thêu Phụng", 0)
	if s2 != "ao-dai-gam-do-do-theu-phung-1" {
		t.Fatalf("expected suffix '-1', got %q", s2)
	}

	// 3. excludeID = chính nó → giữ nguyên slug gốc
	sSame := GenerateUniqueSlug(db, "Áo Dài Gấm Đỏ Đô Thêu Phụng", sp1.ID)
	if sSame != s1 {
		t.Fatalf("expected same slug %q with excludeID, got %q", s1, sSame)
	}

	// 4. Tên chỉ có ký tự đặc biệt → fallback "san-pham"
	sFallback := GenerateUniqueSlug(db, "!!!???", 0)
	if sFallback != "san-pham" {
		t.Fatalf("expected fallback 'san-pham', got %q", sFallback)
	}
}
