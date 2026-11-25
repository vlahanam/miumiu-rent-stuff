package service

import (
	"fmt"
	"testing"

	"miumiu-rent-stuff/internal/model"

	"github.com/shopspring/decimal"
)

func TestGenerateMaSanPham(t *testing.T) {
	db := openTestDB(t)
	slugIdx := 0
	createSP := func(sku string) {
		t.Helper()
		slugIdx++
		sp := model.SanPham{
			MaSanPham:     sku,
			TenSanPham:    fmt.Sprintf("Sản phẩm %d", slugIdx),
			Slug:          fmt.Sprintf("san-pham-%d", slugIdx),
			GiaGocSanPham: decimal.NewFromInt(1000000),
			GiaThueNgay:   decimal.NewFromInt(200000),
			TrangThai:     1,
		}
		if err := db.Create(&sp).Error; err != nil {
			t.Fatalf("failed to create san_pham %q: %v", sku, err)
		}
	}

	// 1. Bảng trống → MIU-001
	if got := GenerateMaSanPham(db); got != "MIU-001" {
		t.Fatalf("expected MIU-001 on empty table, got %s", got)
	}

	// 2. Có sẵn mã cũ khác prefix (MiuMiu-001, MM-005) → vẫn bắt đầu từ MIU-001
	createSP("MiuMiu-001")
	createSP("MM-005")
	if got := GenerateMaSanPham(db); got != "MIU-001" {
		t.Fatalf("expected MIU-001 when only legacy prefixes exist, got %s", got)
	}

	// 3. Tạo tuần tự MIU-001, MIU-002 → MIU-003
	createSP("MIU-001")
	if got := GenerateMaSanPham(db); got != "MIU-002" {
		t.Fatalf("expected MIU-002, got %s", got)
	}
	createSP("MIU-002")
	if got := GenerateMaSanPham(db); got != "MIU-003" {
		t.Fatalf("expected MIU-003, got %s", got)
	}

	// 4. Có khoảng trống (MIU-005) → tăng tiếp lên MIU-006
	createSP("MIU-005")
	if got := GenerateMaSanPham(db); got != "MIU-006" {
		t.Fatalf("expected MIU-006 after MIU-005, got %s", got)
	}

	// 5. Bỏ qua các mã có hậu tố không phải số nguyên dương thuần túy
	createSP("MIU-VIP")
	createSP("MIU-001-A")
	createSP("MIU-")
	createSP("MIU--9")
	createSP("MIU-+9")
	if got := GenerateMaSanPham(db); got != "MIU-006" {
		t.Fatalf("expected MIU-006 ignoring non-numeric MIU-* codes, got %s", got)
	}

	// 6. Không phân biệt hoa/thường (miu-006) → nhảy sang MIU-007
	createSP("miu-006")
	if got := GenerateMaSanPham(db); got != "MIU-007" {
		t.Fatalf("expected MIU-007 after lowercase miu-006, got %s", got)
	}

	// 7. Các định dạng số khác độ dài (MIU-0008, MIU-9) → nhảy sang MIU-010
	createSP("MIU-0008")
	createSP("MIU-9")
	if got := GenerateMaSanPham(db); got != "MIU-010" {
		t.Fatalf("expected MIU-010 after MIU-0008 and MIU-9, got %s", got)
	}

	// 8. Vượt quá 3 chữ số (MIU-999 → MIU-1000)
	createSP("MIU-999")
	if got := GenerateMaSanPham(db); got != "MIU-1000" {
		t.Fatalf("expected MIU-1000 after MIU-999, got %s", got)
	}

	// 9. Hậu tố quá dài / tràn uint64 bị bỏ qua an toàn
	createSP("MIU-1000")
	createSP("MIU-99999999999999999999")
	if got := GenerateMaSanPham(db); got != "MIU-1001" {
		t.Fatalf("expected MIU-1001 ignoring oversized numeric suffix, got %s", got)
	}
}

func TestGenerateMaSanPhamWithZeroSuffix(t *testing.T) {
	db := openTestDB(t)
	sp := model.SanPham{
		MaSanPham:     "MIU-000",
		TenSanPham:    "Sản phẩm 0",
		Slug:          "san-pham-0",
		GiaGocSanPham: decimal.NewFromInt(500000),
		GiaThueNgay:   decimal.NewFromInt(100000),
		TrangThai:     1,
	}
	if err := db.Create(&sp).Error; err != nil {
		t.Fatalf("create MIU-000 failed: %v", err)
	}
	if got := GenerateMaSanPham(db); got != "MIU-001" {
		t.Fatalf("expected MIU-001 after MIU-000, got %s", got)
	}
}
