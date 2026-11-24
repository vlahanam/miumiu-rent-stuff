package handler

import (
	"errors"
	"net/http"
	"strconv"

	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/common"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)
type SanPhamHandler struct {
	db *gorm.DB
}

func NewSanPhamHandler(db *gorm.DB) *SanPhamHandler {
	return &SanPhamHandler{db: db}
}

// GET /api/v1/san-pham
// Query params: trang_thai, page, limit
func (h *SanPhamHandler) GetAll(c *gin.Context) {
	var items []model.SanPham
	q := h.db.Model(&model.SanPham{})

	if tt := c.Query("trang_thai"); tt != "" {
		q = q.Where("trang_thai = ?", tt)
	}

	result, err := pagination.Paginate(c, q, &items, "id DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy danh sách sản phẩm"})
		return
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/v1/san-pham/:id
func (h *SanPhamHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var item model.SanPham
	if err := h.db.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy sản phẩm"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

// POST /api/v1/san-pham
func (h *SanPhamHandler) Create(c *gin.Context) {
	var input model.CreateSanPhamInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := input.Validate(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err})
		return
	}

	trangThai := input.TrangThai
	if trangThai == 0 {
		trangThai = 1
	}

	item := model.SanPham{
		MaSanPham:     input.MaSanPham,
		TenSanPham:    input.TenSanPham,
		Slug:          input.Slug,
		HinhAnh:       input.HinhAnh,
		GiaGocSanPham: input.GiaGocSanPham,
		GiaThuNgay:    input.GiaThuNgay,
		TrangThai:     trangThai,
	}

	if err := h.db.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo sản phẩm"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": item})
}

// PUT /api/v1/san-pham/:id
func (h *SanPhamHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var item model.SanPham
	if err := h.db.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy sản phẩm"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}

	var input model.UpdateSanPhamInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := input.Validate(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err})
		return
	}

	updates := map[string]interface{}{}
	if input.MaSanPham != nil {
		updates["ma_san_pham"] = *input.MaSanPham
	}
	if input.TenSanPham != nil {
		updates["ten_san_pham"] = *input.TenSanPham
	}
	if input.Slug != nil {
		updates["slug"] = *input.Slug
	}
	if input.HinhAnh != nil {
		updates["hinh_anh"] = *input.HinhAnh
	}
	if input.GiaGocSanPham != nil {
		updates["gia_goc_san_pham"] = *input.GiaGocSanPham
	}
	if input.GiaThuNgay != nil {
		updates["gia_thue_ngay"] = *input.GiaThuNgay
	}
	if input.TrangThai != nil {
		updates["trang_thai"] = *input.TrangThai
	}

	if err := h.db.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật sản phẩm"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

// DELETE /api/v1/san-pham/:id
func (h *SanPhamHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var item model.SanPham
	if err := h.db.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy sản phẩm"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}

	if err := h.db.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể xóa sản phẩm"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Xóa sản phẩm thành công"})
}
