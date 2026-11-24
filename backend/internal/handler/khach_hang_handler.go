package handler

import (
	"errors"
	"net/http"
	"strconv"

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

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := (page - 1) * limit

	var total int64
	q.Count(&total)

	if err := q.Offset(offset).Limit(limit).Order("id DESC").Find(&list).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy danh sách khách hàng"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": list, "total": total, "page": page, "limit": limit})
}

// GET /api/v1/khach-hang/:id
func (h *KhachHangHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var kh model.KhachHang
	if err := h.db.First(&kh, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khách hàng"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": kh})
}

// POST /api/v1/khach-hang
func (h *KhachHangHandler) Create(c *gin.Context) {
	var input model.CreateKhachHangInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := input.Validate(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err})
		return
	}

	kh := model.KhachHang{
		Ten:         input.Ten,
		SoDienThoai: input.SoDienThoai,
		DiaChi:      input.DiaChi,
	}

	if err := h.db.Create(&kh).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo khách hàng"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": kh})
}

// PUT /api/v1/khach-hang/:id
func (h *KhachHangHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var kh model.KhachHang
	if err := h.db.First(&kh, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khách hàng"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}

	var input model.UpdateKhachHangInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := input.Validate(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật khách hàng"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": kh})
}

// DELETE /api/v1/khach-hang/:id
func (h *KhachHangHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var kh model.KhachHang
	if err := h.db.First(&kh, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy khách hàng"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}

	if err := h.db.Delete(&kh).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể xóa khách hàng"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Xóa khách hàng thành công"})
}
