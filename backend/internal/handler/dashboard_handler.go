package handler

import (
	"time"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/service"

	"github.com/gin-gonic/gin"
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
	today := now.Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)
	dayAfterTomorrow := today.Add(48 * time.Hour)

	// 1. Phiếu quá hạn (trang_thai = 4)
	var phieuQuaHan []model.ThueDo
	h.db.Where("trang_thai = 4").
		Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").
		Order("ngay_hen_tra ASC").
		Find(&phieuQuaHan)

	// 2. Phiếu cần trả hôm nay (Đang thuê, ngay_hen_tra trong hôm nay)
	var phieuCanTraHomNay []model.ThueDo
	h.db.Where("trang_thai = 2 AND ngay_hen_tra >= ? AND ngay_hen_tra < ?", today, tomorrow).
		Preload("KhachHang").Preload("ChiTiet").
		Order("ngay_hen_tra ASC").
		Find(&phieuCanTraHomNay)

	// 3. Phiếu đặt trước sắp đến (Chờ xác nhận, ngay_bat_dau trong hôm nay hoặc ngày mai)
	var phieuDatTruocSapDen []model.ThueDo
	h.db.Where("trang_thai = 1 AND ngay_bat_dau >= ? AND ngay_bat_dau < ?", today, dayAfterTomorrow).
		Preload("KhachHang").Preload("ChiTiet").
		Order("ngay_bat_dau ASC").
		Find(&phieuDatTruocSapDen)

	// 4. Số sản phẩm theo trạng thái
	var soSP struct {
		TrongLich   int64
		DaChoThue   int64
		DangBaoDuong int64
	}
	h.db.Model(&model.SanPham{}).Where("trang_thai = 1").Count(&soSP.TrongLich)
	h.db.Model(&model.SanPham{}).Where("trang_thai = 2").Count(&soSP.DaChoThue)
	h.db.Model(&model.SanPham{}).Where("trang_thai = 3").Count(&soSP.DangBaoDuong)

	// 5. Doanh thu tháng này (phiếu Đã trả trong tháng hiện tại)
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	type DoanhThuResult struct {
		Tong float64
	}
	var dtResult DoanhThuResult
	h.db.Raw(`
		SELECT COALESCE(SUM(tong_tien_thue + tien_phat), 0) as tong
		FROM thue_do
		WHERE trang_thai = 3 AND ngay_tra_thuc_te >= ?
	`, startOfMonth).Scan(&dtResult)

	common.OK(c, gin.H{
		"phieu_qua_han":          phieuQuaHan,
		"phieu_can_tra_hom_nay":  phieuCanTraHomNay,
		"phieu_dat_truoc_sap_den": phieuDatTruocSapDen,
		"so_san_pham": gin.H{
			"trong_lich":    soSP.TrongLich,
			"da_cho_thue":   soSP.DaChoThue,
			"dang_bao_duong": soSP.DangBaoDuong,
		},
		"doanh_thu_thang_nay": dtResult.Tong,
	})
}
