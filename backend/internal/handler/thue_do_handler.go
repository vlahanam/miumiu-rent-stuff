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

type ThueDoHandler struct {
	db *gorm.DB
}

func NewThueDoHandler(db *gorm.DB) *ThueDoHandler {
	return &ThueDoHandler{db: db}
}

// GET /api/v1/thue-do
// Query params: trang_thai, khach_hang_id, page, limit
func (h *ThueDoHandler) GetAll(c *gin.Context) {
	var list []model.ThueDo
	q := h.db.Model(&model.ThueDo{}).Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham")

	if tt := c.Query("trang_thai"); tt != "" {
		q = q.Where("trang_thai = ?", tt)
	}
	if khID := c.Query("khach_hang_id"); khID != "" {
		q = q.Where("khach_hang_id = ?", khID)
	}

	result, err := pagination.Paginate(c, q, &list, "id DESC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể lấy danh sách phiếu thuê"})
		return
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/v1/thue-do/:id
func (h *ThueDoHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var td model.ThueDo
	if err := h.db.
		Preload("KhachHang").
		Preload("ChiTiet").
		Preload("ChiTiet.SanPham").
		First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy phiếu thuê"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": td})
}

// POST /api/v1/thue-do
func (h *ThueDoHandler) Create(c *gin.Context) {
	var input model.CreateThueDoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := input.Validate(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err})
		return
	}

	loaiCoc := input.LoaiCoc
	if loaiCoc == 0 {
		loaiCoc = 1
	}
	trangThai := input.TrangThai
	if trangThai == 0 {
		trangThai = 1
	}

	td := model.ThueDo{
		MaPhieuThue:  input.MaPhieuThue,
		KhachHangID:  input.KhachHangID,
		NguoiDungID:  input.NguoiDungID,
		NgayBatDau:   input.NgayBatDau,
		NgayHenTra:   input.NgayHenTra,
		SoNgayThue:   input.SoNgayThue,
		TongTienThue: input.TongTienThue,
		LoaiCoc:      loaiCoc,
		TienCoc:      input.TienCoc,
		TienPhat:     input.TienPhat,
		TrangThai:    trangThai,
		GhiChu:       input.GhiChu,
	}

	err := h.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&td).Error; err != nil {
			return err
		}

		for _, ct := range input.ChiTiet {
			chiTiet := model.ChiTietThueDo{
				ThueDoID:   td.ID,
				SanPhamID:  ct.SanPhamID,
				GiaThuNgay: ct.GiaThuNgay,
				TienCoc:    ct.TienCoc,
			}
			if err := tx.Create(&chiTiet).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể tạo phiếu thuê"})
		return
	}

	// Reload with associations
	h.db.Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").First(&td, td.ID)
	c.JSON(http.StatusCreated, gin.H{"data": td})
}

// PUT /api/v1/thue-do/:id
func (h *ThueDoHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var td model.ThueDo
	if err := h.db.First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy phiếu thuê"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}

	var input model.UpdateThueDoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := input.Validate(); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err})
		return
	}

	updates := map[string]interface{}{}
	if input.NgayBatDau != nil {
		updates["ngay_bat_dau"] = input.NgayBatDau
	}
	if input.NgayHenTra != nil {
		updates["ngay_hen_tra"] = input.NgayHenTra
	}
	if input.SoNgayThue != nil {
		updates["so_ngay_thue"] = *input.SoNgayThue
	}
	if input.NgayTraThucTe != nil {
		updates["ngay_tra_thuc_te"] = input.NgayTraThucTe
	}
	if input.TongTienThue != nil {
		updates["tong_tien_thue"] = *input.TongTienThue
	}
	if input.LoaiCoc != nil {
		updates["loai_coc"] = *input.LoaiCoc
	}
	if input.TienCoc != nil {
		updates["tien_coc"] = *input.TienCoc
	}
	if input.TienPhat != nil {
		updates["tien_phat"] = *input.TienPhat
	}
	if input.TrangThai != nil {
		updates["trang_thai"] = *input.TrangThai
	}
	if input.GhiChu != nil {
		updates["ghi_chu"] = *input.GhiChu
	}

	if err := h.db.Model(&td).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể cập nhật phiếu thuê"})
		return
	}

	h.db.Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").First(&td, td.ID)
	c.JSON(http.StatusOK, gin.H{"data": td})
}

// DELETE /api/v1/thue-do/:id
func (h *ThueDoHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID không hợp lệ"})
		return
	}

	var td model.ThueDo
	if err := h.db.First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "Không tìm thấy phiếu thuê"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Lỗi hệ thống"})
		return
	}

	// chi_tiet_thue_do sẽ bị xóa cascade theo FK
	if err := h.db.Delete(&td).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Không thể xóa phiếu thuê"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Xóa phiếu thuê thành công"})
}
