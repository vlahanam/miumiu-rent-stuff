package service

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strconv"
	"time"

	"miumiu-rent-stuff/internal/model"

	"github.com/shopspring/decimal"
	"github.com/xuri/excelize/v2"
	"gorm.io/gorm"
)

type BaoCaoService struct {
	db *gorm.DB
}

func NewBaoCaoService(db *gorm.DB) *BaoCaoService {
	return &BaoCaoService{db: db}
}

// DoanhThuThang - doanh thu theo tháng
type DoanhThuThang struct {
	Thang      int             `json:"thang"`
	Nam        int             `json:"nam"`
	TongTien   decimal.Decimal `json:"tong_tien"`
	SoPhieu    int64           `json:"so_phieu"`
	SoSanPham  int64           `json:"so_san_pham"`
}

func (s *BaoCaoService) GetDoanhThuThang(thang, nam int) (*DoanhThuThang, error) {
	if thang == 0 {
		thang = int(time.Now().Month())
	}
	if nam == 0 {
		nam = time.Now().Year()
	}

	start := time.Date(nam, time.Month(thang), 1, 0, 0, 0, 0, time.Local)
	end := start.AddDate(0, 1, 0)

	type Result struct {
		TongTien  float64
		SoPhieu   int64
		SoSanPham int64
	}
	var r Result

	s.db.Raw(`
		SELECT 
			COALESCE(SUM(td.tong_tien_thue + td.tien_phat), 0) as tong_tien,
			COUNT(DISTINCT td.id) as so_phieu,
			COUNT(ct.san_pham_id) as so_san_pham
		FROM thue_do td
		LEFT JOIN chi_tiet_thue_do ct ON ct.thue_do_id = td.id
		WHERE td.trang_thai = 3 AND td.ngay_tra_thuc_te >= ? AND td.ngay_tra_thuc_te < ?
	`, start, end).Scan(&r)

	return &DoanhThuThang{
		Thang:     thang,
		Nam:       nam,
		TongTien:  decimal.NewFromFloat(r.TongTien),
		SoPhieu:   r.SoPhieu,
		SoSanPham: r.SoSanPham,
	}, nil
}

// HieuQuaSanPham - hiệu quả từng sản phẩm
type HieuQuaSanPham struct {
	ID            uint            `json:"id"`
	MaSanPham     string          `json:"ma_san_pham"`
	TenSanPham    string          `json:"ten_san_pham"`
	GiaGoc        decimal.Decimal `json:"gia_goc_san_pham"`
	SoLanThue     int64           `json:"so_lan_thue"`
	TongDoanhThu  decimal.Decimal `json:"tong_doanh_thu"`
	DaThuHoiVon   bool            `json:"da_thu_hoi_von"`
}

func (s *BaoCaoService) GetHieuQuaSanPham() ([]HieuQuaSanPham, error) {
	type Row struct {
		ID           uint
		MaSanPham    string
		TenSanPham   string
		GiaGoc       float64
		SoLanThue    int64
		TongDoanhThu float64
	}

	var rows []Row
	s.db.Raw(`
		SELECT sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.gia_goc_san_pham as gia_goc,
		       COUNT(DISTINCT CASE WHEN td.trang_thai = 3 THEN td.id END) as so_lan_thue,
		       COALESCE(SUM(CASE WHEN td.trang_thai = 3 THEN (td.tong_tien_thue + td.tien_phat) / 
		           (SELECT COUNT(*) FROM chi_tiet_thue_do ct2 WHERE ct2.thue_do_id = td.id) ELSE 0 END), 0) as tong_doanh_thu
		FROM san_pham sp
		LEFT JOIN chi_tiet_thue_do ct ON ct.san_pham_id = sp.id
		LEFT JOIN thue_do td ON td.id = ct.thue_do_id
		GROUP BY sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.gia_goc_san_pham
		ORDER BY tong_doanh_thu DESC
	`).Scan(&rows)

	result := make([]HieuQuaSanPham, 0, len(rows))
	for _, r := range rows {
		dt := decimal.NewFromFloat(r.TongDoanhThu)
		giaGoc := decimal.NewFromFloat(r.GiaGoc)
		result = append(result, HieuQuaSanPham{
			ID:           r.ID,
			MaSanPham:    r.MaSanPham,
			TenSanPham:   r.TenSanPham,
			GiaGoc:       giaGoc,
			SoLanThue:    r.SoLanThue,
			TongDoanhThu: dt,
			DaThuHoiVon:  dt.GreaterThanOrEqual(giaGoc),
		})
	}
	return result, nil
}

// KhachHangBaoCao - báo cáo khách hàng
type KhachHangBaoCao struct {
	ID          uint   `json:"id"`
	Ten         string `json:"ten"`
	SoDienThoai string `json:"so_dien_thoai"`
	DiaChi      string `json:"dia_chi"`
	SoLanThue   int64  `json:"so_lan_thue"`
}

func (s *BaoCaoService) GetKhachHangBaoCao() ([]KhachHangBaoCao, error) {
	type Row struct {
		ID          uint
		Ten         string
		SoDienThoai string
		DiaChi      string
		SoLanThue   int64
	}
	var rows []Row
	s.db.Raw(`
		SELECT kh.id, kh.ten, kh.so_dien_thoai, COALESCE(kh.dia_chi, '') as dia_chi,
		       COUNT(DISTINCT CASE WHEN td.trang_thai = 3 THEN td.id END) as so_lan_thue
		FROM khach_hang kh
		LEFT JOIN thue_do td ON td.khach_hang_id = kh.id
		GROUP BY kh.id, kh.ten, kh.so_dien_thoai, kh.dia_chi
		ORDER BY so_lan_thue DESC
	`).Scan(&rows)

	result := make([]KhachHangBaoCao, 0, len(rows))
	for _, r := range rows {
		result = append(result, KhachHangBaoCao(r))
	}
	return result, nil
}

// XuatExcel xuất báo cáo dạng Excel
func (s *BaoCaoService) XuatExcel(loai string, params map[string]string) ([]byte, string, error) {
	f := excelize.NewFile()
	defer f.Close()

	var filename string
	switch loai {
	case "doanh_thu":
		filename = s.excelDoanhThu(f, params)
	case "san_pham":
		filename = s.excelSanPham(f)
	case "khach_hang":
		filename = s.excelKhachHang(f)
	default:
		filename = s.excelPhieuThue(f, params)
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", err
	}
	return buf.Bytes(), filename, nil
}

func (s *BaoCaoService) excelDoanhThu(f *excelize.File, params map[string]string) string {
	sheet := "Doanh thu"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"Tháng", "Năm", "Tổng tiền", "Số phiếu", "Số sản phẩm"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	thang, _ := strconv.Atoi(params["thang"])
	nam, _ := strconv.Atoi(params["nam"])
	dt, _ := s.GetDoanhThuThang(thang, nam)
	if dt != nil {
		row := []interface{}{dt.Thang, dt.Nam, dt.TongTien.InexactFloat64(), dt.SoPhieu, dt.SoSanPham}
		for i, v := range row {
			cell, _ := excelize.CoordinatesToCellName(i+1, 2)
			f.SetCellValue(sheet, cell, v)
		}
	}
	return fmt.Sprintf("doanh_thu_%d_%d.xlsx", thang, nam)
}

func (s *BaoCaoService) excelSanPham(f *excelize.File) string {
	sheet := "Hiệu quả sản phẩm"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"Mã SP", "Tên SP", "Giá gốc", "Số lần thuê", "Tổng doanh thu", "Đã thu hồi vốn"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}
	items, _ := s.GetHieuQuaSanPham()
	for ri, item := range items {
		row := []interface{}{item.MaSanPham, item.TenSanPham, item.GiaGoc.InexactFloat64(),
			item.SoLanThue, item.TongDoanhThu.InexactFloat64(), item.DaThuHoiVon}
		for ci, v := range row {
			cell, _ := excelize.CoordinatesToCellName(ci+1, ri+2)
			f.SetCellValue(sheet, cell, v)
		}
	}
	return "hieu_qua_san_pham.xlsx"
}

func (s *BaoCaoService) excelKhachHang(f *excelize.File) string {
	sheet := "Khách hàng"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"Tên", "Số điện thoại", "Địa chỉ", "Số lần thuê"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}
	items, _ := s.GetKhachHangBaoCao()
	for ri, item := range items {
		row := []interface{}{item.Ten, item.SoDienThoai, item.DiaChi, item.SoLanThue}
		for ci, v := range row {
			cell, _ := excelize.CoordinatesToCellName(ci+1, ri+2)
			f.SetCellValue(sheet, cell, v)
		}
	}
	return "danh_sach_khach_hang.xlsx"
}

func (s *BaoCaoService) excelPhieuThue(f *excelize.File, params map[string]string) string {
	sheet := "Phiếu thuê"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"Mã phiếu", "Khách hàng", "Ngày bắt đầu", "Ngày hẹn trả", "Ngày trả thực tế", "Tổng tiền", "Tiền cọc", "Tiền phạt", "Trạng thái"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
	}

	q := s.db.Model(&model.ThueDo{}).Preload("KhachHang")
	if tt := params["trang_thai"]; tt != "" {
		q = q.Where("trang_thai = ?", tt)
	}
	if tuNgay := params["tu_ngay"]; tuNgay != "" {
		q = q.Where("ngay_tao >= ?", tuNgay)
	}
	if denNgay := params["den_ngay"]; denNgay != "" {
		q = q.Where("ngay_tao <= ?", denNgay)
	}

	var list []model.ThueDo
	q.Order("id DESC").Find(&list)

	trangThaiText := map[uint8]string{1: "Chờ xác nhận", 2: "Đang thuê", 3: "Đã trả", 4: "Quá hạn", 5: "Đã hủy"}
	for ri, td := range list {
		tenKH := ""
		if td.KhachHang != nil {
			tenKH = td.KhachHang.Ten
		}
		ngayBD := ""
		if td.NgayBatDau != nil {
			ngayBD = td.NgayBatDau.Format("02/01/2006")
		}
		ngayHT := ""
		if td.NgayHenTra != nil {
			ngayHT = td.NgayHenTra.Format("02/01/2006")
		}
		ngayTra := ""
		if td.NgayTraThucTe != nil {
			ngayTra = td.NgayTraThucTe.Format("02/01/2006")
		}
		row := []interface{}{
			td.MaPhieuThue, tenKH, ngayBD, ngayHT, ngayTra,
			td.TongTienThue.InexactFloat64(),
			td.TienCoc.InexactFloat64(),
			td.TienPhat.InexactFloat64(),
			trangThaiText[td.TrangThai],
		}
		for ci, v := range row {
			cell, _ := excelize.CoordinatesToCellName(ci+1, ri+2)
			f.SetCellValue(sheet, cell, v)
		}
	}
	return "danh_sach_phieu_thue.xlsx"
}

// XuatCSV xuất báo cáo dạng CSV
func (s *BaoCaoService) XuatCSV(loai string, params map[string]string) ([]byte, string, error) {
	var buf bytes.Buffer
	w := csv.NewWriter(&buf)

	var filename string
	switch loai {
	case "san_pham":
		filename = "hieu_qua_san_pham.csv"
		w.Write([]string{"Mã SP", "Tên SP", "Giá gốc", "Số lần thuê", "Tổng doanh thu", "Đã thu hồi vốn"})
		items, _ := s.GetHieuQuaSanPham()
		for _, item := range items {
			daThuhoi := "Chưa"
			if item.DaThuHoiVon {
				daThuhoi = "Rồi"
			}
			w.Write([]string{item.MaSanPham, item.TenSanPham,
				item.GiaGoc.StringFixed(0), strconv.FormatInt(item.SoLanThue, 10),
				item.TongDoanhThu.StringFixed(0), daThuhoi})
		}
	case "khach_hang":
		filename = "danh_sach_khach_hang.csv"
		w.Write([]string{"Tên", "Số điện thoại", "Địa chỉ", "Số lần thuê"})
		items, _ := s.GetKhachHangBaoCao()
		for _, item := range items {
			w.Write([]string{item.Ten, item.SoDienThoai, item.DiaChi, strconv.FormatInt(item.SoLanThue, 10)})
		}
	default:
		filename = "danh_sach_phieu_thue.csv"
		w.Write([]string{"Mã phiếu", "Khách hàng", "Ngày bắt đầu", "Ngày hẹn trả", "Tổng tiền", "Trạng thái"})
		q := s.db.Model(&model.ThueDo{}).Preload("KhachHang")
		if tt := params["trang_thai"]; tt != "" {
			q = q.Where("trang_thai = ?", tt)
		}
		var list []model.ThueDo
		q.Order("id DESC").Find(&list)
		trangThaiText := map[uint8]string{1: "Chờ xác nhận", 2: "Đang thuê", 3: "Đã trả", 4: "Quá hạn", 5: "Đã hủy"}
		for _, td := range list {
			tenKH := ""
			if td.KhachHang != nil {
				tenKH = td.KhachHang.Ten
			}
			ngayBD := ""
			if td.NgayBatDau != nil {
				ngayBD = td.NgayBatDau.Format("02/01/2006")
			}
			ngayHT := ""
			if td.NgayHenTra != nil {
				ngayHT = td.NgayHenTra.Format("02/01/2006")
			}
			w.Write([]string{td.MaPhieuThue, tenKH, ngayBD, ngayHT,
				td.TongTienThue.StringFixed(0), trangThaiText[td.TrangThai]})
		}
	}

	w.Flush()
	return buf.Bytes(), filename, nil
}
