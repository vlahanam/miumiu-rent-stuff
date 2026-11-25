package service

import (
	"testing"

	"miumiu-rent-stuff/internal/model"

	"github.com/shopspring/decimal"
)

func TestGenerateMaPhieu(t *testing.T) {
	db := openTestDB(t)

	// Bảng trống → DT-0001
	code1 := GenerateMaPhieu(db)
	if code1 != "DT-0001" {
		t.Fatalf("expected DT-0001, got %s", code1)
	}

	kh := model.KhachHang{Ten: "Test KH", SoDienThoai: "0901234567"}
	db.Create(&kh)
	nd := model.NguoiDung{Ten: "Admin", Email: "a@b.com", MatKhau: "hash"}
	db.Create(&nd)

	// Chèn phiếu DT-0001 (id=1) và DT-0002 thủ công để kiểm tra tránh trùng
	db.Create(&model.ThueDo{
		MaPhieuThue:  "DT-0001",
		KhachHangID:  kh.ID,
		NguoiDungID:  nd.ID,
		TongTienThue: decimal.Zero,
		LoaiCoc:      1,
		TrangThai:    1,
	})
	code2 := GenerateMaPhieu(db)
	if code2 != "DT-0002" {
		t.Fatalf("expected DT-0002, got %s", code2)
	}

	// Chèn phiếu có mã DT-0003 trước khi id đạt 3
	db.Create(&model.ThueDo{
		MaPhieuThue:  "DT-0003",
		KhachHangID:  kh.ID,
		NguoiDungID:  nd.ID,
		TongTienThue: decimal.Zero,
		LoaiCoc:      1,
		TrangThai:    1,
	})
	// maxID = 2 → next = 3 → DT-0003 đã tồn tại → phải nhảy sang DT-0004
	code3 := GenerateMaPhieu(db)
	if code3 != "DT-0004" {
		t.Fatalf("expected collision-free DT-0004, got %s", code3)
	}
}
