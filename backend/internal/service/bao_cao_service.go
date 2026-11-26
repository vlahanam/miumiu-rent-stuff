package service

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"strconv"
	"strings"
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
	Thang     int             `json:"thang"`
	Nam       int             `json:"nam"`
	TongTien  decimal.Decimal `json:"tong_tien"`
	SoPhieu   int64           `json:"so_phieu"`
	SoSanPham int64           `json:"so_san_pham"`
}

func (s *BaoCaoService) GetDoanhThuThang(thang, nam int) (*DoanhThuThang, error) {
	now := time.Now()
	if thang < 1 || thang > 12 {
		thang = int(now.Month())
	}
	if nam <= 0 {
		nam = now.Year()
	}

	start := time.Date(nam, time.Month(thang), 1, 0, 0, 0, 0, now.Location())
	end := start.AddDate(0, 1, 0)

	// Tính tổng tiền và số phiếu trực tiếp trên bảng thue_do (tránh nhân bản dòng khi JOIN chi_tiet)
	type OrderAgg struct {
		TongTien float64
		SoPhieu  int64
	}
	var orderAgg OrderAgg
	if err := s.db.Raw(`
		SELECT
			COALESCE(SUM(tong_tien_thue + tien_phat), 0) AS tong_tien,
			COUNT(id) AS so_phieu
		FROM thue_do
		WHERE trang_thai = 3 AND ngay_tra_thuc_te >= ? AND ngay_tra_thuc_te < ?
	`, start, end).Scan(&orderAgg).Error; err != nil {
		return nil, err
	}

	// Đếm tổng lượt sản phẩm cho thuê trong các phiếu Đã trả của tháng
	var soSanPham int64
	if err := s.db.Raw(`
		SELECT COUNT(ct.id)
		FROM chi_tiet_thue_do ct
		JOIN thue_do td ON td.id = ct.thue_do_id
		WHERE td.trang_thai = 3 AND td.ngay_tra_thuc_te >= ? AND td.ngay_tra_thuc_te < ?
	`, start, end).Scan(&soSanPham).Error; err != nil {
		return nil, err
	}

	return &DoanhThuThang{
		Thang:     thang,
		Nam:       nam,
		TongTien:  decimal.NewFromFloat(orderAgg.TongTien).Round(2),
		SoPhieu:   orderAgg.SoPhieu,
		SoSanPham: soSanPham,
	}, nil
}

// HieuQuaSanPham - hiệu quả từng sản phẩm
type HieuQuaSanPham struct {
	ID           uint            `json:"id"`
	MaSanPham    string          `json:"ma_san_pham"`
	TenSanPham   string          `json:"ten_san_pham"`
	GiaGoc       decimal.Decimal `json:"gia_goc_san_pham"`
	SoLanThue    int64           `json:"so_lan_thue"`
	TongDoanhThu decimal.Decimal `json:"tong_doanh_thu"`
	DaThuHoiVon  bool            `json:"da_thu_hoi_von"`
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
	// Công thức thống nhất với SanPhamHandler.GetByID:
	// doanh thu SP = gia_thue_ngay_snapshot * so_ngay_thue + (tien_phat / số SP trong phiếu)
	if err := s.db.Raw(`
		SELECT sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.gia_goc_san_pham AS gia_goc,
		       COUNT(DISTINCT CASE WHEN td.trang_thai = 3 THEN td.id END) AS so_lan_thue,
		       COALESCE(SUM(CASE WHEN td.trang_thai = 3 THEN
		           (ct.gia_thue_ngay * COALESCE(td.so_ngay_thue, 1))
		           + ((td.tien_phat * 1.0) / NULLIF((SELECT COUNT(*) FROM chi_tiet_thue_do ct2 WHERE ct2.thue_do_id = td.id), 0))
		       ELSE 0 END), 0) AS tong_doanh_thu
		FROM san_pham sp
		LEFT JOIN chi_tiet_thue_do ct ON ct.san_pham_id = sp.id
		LEFT JOIN thue_do td ON td.id = ct.thue_do_id
		GROUP BY sp.id, sp.ma_san_pham, sp.ten_san_pham, sp.gia_goc_san_pham
		ORDER BY tong_doanh_thu DESC, so_lan_thue DESC, sp.id DESC
	`).Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]HieuQuaSanPham, 0, len(rows))
	for _, r := range rows {
		dt := decimal.NewFromFloat(r.TongDoanhThu).Round(2)
		giaGoc := decimal.NewFromFloat(r.GiaGoc).Round(2)
		daThuHoiVon := dt.GreaterThanOrEqual(giaGoc) && (giaGoc.IsPositive() || dt.IsPositive())
		result = append(result, HieuQuaSanPham{
			ID:           r.ID,
			MaSanPham:    r.MaSanPham,
			TenSanPham:   r.TenSanPham,
			GiaGoc:       giaGoc,
			SoLanThue:    r.SoLanThue,
			TongDoanhThu: dt,
			DaThuHoiVon:  daThuHoiVon,
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
	if err := s.db.Raw(`
		SELECT kh.id, kh.ten, kh.so_dien_thoai, COALESCE(kh.dia_chi, '') AS dia_chi,
		       COUNT(DISTINCT CASE WHEN td.trang_thai = 3 THEN td.id END) AS so_lan_thue
		FROM khach_hang kh
		LEFT JOIN thue_do td ON td.khach_hang_id = kh.id
		GROUP BY kh.id, kh.ten, kh.so_dien_thoai, kh.dia_chi
		ORDER BY so_lan_thue DESC, kh.id DESC
	`).Scan(&rows).Error; err != nil {
		return nil, err
	}

	result := make([]KhachHangBaoCao, 0, len(rows))
	for _, r := range rows {
		result = append(result, KhachHangBaoCao(r))
	}
	return result, nil
}

// ApplyDateRangeFilter áp dụng tu_ngay / den_ngay lên query cột ngay_tao (bao gồm trọn ngày den_ngay)
func ApplyDateRangeFilter(q *gorm.DB, column, tuNgay, denNgay string) *gorm.DB {
	if tuNgay != "" {
		q = q.Where(column+" >= ?", tuNgay)
	}
	if denNgay != "" {
		if len(denNgay) == 10 {
			denNgay = denNgay + " 23:59:59"
		}
		q = q.Where(column+" <= ?", denNgay)
	}
	return q
}

func formatSanPhamNames(chiTiet []model.ChiTietThueDo) string {
	if len(chiTiet) == 0 {
		return ""
	}
	names := make([]string, 0, len(chiTiet))
	for _, ct := range chiTiet {
		if ct.SanPham != nil {
			names = append(names, fmt.Sprintf("%s (%s)", ct.SanPham.TenSanPham, ct.SanPham.MaSanPham))
		} else {
			names = append(names, fmt.Sprintf("SP#%d", ct.SanPhamID))
		}
	}
	return strings.Join(names, ", ")
}

func (s *BaoCaoService) queryPhieuThue(params map[string]string) ([]model.ThueDo, error) {
	q := s.db.Model(&model.ThueDo{}).
		Preload("KhachHang").
		Preload("ChiTiet").
		Preload("ChiTiet.SanPham")

	if tt := params["trang_thai"]; tt != "" {
		q = q.Where("trang_thai = ?", tt)
	}
	q = ApplyDateRangeFilter(q, "ngay_tao", params["tu_ngay"], params["den_ngay"])

	var list []model.ThueDo
	if err := q.Order("id DESC").Find(&list).Error; err != nil {
		return nil, err
	}
	return list, nil
}

// XuatExcel xuất báo cáo dạng Excel
func (s *BaoCaoService) XuatExcel(loai string, params map[string]string) ([]byte, string, error) {
	f := excelize.NewFile()
	defer f.Close()

	headerStyle, _ := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{Bold: true},
	})

	var (
		filename string
		err      error
	)
	switch loai {
	case "doanh_thu":
		filename, err = s.excelDoanhThu(f, headerStyle, params)
	case "san_pham":
		filename, err = s.excelSanPham(f, headerStyle)
	case "khach_hang":
		filename, err = s.excelKhachHang(f, headerStyle)
	default:
		filename, err = s.excelPhieuThue(f, headerStyle, params)
	}
	if err != nil {
		return nil, "", err
	}

	buf, err := f.WriteToBuffer()
	if err != nil {
		return nil, "", err
	}
	return buf.Bytes(), filename, nil
}

func (s *BaoCaoService) excelDoanhThu(f *excelize.File, headerStyle int, params map[string]string) (string, error) {
	sheet := "Doanh thu"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"Tháng", "Năm", "Tổng doanh thu (VND)", "Số phiếu đã trả", "Số lượt sản phẩm"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	thang, _ := strconv.Atoi(params["thang"])
	nam, _ := strconv.Atoi(params["nam"])
	dt, err := s.GetDoanhThuThang(thang, nam)
	if err != nil {
		return "", err
	}

	row := []interface{}{dt.Thang, dt.Nam, dt.TongTien.InexactFloat64(), dt.SoPhieu, dt.SoSanPham}
	for i, v := range row {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(sheet, cell, v)
	}
	return fmt.Sprintf("doanh_thu_%02d_%d.xlsx", dt.Thang, dt.Nam), nil
}

func (s *BaoCaoService) excelSanPham(f *excelize.File, headerStyle int) (string, error) {
	sheet := "Hiệu quả sản phẩm"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"Mã SP", "Tên sản phẩm", "Giá gốc (VND)", "Số lần thuê", "Tổng doanh thu (VND)", "Đã thu hồi vốn"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}
	items, err := s.GetHieuQuaSanPham()
	if err != nil {
		return "", err
	}
	for ri, item := range items {
		daThuHoi := "Chưa"
		if item.DaThuHoiVon {
			daThuHoi = "Đã thu hồi"
		}
		row := []interface{}{
			item.MaSanPham, item.TenSanPham, item.GiaGoc.InexactFloat64(),
			item.SoLanThue, item.TongDoanhThu.InexactFloat64(), daThuHoi,
		}
		for ci, v := range row {
			cell, _ := excelize.CoordinatesToCellName(ci+1, ri+2)
			f.SetCellValue(sheet, cell, v)
		}
	}
	return "hieu_qua_san_pham.xlsx", nil
}

func (s *BaoCaoService) excelKhachHang(f *excelize.File, headerStyle int) (string, error) {
	sheet := "Khách hàng"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"Tên khách hàng", "Số điện thoại", "Địa chỉ", "Số lần thuê"}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}
	items, err := s.GetKhachHangBaoCao()
	if err != nil {
		return "", err
	}
	for ri, item := range items {
		row := []interface{}{item.Ten, item.SoDienThoai, item.DiaChi, item.SoLanThue}
		for ci, v := range row {
			cell, _ := excelize.CoordinatesToCellName(ci+1, ri+2)
			f.SetCellValue(sheet, cell, v)
		}
	}
	return "danh_sach_khach_hang.xlsx", nil
}

func (s *BaoCaoService) excelPhieuThue(f *excelize.File, headerStyle int, params map[string]string) (string, error) {
	sheet := "Phiếu thuê"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{
		"Mã phiếu", "Khách hàng", "Sản phẩm",
		"Ngày bắt đầu", "Ngày hẹn trả", "Ngày trả thực tế",
		"Tiền thuê (VND)", "Tiền ship (VND)", "Tiền cọc (VND)", "Tiền phạt (VND)", "Trạng thái",
	}
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	list, err := s.queryPhieuThue(params)
	if err != nil {
		return "", err
	}

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
			td.MaPhieuThue, tenKH, formatSanPhamNames(td.ChiTiet),
			ngayBD, ngayHT, ngayTra,
			td.TongTienThue.InexactFloat64(),
			td.TienShip.InexactFloat64(),
			td.TienCoc.InexactFloat64(),
			td.TienPhat.InexactFloat64(),
			trangThaiText[td.TrangThai],
		}
		for ci, v := range row {
			cell, _ := excelize.CoordinatesToCellName(ci+1, ri+2)
			f.SetCellValue(sheet, cell, v)
		}
	}
	return "danh_sach_phieu_thue.xlsx", nil
}

// XuatCSV xuất báo cáo dạng CSV (kèm UTF-8 BOM để mở tiếng Việt chuẩn trong Excel)
func (s *BaoCaoService) XuatCSV(loai string, params map[string]string) ([]byte, string, error) {
	var buf bytes.Buffer
	// UTF-8 BOM cho Excel hiển thị tiếng Việt có dấu
	buf.Write([]byte{0xEF, 0xBB, 0xBF})
	w := csv.NewWriter(&buf)

	var filename string
	switch loai {
	case "doanh_thu":
		thang, _ := strconv.Atoi(params["thang"])
		nam, _ := strconv.Atoi(params["nam"])
		dt, err := s.GetDoanhThuThang(thang, nam)
		if err != nil {
			return nil, "", err
		}
		filename = fmt.Sprintf("doanh_thu_%02d_%d.csv", dt.Thang, dt.Nam)
		_ = w.Write([]string{"Tháng", "Năm", "Tổng doanh thu (VND)", "Số phiếu đã trả", "Số lượt sản phẩm"})
		_ = w.Write([]string{
			strconv.Itoa(dt.Thang),
			strconv.Itoa(dt.Nam),
			dt.TongTien.StringFixed(0),
			strconv.FormatInt(dt.SoPhieu, 10),
			strconv.FormatInt(dt.SoSanPham, 10),
		})
	case "san_pham":
		filename = "hieu_qua_san_pham.csv"
		_ = w.Write([]string{"Mã SP", "Tên sản phẩm", "Giá gốc (VND)", "Số lần thuê", "Tổng doanh thu (VND)", "Đã thu hồi vốn"})
		items, err := s.GetHieuQuaSanPham()
		if err != nil {
			return nil, "", err
		}
		for _, item := range items {
			daThuhoi := "Chưa"
			if item.DaThuHoiVon {
				daThuhoi = "Đã thu hồi"
			}
			_ = w.Write([]string{
				item.MaSanPham, item.TenSanPham,
				item.GiaGoc.StringFixed(0), strconv.FormatInt(item.SoLanThue, 10),
				item.TongDoanhThu.StringFixed(0), daThuhoi,
			})
		}
	case "khach_hang":
		filename = "danh_sach_khach_hang.csv"
		_ = w.Write([]string{"Tên khách hàng", "Số điện thoại", "Địa chỉ", "Số lần thuê"})
		items, err := s.GetKhachHangBaoCao()
		if err != nil {
			return nil, "", err
		}
		for _, item := range items {
			_ = w.Write([]string{item.Ten, item.SoDienThoai, item.DiaChi, strconv.FormatInt(item.SoLanThue, 10)})
		}
	default:
		filename = "danh_sach_phieu_thue.csv"
		_ = w.Write([]string{
			"Mã phiếu", "Khách hàng", "Sản phẩm",
			"Ngày bắt đầu", "Ngày hẹn trả", "Ngày trả thực tế",
			"Tiền thuê (VND)", "Tiền ship (VND)", "Tiền cọc (VND)", "Tiền phạt (VND)", "Trạng thái",
		})
		list, err := s.queryPhieuThue(params)
		if err != nil {
			return nil, "", err
		}
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
			ngayTra := ""
			if td.NgayTraThucTe != nil {
				ngayTra = td.NgayTraThucTe.Format("02/01/2006")
			}
			_ = w.Write([]string{
				td.MaPhieuThue, tenKH, formatSanPhamNames(td.ChiTiet),
				ngayBD, ngayHT, ngayTra,
				td.TongTienThue.StringFixed(0),
				td.TienShip.StringFixed(0),
				td.TienCoc.StringFixed(0),
				td.TienPhat.StringFixed(0),
				trangThaiText[td.TrangThai],
			})
		}
	}

	w.Flush()
	if err := w.Error(); err != nil {
		return nil, "", err
	}
	return buf.Bytes(), filename, nil
}
