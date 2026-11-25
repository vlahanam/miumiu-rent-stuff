package handler

import (
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/hub"
	"miumiu-rent-stuff/internal/middleware"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ThueDoHandler struct {
	db    *gorm.DB
	svc   *service.ThueDoService
	wsHub *hub.Hub
}

func NewThueDoHandler(db *gorm.DB, wsHub *hub.Hub) *ThueDoHandler {
	return &ThueDoHandler{
		db:    db,
		svc:   service.NewThueDoService(db),
		wsHub: wsHub,
	}
}

// GET /api/v1/thue-do
// Query params: trang_thai, khach_hang_id, search (mã phiếu, tên khách, SĐT), page, limit
func (h *ThueDoHandler) GetAll(c *gin.Context) {
	// Kiểm tra + cập nhật quá hạn trước khi truy vấn
	if affected, err := service.UpdateQuaHan(h.db); err == nil && affected > 0 && h.wsHub != nil {
		h.wsHub.Broadcast("phieu_qua_han", gin.H{"count": affected})
	}

	var list []model.ThueDo
	q := h.db.Model(&model.ThueDo{}).
		Preload("KhachHang").
		Preload("NguoiDung").
		Preload("ChiTiet").
		Preload("ChiTiet.SanPham")

	if tt := c.Query("trang_thai"); tt != "" {
		q = q.Where("thue_do.trang_thai = ?", tt)
	}
	if khID := c.Query("khach_hang_id"); khID != "" {
		q = q.Where("thue_do.khach_hang_id = ?", khID)
	}
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		normalizedPhone := "%" + strings.ReplaceAll(search, " ", "") + "%"
		q = q.Joins("LEFT JOIN khach_hang ON khach_hang.id = thue_do.khach_hang_id").
			Where("thue_do.ma_phieu_thue LIKE ? OR khach_hang.ten LIKE ? OR khach_hang.so_dien_thoai LIKE ?", like, like, normalizedPhone)
	}

	// Sắp xếp: ưu tiên Quá hạn (4) → Đang thuê (2) → Chờ xác nhận (1) → Đã trả/Đã hủy (3,5)
	orderBy := "CASE thue_do.trang_thai WHEN 4 THEN 1 WHEN 2 THEN 2 WHEN 1 THEN 3 ELSE 4 END ASC, thue_do.id DESC"

	result, err := common.Paginate(c, q, &list, orderBy)
	if err != nil {
		common.InternalError(c, "Không thể lấy danh sách phiếu thuê")
		return
	}
	if list == nil {
		list = []model.ThueDo{}
		result.Data = list
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/v1/thue-do/:id
func (h *ThueDoHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var td model.ThueDo
	if err := h.db.
		Preload("KhachHang").
		Preload("NguoiDung").
		Preload("ChiTiet").
		Preload("ChiTiet.SanPham").
		First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy phiếu thuê")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	// Kiểm tra quá hạn on-the-fly
	if td.TrangThai == 2 && td.NgayHenTra != nil && td.NgayHenTra.Before(time.Now()) {
		h.db.Model(&td).Update("trang_thai", 4)
		td.TrangThai = 4
		if h.wsHub != nil {
			h.wsHub.Broadcast("phieu_qua_han", gin.H{"ids": []uint{td.ID}})
		}
	}

	common.OK(c, td)
}

// POST /api/v1/thue-do
func (h *ThueDoHandler) Create(c *gin.Context) {
	var input model.CreateThueDoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	// Lấy user_id từ JWT context
	nguoiDungID := middleware.GetUserID(c)
	if nguoiDungID == 0 {
		common.Unauthorized(c, "Không xác định được người dùng")
		return
	}

	td, err := h.svc.TaoPhieu(input, nguoiDungID)
	if err != nil {
		if errors.Is(err, service.ErrKhachHangNotFound) {
			common.NotFound(c, err.Error())
			return
		}
		common.BadRequest(c, err.Error())
		return
	}

	// Push WS event
	if h.wsHub != nil {
		h.wsHub.Broadcast("phieu_moi", td)
	}

	common.Created(c, td)
}

// PUT /api/v1/thue-do/:id
// Quy tắc: Chờ xác nhận → sửa tự do (kể cả chi_tiet); Đang thuê/Quá hạn → chỉ so_ngay_thue, tien_phat, ghi_chu
func (h *ThueDoHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var input model.UpdateThueDoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	td, err := h.svc.CapNhatPhieu(uint(id), input)
	if err != nil {
		if errors.Is(err, service.ErrPhieuNotFound) {
			common.NotFound(c, "Không tìm thấy phiếu thuê")
			return
		}
		if errors.Is(err, service.ErrPhieuDaKetThuc) {
			common.Forbidden(c, "Phiếu đã kết thúc, không thể sửa")
			return
		}
		common.BadRequest(c, err.Error())
		return
	}

	if h.wsHub != nil {
		h.wsHub.Broadcast("phieu_cap_nhat", td)
	}
	common.OK(c, td)
}

// POST /api/v1/thue-do/:id/giao-do
func (h *ThueDoHandler) GiaoDo(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var input model.GiaoDoInput
	if c.Request.Body != nil {
		if err := c.ShouldBindJSON(&input); err != nil && !errors.Is(err, io.EOF) {
			common.BadRequest(c, err.Error())
			return
		}
		if err := input.Validate(); err != nil {
			common.ValidationError(c, err)
			return
		}
	}

	td, err := h.svc.GiaoDo(uint(id), &input)
	if err != nil {
		if errors.Is(err, service.ErrPhieuNotFound) {
			common.NotFound(c, "Không tìm thấy phiếu thuê")
			return
		}
		common.BadRequest(c, err.Error())
		return
	}

	if h.wsHub != nil {
		h.wsHub.Broadcast("phieu_cap_nhat", td)
	}
	common.OK(c, td)
}

// POST /api/v1/thue-do/:id/tra-do
func (h *ThueDoHandler) TraDo(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var input model.TraDoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	td, xuLyCoc, err := h.svc.TraDo(uint(id), input)
	if err != nil {
		if errors.Is(err, service.ErrPhieuNotFound) {
			common.NotFound(c, "Không tìm thấy phiếu thuê")
			return
		}
		common.BadRequest(c, err.Error())
		return
	}

	if h.wsHub != nil {
		h.wsHub.Broadcast("phieu_cap_nhat", td)
	}
	c.JSON(http.StatusOK, gin.H{"data": td, "xu_ly_coc": xuLyCoc})
}

// POST /api/v1/thue-do/:id/huy
func (h *ThueDoHandler) HuyPhieu(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var input model.HuyPhieuInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	td, err := h.svc.HuyPhieu(uint(id), input)
	if err != nil {
		if errors.Is(err, service.ErrPhieuNotFound) {
			common.NotFound(c, "Không tìm thấy phiếu thuê")
			return
		}
		common.BadRequest(c, err.Error())
		return
	}

	if h.wsHub != nil {
		h.wsHub.Broadcast("phieu_cap_nhat", td)
	}
	common.OK(c, td)
}
