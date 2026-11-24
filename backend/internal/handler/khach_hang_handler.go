package handler

import (
	"errors"
	"net/http"
	"strconv"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type KhachHangHandler struct {
	db *gorm.DB
}

func NewKhachHangHandler(db *gorm.DB) *KhachHangHandler {
	return &KhachHangHandler{db: db}
}

// GET /api/v1/khach-hang
// Query params: search, page, limit
func (h *KhachHangHandler) GetAll(c *gin.Context) {
	var list []model.KhachHang
	q := h.db.Model(&model.KhachHang{})

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		q = q.Where("ten LIKE ? OR so_dien_thoai LIKE ?", like, like)
	}

	result, err := common.Paginate(c, q, &list, "id DESC")
	if err != nil {
		common.InternalError(c, "Không thể lấy danh sách khách hàng")
		return
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/v1/khach-hang/:id
// Trả về chi tiết + lịch sử thuê
func (h *KhachHangHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var kh model.KhachHang
	if err := h.db.First(&kh, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy khách hàng")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	// Lịch sử thuê - đang thuê hoặc quá hạn (trang_thai IN 1,2,4)
	var dangThue []model.ThueDo
	h.db.Where("khach_hang_id = ? AND trang_thai IN (1, 2, 4)", kh.ID).
		Preload("ChiTiet").Preload("ChiTiet.SanPham").
		Order("id DESC").Find(&dangThue)

	// Lịch sử đã trả/hủy
	var daKet []model.ThueDo
	h.db.Where("khach_hang_id = ? AND trang_thai IN (3, 5)", kh.ID).
		Preload("ChiTiet").Preload("ChiTiet.SanPham").
		Order("id DESC").Limit(20).Find(&daKet)

	// Đếm số lần thuê (Đã trả)
	var soLanThue int64
	h.db.Model(&model.ThueDo{}).Where("khach_hang_id = ? AND trang_thai = 3", kh.ID).Count(&soLanThue)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"khach_hang":  kh,
			"so_lan_thue": soLanThue,
			"dang_thue":   dangThue,
			"lich_su":     daKet,
		},
	})
}

// POST /api/v1/khach-hang
func (h *KhachHangHandler) Create(c *gin.Context) {
	var input model.CreateKhachHangInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	kh := model.KhachHang{
		Ten:         input.Ten,
		SoDienThoai: input.SoDienThoai,
		DiaChi:      input.DiaChi,
	}

	if err := h.db.Create(&kh).Error; err != nil {
		common.InternalError(c, "Không thể tạo khách hàng")
		return
	}
	common.Created(c, kh)
}

// POST /api/v1/khach-hang/tim-theo-sdt
// Tìm khách theo SĐT; nếu chưa có thì tạo mới
func (h *KhachHangHandler) TimTheoSDT(c *gin.Context) {
	var input struct {
		SoDienThoai string  `json:"so_dien_thoai" binding:"required"`
		Ten         *string `json:"ten"`
		DiaChi      *string `json:"dia_chi"`
	}
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}

	var kh model.KhachHang
	err := h.db.Where("so_dien_thoai = ?", input.SoDienThoai).First(&kh).Error

	if err == nil {
		// Đã có khách
		c.JSON(http.StatusOK, gin.H{"data": kh, "is_new": false})
		return
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	// Chưa có, tạo mới (cần có tên)
	if input.Ten == nil || *input.Ten == "" {
		common.BadRequest(c, "Khách hàng mới cần có tên")
		return
	}

	kh = model.KhachHang{
		SoDienThoai: input.SoDienThoai,
		Ten:         *input.Ten,
		DiaChi:      input.DiaChi,
	}
	if err := h.db.Create(&kh).Error; err != nil {
		common.InternalError(c, "Không thể tạo khách hàng mới")
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": kh, "is_new": true})
}

// PUT /api/v1/khach-hang/:id
func (h *KhachHangHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var kh model.KhachHang
	if err := h.db.First(&kh, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy khách hàng")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	var input model.UpdateKhachHangInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	updates := map[string]interface{}{}
	if input.Ten != nil {
		updates["ten"] = *input.Ten
	}
	if input.SoDienThoai != nil {
		updates["so_dien_thoai"] = *input.SoDienThoai
	}
	if input.DiaChi != nil {
		updates["dia_chi"] = *input.DiaChi
	}

	if err := h.db.Model(&kh).Updates(updates).Error; err != nil {
		common.InternalError(c, "Không thể cập nhật khách hàng")
		return
	}
	common.OK(c, kh)
}

// DELETE /api/v1/khach-hang/:id
func (h *KhachHangHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var kh model.KhachHang
	if err := h.db.First(&kh, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy khách hàng")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	// Kiểm tra có phiếu thuê không
	var countPhieu int64
	h.db.Model(&model.ThueDo{}).Where("khach_hang_id = ?", kh.ID).Count(&countPhieu)
	if countPhieu > 0 {
		common.Conflict(c, "Không thể xóa khách hàng đã có phiếu thuê. Giữ lại để bảo toàn lịch sử.")
		return
	}

	if err := h.db.Delete(&kh).Error; err != nil {
		common.InternalError(c, "Không thể xóa khách hàng")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Xóa khách hàng thành công"})
}
