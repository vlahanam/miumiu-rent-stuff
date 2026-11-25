package handler

import (
	"time"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type DashboardHandler struct {
	db *gorm.DB
}

func NewDashboardHandler(db *gorm.DB) *DashboardHandler {
	return &DashboardHandler{db: db}
}

// GET /api/v1/dashboard
func (h *DashboardHandler) GetDashboard(c *gin.Context) {
	// Cập nhật quá hạn trước
	service.UpdateQuaHan(h.db)

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	tomorrow := today.AddDate(0, 0, 1)
	dayAfterTomorrow := today.AddDate(0, 0, 2)

	// 1. Phiếu quá hạn (trang_thai = 4)
	phieuQuaHan := make([]model.ThueDo, 0)
	h.db.Where("trang_thai = 4").
		Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").
		Order("ngay_hen_tra ASC").
		Find(&phieuQuaHan)

	// 2. Phiếu cần trả hôm nay (Đang thuê, ngay_hen_tra trong hôm nay)
	phieuCanTraHomNay := make([]model.ThueDo, 0)
	h.db.Where("trang_thai = 2 AND ngay_hen_tra >= ? AND ngay_hen_tra < ?", today, tomorrow).
		Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").
		Order("ngay_hen_tra ASC").
		Find(&phieuCanTraHomNay)

	// 3. Phiếu đặt trước sắp đến (Chờ xác nhận, ngay_bat_dau trong hôm nay hoặc ngày mai)
	phieuDatTruocSapDen := make([]model.ThueDo, 0)
	h.db.Where("trang_thai = 1 AND ngay_bat_dau >= ? AND ngay_bat_dau < ?", today, dayAfterTomorrow).
		Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").
		Order("ngay_bat_dau ASC").
		Find(&phieuDatTruocSapDen)

	// 4. Số sản phẩm theo trạng thái
	var soSP struct {
		TrongLich    int64
		DaChoThue    int64
		DangBaoDuong int64
	}
	h.db.Model(&model.SanPham{}).Where("trang_thai = 1").Count(&soSP.TrongLich)
	h.db.Model(&model.SanPham{}).Where("trang_thai = 2").Count(&soSP.DaChoThue)
	h.db.Model(&model.SanPham{}).Where("trang_thai = 3").Count(&soSP.DangBaoDuong)

	// 5. Thống kê số lượng đơn theo trạng thái đang hoạt động
	var thongKePhieu struct {
		QuaHan     int64
		DangThue   int64
		ChoXacNhan int64
	}
	h.db.Model(&model.ThueDo{}).Where("trang_thai = 4").Count(&thongKePhieu.QuaHan)
	h.db.Model(&model.ThueDo{}).Where("trang_thai = 2").Count(&thongKePhieu.DangThue)
	h.db.Model(&model.ThueDo{}).Where("trang_thai = 1").Count(&thongKePhieu.ChoXacNhan)

	// 6. Doanh thu tháng này & tháng trước (phiếu Đã trả theo ngay_tra_thuc_te)
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	startOfNextMonth := startOfMonth.AddDate(0, 1, 0)
	startOfPrevMonth := startOfMonth.AddDate(0, -1, 0)

	type DoanhThuResult struct {
		Tong    float64
		SoPhieu int64
	}
	var dtNow, dtPrev DoanhThuResult
	h.db.Raw(`
		SELECT COALESCE(SUM(tong_tien_thue + tien_phat), 0) AS tong, COUNT(id) AS so_phieu
		FROM thue_do
		WHERE trang_thai = 3 AND ngay_tra_thuc_te >= ? AND ngay_tra_thuc_te < ?
	`, startOfMonth, startOfNextMonth).Scan(&dtNow)

	h.db.Raw(`
		SELECT COALESCE(SUM(tong_tien_thue + tien_phat), 0) AS tong, COUNT(id) AS so_phieu
		FROM thue_do
		WHERE trang_thai = 3 AND ngay_tra_thuc_te >= ? AND ngay_tra_thuc_te < ?
	`, startOfPrevMonth, startOfMonth).Scan(&dtPrev)

	common.OK(c, gin.H{
		"phieu_qua_han":           phieuQuaHan,
		"phieu_can_tra_hom_nay":   phieuCanTraHomNay,
		"phieu_dat_truoc_sap_den": phieuDatTruocSapDen,
		"so_san_pham": gin.H{
			"trong_lich":     soSP.TrongLich,
			"da_cho_thue":    soSP.DaChoThue,
			"dang_bao_duong": soSP.DangBaoDuong,
		},
		"thong_ke_phieu": gin.H{
			"qua_han":      thongKePhieu.QuaHan,
			"dang_thue":    thongKePhieu.DangThue,
			"cho_xac_nhan": thongKePhieu.ChoXacNhan,
		},
		"doanh_thu_thang_nay":     decimal.NewFromFloat(dtNow.Tong).Round(2),
		"doanh_thu_thang_truoc":   decimal.NewFromFloat(dtPrev.Tong).Round(2),
		"so_phieu_thang_nay":      dtNow.SoPhieu,
	})
}
