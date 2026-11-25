package handler

import (
	"net/http"
	"strconv"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BaoCaoHandler struct {
	db  *gorm.DB
	svc *service.BaoCaoService
}

func NewBaoCaoHandler(db *gorm.DB) *BaoCaoHandler {
	return &BaoCaoHandler{db: db, svc: service.NewBaoCaoService(db)}
}

// GET /api/v1/bao-cao/doanh-thu?thang=11&nam=2026
func (h *BaoCaoHandler) GetDoanhThu(c *gin.Context) {
	thang, _ := strconv.Atoi(c.Query("thang"))
	nam, _ := strconv.Atoi(c.Query("nam"))
	result, err := h.svc.GetDoanhThuThang(thang, nam)
	if err != nil {
		common.InternalError(c, "Không thể lấy báo cáo doanh thu")
		return
	}
	common.OK(c, result)
}

// GET /api/v1/bao-cao/phieu-thue?trang_thai=&tu_ngay=&den_ngay=
func (h *BaoCaoHandler) GetPhieuThue(c *gin.Context) {
	service.UpdateQuaHan(h.db)

	var list []model.ThueDo
	q := h.db.Model(&model.ThueDo{}).Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham")

	if tt := c.Query("trang_thai"); tt != "" {
		q = q.Where("trang_thai = ?", tt)
	}
	q = service.ApplyDateRangeFilter(q, "ngay_tao", c.Query("tu_ngay"), c.Query("den_ngay"))

	result, err := common.Paginate(c, q, &list, "id DESC")
	if err != nil {
		common.InternalError(c, "Không thể lấy báo cáo phiếu thuê")
		return
	}
	if list == nil {
		list = []model.ThueDo{}
		result.Data = list
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/v1/bao-cao/hieu-qua-san-pham
func (h *BaoCaoHandler) GetHieuQuaSanPham(c *gin.Context) {
	result, err := h.svc.GetHieuQuaSanPham()
	if err != nil {
		common.InternalError(c, "Không thể lấy báo cáo hiệu quả sản phẩm")
		return
	}
	common.OK(c, result)
}

// GET /api/v1/bao-cao/khach-hang
func (h *BaoCaoHandler) GetKhachHang(c *gin.Context) {
	result, err := h.svc.GetKhachHangBaoCao()
	if err != nil {
		common.InternalError(c, "Không thể lấy báo cáo khách hàng")
		return
	}
	common.OK(c, result)
}

// GET /api/v1/bao-cao/xuat-excel?loai=doanh_thu&thang=11&nam=2026
func (h *BaoCaoHandler) XuatExcel(c *gin.Context) {
	loai := c.DefaultQuery("loai", "phieu_thue")
	params := map[string]string{
		"thang":      c.Query("thang"),
		"nam":        c.Query("nam"),
		"trang_thai": c.Query("trang_thai"),
		"tu_ngay":    c.Query("tu_ngay"),
		"den_ngay":   c.Query("den_ngay"),
	}

	data, filename, err := h.svc.XuatExcel(loai, params)
	if err != nil {
		common.InternalError(c, "Không thể xuất Excel")
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
	c.Data(http.StatusOK, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", data)
}

// GET /api/v1/bao-cao/xuat-csv?loai=san_pham
func (h *BaoCaoHandler) XuatCSV(c *gin.Context) {
	loai := c.DefaultQuery("loai", "phieu_thue")
	params := map[string]string{
		"thang":      c.Query("thang"),
		"nam":        c.Query("nam"),
		"trang_thai": c.Query("trang_thai"),
		"tu_ngay":    c.Query("tu_ngay"),
		"den_ngay":   c.Query("den_ngay"),
	}

	data, filename, err := h.svc.XuatCSV(loai, params)
	if err != nil {
		common.InternalError(c, "Không thể xuất CSV")
		return
	}

	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "text/csv; charset=utf-8", data)
}
