package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/database"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/service"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type KhachHangHandler struct {
	db *gorm.DB
}

func NewKhachHangHandler(db *gorm.DB) *KhachHangHandler {
	return &KhachHangHandler{db: db}
}

func normalizePhone(s string) string {
	return strings.ReplaceAll(strings.TrimSpace(s), " ", "")
}

// GET /api/v1/khach-hang
// Query params: search, filter (dang_thue|khach_moi), page, limit
func (h *KhachHangHandler) GetAll(c *gin.Context) {
	p := common.ParseParams(c)
	base := h.db.Model(&model.KhachHang{})

	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		normalized := "%" + normalizePhone(search) + "%"
		base = base.Where("ten LIKE ? OR so_dien_thoai LIKE ? OR so_dien_thoai LIKE ?", like, like, normalized)
	}

	switch c.Query("filter") {
	case "dang_thue":
		base = base.Where("EXISTS (SELECT 1 FROM thue_do td WHERE td.khach_hang_id = khach_hang.id AND td.trang_thai IN (1, 2, 4))")
	case "khach_moi":
		base = base.Where("NOT EXISTS (SELECT 1 FROM thue_do td WHERE td.khach_hang_id = khach_hang.id AND td.trang_thai = 3)")
	}

	var total int64
	if err := base.Count(&total).Error; err != nil {
		common.InternalError(c, "Không thể lấy danh sách khách hàng")
		return
	}

	list := make([]model.KhachHangListItem, 0)
	if err := base.
		Select(`khach_hang.*,
			(SELECT COUNT(*) FROM thue_do td WHERE td.khach_hang_id = khach_hang.id AND td.trang_thai = 3) AS so_lan_thue,
			(SELECT COUNT(*) FROM thue_do td WHERE td.khach_hang_id = khach_hang.id AND td.trang_thai IN (1, 2, 4)) AS so_phieu_dang_thue`).
		Order("khach_hang.id DESC").
		Offset(p.Offset).
		Limit(p.Limit).
		Find(&list).Error; err != nil {
		common.InternalError(c, "Không thể lấy danh sách khách hàng")
		return
	}

	c.JSON(http.StatusOK, common.Result{
		Data:  list,
		Total: total,
		Page:  p.Page,
		Limit: p.Limit,
	})
}

// GET /api/v1/khach-hang/:id
// Trả về chi tiết + lịch sử thuê
func (h *KhachHangHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	service.UpdateQuaHan(h.db)

	var kh model.KhachHang
	if err := h.db.First(&kh, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy khách hàng")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	// Lịch sử thuê - đang thuê, chờ xác nhận hoặc quá hạn (trang_thai IN 1,2,4)
	dangThue := make([]model.ThueDo, 0)
	h.db.Where("khach_hang_id = ? AND trang_thai IN (1, 2, 4)", kh.ID).
		Preload("ChiTiet").Preload("ChiTiet.SanPham").
		Order("id DESC").Find(&dangThue)

	// Lịch sử đã trả/hủy
	daKet := make([]model.ThueDo, 0)
	h.db.Where("khach_hang_id = ? AND trang_thai IN (3, 5)", kh.ID).
		Preload("ChiTiet").Preload("ChiTiet.SanPham").
		Order("id DESC").Limit(50).Find(&daKet)

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
	input.Ten = strings.TrimSpace(input.Ten)
	input.SoDienThoai = normalizePhone(input.SoDienThoai)
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
		if database.IsDuplicateKeyError(err) {
			common.Conflict(c, "Số điện thoại đã tồn tại trong danh sách khách hàng")
			return
		}
		common.InternalError(c, "Không thể tạo khách hàng")
		return
	}
	common.Created(c, kh)
}

// POST /api/v1/khach-hang/tim-theo-sdt
// Tìm khách theo SĐT; nếu chưa có thì tạo mới
func (h *KhachHangHandler) TimTheoSDT(c *gin.Context) {
	var input model.TimTheoSDTInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	input.SoDienThoai = normalizePhone(input.SoDienThoai)
	if input.Ten != nil {
		trimmed := strings.TrimSpace(*input.Ten)
		input.Ten = &trimmed
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
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
		if database.IsDuplicateKeyError(err) {
			common.Conflict(c, "Số điện thoại đã tồn tại")
			return
		}
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
	if input.Ten != nil {
		trimmed := strings.TrimSpace(*input.Ten)
		input.Ten = &trimmed
	}
	if input.SoDienThoai != nil {
		normalized := normalizePhone(*input.SoDienThoai)
		input.SoDienThoai = &normalized
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

	if len(updates) > 0 {
		if err := h.db.Model(&kh).Updates(updates).Error; err != nil {
			if database.IsDuplicateKeyError(err) {
				common.Conflict(c, "Số điện thoại đã được sử dụng bởi khách hàng khác")
				return
			}
			common.InternalError(c, "Không thể cập nhật khách hàng")
			return
		}
	}

	h.db.First(&kh, id)
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
