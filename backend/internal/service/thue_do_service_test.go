package service

import (
	"strings"
	"testing"
	"time"

	"miumiu-rent-stuff/internal/model"

	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

func seedBaseData(t *testing.T, db *gorm.DB) (model.NguoiDung, model.KhachHang, model.SanPham, model.SanPham) {
	t.Helper()
	val85 := "85"
	db.Create(&model.CaiDat{Khoa: "pham_tram_gia_coc", GiaTri: &val85, KieuDuLieu: 2})

	nd := model.NguoiDung{Ten: "Nhân viên A", Email: "nv@miumiu.vn", MatKhau: "hash"}
	db.Create(&nd)

	kh := model.KhachHang{Ten: "Nguyễn Thu Hà", SoDienThoai: "0912345678"}
	db.Create(&kh)

	sp1 := model.SanPham{
		MaSanPham:     "MM-001",
		TenSanPham:    "Áo dài gấm đỏ",
		Slug:          "ao-dai-gam-do",
		GiaGocSanPham: decimal.NewFromInt(2000000),
		GiaThueNgay:   decimal.NewFromInt(300000),
		TrangThai:     1,
	}
	sp2 := model.SanPham{
		MaSanPham:     "MM-002",
		TenSanPham:    "Khăn đóng vàng",
		Slug:          "khan-dong-vang",
		GiaGocSanPham: decimal.NewFromInt(500000),
		GiaThueNgay:   decimal.NewFromInt(80000),
		TrangThai:     1,
	}
	db.Create(&sp1)
	db.Create(&sp2)
	return nd, kh, sp1, sp2
}

func TestTinhTongTienThue(t *testing.T) {
	items := []model.ChiTietThueDo{
		{GiaThueNgay: decimal.NewFromInt(300000)},
		{GiaThueNgay: decimal.NewFromInt(80000)},
	}
	got := TinhTongTienThue(items, 3)
	want := decimal.NewFromInt(1140000)
	if !got.Equal(want) {
		t.Fatalf("expected %s, got %s", want, got)
	}
}

func TestThueDoLifecycleAndConflicts(t *testing.T) {
	db := openTestDB(t)
	nd, kh, sp1, sp2 := seedBaseData(t, db)
	svc := NewThueDoService(db)

	// 1. Tạo phiếu thuê ngay (hôm nay) → Đang thuê (2), SP → Đã cho thuê (2)
	now := time.Now().Add(-1 * time.Minute)
	soNgay2 := uint16(2)
	tdNow, err := svc.TaoPhieu(model.CreateThueDoInput{
		KhachHangID: kh.ID,
		NgayBatDau:  &now,
		SoNgayThue:  &soNgay2,
		LoaiCoc:     1,
		TienCoc:     decimal.NewFromInt(2000000),
		ChiTiet:     []model.ChiTietThueDoInput{{SanPhamID: sp1.ID}, {SanPhamID: sp2.ID}},
	}, nd.ID)
	if err != nil {
		t.Fatalf("TaoPhieu immediate failed: %v", err)
	}
	if tdNow.TrangThai != 2 {
		t.Fatalf("expected trang_thai=2 (Đang thuê), got %d", tdNow.TrangThai)
	}
	if !tdNow.TongTienThue.Equal(decimal.NewFromInt(760000)) {
		t.Fatalf("expected tong_tien_thue=760000, got %s", tdNow.TongTienThue)
	}
	if tdNow.MaPhieuThue != "DT-0001" {
		t.Fatalf("expected DT-0001, got %s", tdNow.MaPhieuThue)
	}
	// Kiểm tra snapshot tiền cọc gợi ý 85% giá gốc cho SP1 (1.700.000)
	if !tdNow.ChiTiet[0].TienCoc.Equal(decimal.NewFromInt(1700000)) {
		t.Fatalf("expected suggested deposit 1700000, got %s", tdNow.ChiTiet[0].TienCoc)
	}
	var refreshedSP1 model.SanPham
	db.First(&refreshedSP1, sp1.ID)
	if refreshedSP1.TrangThai != 2 {
		t.Fatalf("expected SP1 trang_thai=2, got %d", refreshedSP1.TrangThai)
	}

	// 2. Đặt trùng lịch SP1 trong ngày mai → phải báo lỗi có tên/mã SP
	tomorrow := time.Now().Add(24 * time.Hour)
	_, err = svc.TaoPhieu(model.CreateThueDoInput{
		KhachHangID: kh.ID,
		NgayBatDau:  &tomorrow,
		SoNgayThue:  &soNgay2,
		LoaiCoc:     1,
		TienCoc:     decimal.NewFromInt(1000000),
		ChiTiet:     []model.ChiTietThueDoInput{{SanPhamID: sp1.ID}},
	}, nd.ID)
	if err == nil {
		t.Fatal("expected schedule conflict error, got nil")
	}
	if !strings.Contains(err.Error(), "MM-001") || !strings.Contains(err.Error(), "DT-0001") {
		t.Fatalf("expected informative conflict error containing SKU and order code, got: %v", err)
	}

	// 3. Đặt trước SP1 vào tuần sau (không trùng ngày) với cọc CCCD → Chờ xác nhận (1), tien_coc=0
	nextWeek := time.Now().Add(7 * 24 * time.Hour)
	tdFuture, err := svc.TaoPhieu(model.CreateThueDoInput{
		KhachHangID: kh.ID,
		NgayBatDau:  &nextWeek,
		SoNgayThue:  &soNgay2,
		LoaiCoc:     3, // CCCD
		TienCoc:     decimal.NewFromInt(999999), // phải bị ép về 0
		ChiTiet:     []model.ChiTietThueDoInput{{SanPhamID: sp1.ID}},
	}, nd.ID)
	if err != nil {
		t.Fatalf("TaoPhieu future failed: %v", err)
	}
	if tdFuture.TrangThai != 1 {
		t.Fatalf("expected trang_thai=1 (Chờ xác nhận), got %d", tdFuture.TrangThai)
	}
	if !tdFuture.TienCoc.IsZero() {
		t.Fatalf("expected tien_coc=0 for CCCD, got %s", tdFuture.TienCoc)
	}

	// 4. Không thể giao đồ cho phiếu tuần sau khi SP1 vẫn đang được thuê ở DT-0001
	if _, err := svc.GiaoDo(tdFuture.ID, nil); err == nil {
		t.Fatal("expected GiaoDo to fail while SP1 is currently rented out")
	}

	// 5. Trả đồ cho DT-0001: SP1 → Trống lịch (1), SP2 → Bảo dưỡng (3), phạt 200k
	noteTra := "Hơi bẩn nhẹ"
	tdReturned, xuLyCoc, err := svc.TraDo(tdNow.ID, model.TraDoInput{
		TienPhat: decimal.NewFromInt(200000),
		GhiChu:   &noteTra,
		SanPhamTrangThai: []model.SanPhamTrangThaiItem{
			{SanPhamID: sp1.ID, TrangThai: 1},
			{SanPhamID: sp2.ID, TrangThai: 3},
		},
	})
	if err != nil {
		t.Fatalf("TraDo failed: %v", err)
	}
	if tdReturned.TrangThai != 3 {
		t.Fatalf("expected trang_thai=3 (Đã trả), got %d", tdReturned.TrangThai)
	}
	if !xuLyCoc.HoanLai.Equal(decimal.NewFromInt(1800000)) {
		t.Fatalf("expected hoan_lai=1800000, got %s", xuLyCoc.HoanLai)
	}
	db.First(&refreshedSP1, sp1.ID)
	var refreshedSP2 model.SanPham
	db.First(&refreshedSP2, sp2.ID)
	if refreshedSP1.TrangThai != 1 || refreshedSP2.TrangThai != 3 {
		t.Fatalf("unexpected post-return statuses: SP1=%d SP2=%d", refreshedSP1.TrangThai, refreshedSP2.TrangThai)
	}

	// 6. Không cho chọn SP2 đang bảo dưỡng vào phiếu mới
	_, err = svc.TaoPhieu(model.CreateThueDoInput{
		KhachHangID: kh.ID,
		NgayBatDau:  &nextWeek,
		SoNgayThue:  &soNgay2,
		LoaiCoc:     1,
		ChiTiet:     []model.ChiTietThueDoInput{{SanPhamID: sp2.ID}},
	}, nd.ID)
	if err == nil {
		t.Fatal("expected error when selecting maintenance product")
	}

	// 7. Sửa phiếu Đã trả → bị chặn
	_, err = svc.CapNhatPhieu(tdNow.ID, model.UpdateThueDoInput{SoNgayThue: &soNgay2})
	if err != ErrPhieuDaKetThuc {
		t.Fatalf("expected ErrPhieuDaKetThuc, got %v", err)
	}

	// 8. Giao đồ cho phiếu đặt trước (SP1 hiện đã Trống lịch) + đổi sang cọc tiền mặt
	loaiCoc1 := uint8(1)
	coc1500 := decimal.NewFromInt(1500000)
	tdHandedOver, err := svc.GiaoDo(tdFuture.ID, &model.GiaoDoInput{
		LoaiCoc: &loaiCoc1,
		TienCoc: &coc1500,
	})
	if err != nil {
		t.Fatalf("GiaoDo failed: %v", err)
	}
	if tdHandedOver.TrangThai != 2 || !tdHandedOver.TienCoc.Equal(coc1500) {
		t.Fatalf("unexpected GiaoDo result: status=%d coc=%s", tdHandedOver.TrangThai, tdHandedOver.TienCoc)
	}

	// 9. Hủy phiếu Đang thuê → Đã hủy (5), SP1 về Trống lịch (1)
	tdCancelled, err := svc.HuyPhieu(tdFuture.ID, model.HuyPhieuInput{GhiChu: "Khách đổi ý"})
	if err != nil {
		t.Fatalf("HuyPhieu failed: %v", err)
	}
	if tdCancelled.TrangThai != 5 {
		t.Fatalf("expected trang_thai=5 (Đã hủy), got %d", tdCancelled.TrangThai)
	}
	db.First(&refreshedSP1, sp1.ID)
	if refreshedSP1.TrangThai != 1 {
		t.Fatalf("expected SP1 back to 1 after cancelling active rental, got %d", refreshedSP1.TrangThai)
	}
}

func TestOverdueUpdateAndConflictBlock(t *testing.T) {
	db := openTestDB(t)
	nd, kh, sp1, _ := seedBaseData(t, db)
	svc := NewThueDoService(db)

	// Tạo phiếu quá hạn (bắt đầu 5 ngày trước, thuê 2 ngày → hẹn trả 3 ngày trước)
	pastStart := time.Now().Add(-5 * 24 * time.Hour)
	soNgay2 := uint16(2)
	td, err := svc.TaoPhieu(model.CreateThueDoInput{
		KhachHangID: kh.ID,
		NgayBatDau:  &pastStart,
		SoNgayThue:  &soNgay2,
		LoaiCoc:     1,
		TienCoc:     decimal.NewFromInt(1000000),
		ChiTiet:     []model.ChiTietThueDoInput{{SanPhamID: sp1.ID}},
	}, nd.ID)
	if err != nil {
		t.Fatalf("TaoPhieu past failed: %v", err)
	}

	affected, err := UpdateQuaHan(db)
	if err != nil || affected != 1 {
		t.Fatalf("expected 1 overdue updated, got affected=%d err=%v", affected, err)
	}

	// Không cho tạo phiếu mới lấy đồ NGAY BÂY GIỜ khi SP1 đang quá hạn chưa trả
	now := time.Now()
	_, err = svc.TaoPhieu(model.CreateThueDoInput{
		KhachHangID: kh.ID,
		NgayBatDau:  &now,
		SoNgayThue:  &soNgay2,
		LoaiCoc:     1,
		ChiTiet:     []model.ChiTietThueDoInput{{SanPhamID: sp1.ID}},
	}, nd.ID)
	if err == nil {
		t.Fatal("expected error booking overdue unreturned product today")
	}

	// Gia hạn phiếu quá hạn thêm 10 ngày → tự quay lại Đang thuê (2) và tính lại tổng tiền
	soNgay10 := uint16(10)
	updated, err := svc.CapNhatPhieu(td.ID, model.UpdateThueDoInput{
		SoNgayThue: &soNgay10,
	})
	if err != nil {
		t.Fatalf("CapNhatPhieu extend failed: %v", err)
	}
	if updated.TrangThai != 2 {
		t.Fatalf("expected extended overdue order to return to trang_thai=2, got %d", updated.TrangThai)
	}
	if !updated.TongTienThue.Equal(decimal.NewFromInt(3000000)) {
		t.Fatalf("expected recalculated total 3000000, got %s", updated.TongTienThue)
	}
}
