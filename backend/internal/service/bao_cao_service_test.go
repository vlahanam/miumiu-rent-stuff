package service

import (
	"bytes"
	"strings"
	"testing"
	"time"

	"miumiu-rent-stuff/internal/model"

	"github.com/shopspring/decimal"
)

func TestBaoCaoMultiItemNoDoubleCount(t *testing.T) {
	db := openTestDB(t)
	nd, kh, sp1, sp2 := seedBaseData(t, db)
	thueSvc := NewThueDoService(db)
	bcSvc := NewBaoCaoService(db)

	// Tạo 1 phiếu gồm 2 sản phẩm (300k + 80k) * 2 ngày = 760k, phạt 40k → tổng doanh thu = 800k
	now := time.Now().Add(-2 * time.Minute)
	soNgay2 := uint16(2)
	td, err := thueSvc.TaoPhieu(model.CreateThueDoInput{
		KhachHangID: kh.ID,
		NgayBatDau:  &now,
		SoNgayThue:  &soNgay2,
		LoaiCoc:     1,
		TienCoc:     decimal.NewFromInt(2000000),
		ChiTiet:     []model.ChiTietThueDoInput{{SanPhamID: sp1.ID}, {SanPhamID: sp2.ID}},
	}, nd.ID)
	if err != nil {
		t.Fatalf("TaoPhieu failed: %v", err)
	}

	_, _, err = thueSvc.TraDo(td.ID, model.TraDoInput{
		TienPhat: decimal.NewFromInt(40000),
		SanPhamTrangThai: []model.SanPhamTrangThaiItem{
			{SanPhamID: sp1.ID, TrangThai: 1},
			{SanPhamID: sp2.ID, TrangThai: 1},
		},
	})
	if err != nil {
		t.Fatalf("TraDo failed: %v", err)
	}

	// 1. Doanh thu tháng phải chính xác 800.000đ (KHÔNG bị nhân đôi thành 1.600.000đ!)
	dt, err := bcSvc.GetDoanhThuThang(int(time.Now().Month()), time.Now().Year())
	if err != nil {
		t.Fatalf("GetDoanhThuThang failed: %v", err)
	}
	if !dt.TongTien.Equal(decimal.NewFromInt(800000)) {
		t.Fatalf("expected TongTien=800000 (no double counting!), got %s", dt.TongTien)
	}
	if dt.SoPhieu != 1 || dt.SoSanPham != 2 {
		t.Fatalf("expected SoPhieu=1, SoSanPham=2, got %d, %d", dt.SoPhieu, dt.SoSanPham)
	}

	// 2. Hiệu quả sản phẩm: SP1 = 300k*2 + 20k = 620k; SP2 = 80k*2 + 20k = 180k; tổng = 800k!
	hq, err := bcSvc.GetHieuQuaSanPham()
	if err != nil {
		t.Fatalf("GetHieuQuaSanPham failed: %v", err)
	}
	if len(hq) != 2 {
		t.Fatalf("expected 2 items, got %d", len(hq))
	}
	if !hq[0].TongDoanhThu.Equal(decimal.NewFromInt(620000)) {
		t.Fatalf("expected SP1 revenue=620000, got %s", hq[0].TongDoanhThu)
	}
	if !hq[1].TongDoanhThu.Equal(decimal.NewFromInt(180000)) {
		t.Fatalf("expected SP2 revenue=180000, got %s", hq[1].TongDoanhThu)
	}

	// 3. Xuất Excel & CSV cho cả 4 loại
	for _, loai := range []string{"doanh_thu", "san_pham", "khach_hang", "phieu_thue"} {
		xlsxBytes, xlsxName, err := bcSvc.XuatExcel(loai, map[string]string{})
		if err != nil || len(xlsxBytes) == 0 || !strings.HasSuffix(xlsxName, ".xlsx") {
			t.Fatalf("XuatExcel(%s) failed: name=%s len=%d err=%v", loai, xlsxName, len(xlsxBytes), err)
		}
		if loai == "doanh_thu" && strings.Contains(xlsxName, "_0_0") {
			t.Fatalf("expected resolved month/year in filename, got %s", xlsxName)
		}

		csvBytes, csvName, err := bcSvc.XuatCSV(loai, map[string]string{})
		if err != nil || len(csvBytes) == 0 || !strings.HasSuffix(csvName, ".csv") {
			t.Fatalf("XuatCSV(%s) failed: name=%s len=%d err=%v", loai, csvName, len(csvBytes), err)
		}
		// Kiểm tra UTF-8 BOM
		if !bytes.HasPrefix(csvBytes, []byte{0xEF, 0xBB, 0xBF}) {
			t.Fatalf("XuatCSV(%s) missing UTF-8 BOM", loai)
		}
		if loai == "phieu_thue" && !strings.Contains(string(csvBytes), "Áo dài gấm đỏ") {
			t.Fatalf("XuatCSV(phieu_thue) missing product names column: %s", string(csvBytes))
		}
	}
}
