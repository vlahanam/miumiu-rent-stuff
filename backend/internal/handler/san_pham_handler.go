package handler

import (
	"errors"
	"net/http"
	"strconv"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/service"

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
// Query params: search, trang_thai, sort (gia_asc/gia_desc), page, limit
func (h *SanPhamHandler) GetAll(c *gin.Context) {
	var items []model.SanPham
	q := h.db.Model(&model.SanPham{})

	if tt := c.Query("trang_thai"); tt != "" {
		q = q.Where("trang_thai = ?", tt)
	}

	if search := c.Query("search"); search != "" {
		like := "%" + search + "%"
		q = q.Where("ma_san_pham LIKE ? OR ten_san_pham LIKE ?", like, like)
	}

	sortOrder := "id DESC"
	switch c.Query("sort") {
	case "gia_asc":
		sortOrder = "gia_thue_ngay ASC"
	case "gia_desc":
		sortOrder = "gia_thue_ngay DESC"
	}

	result, err := common.Paginate(c, q, &items, sortOrder)
	if err != nil {
		common.InternalError(c, "Không thể lấy danh sách sản phẩm")
		return
	}
	c.JSON(http.StatusOK, result)
}

// GET /api/v1/san-pham/:id
// Trả về chi tiết + lịch sử thuê + doanh thu
func (h *SanPhamHandler) GetByID(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var item model.SanPham
	if err := h.db.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy sản phẩm")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	// Đếm số lần thuê (phiếu Đã trả = 3)
	var soLanThue int64
	h.db.Model(&model.ChiTietThueDo{}).
		Joins("JOIN thue_do ON thue_do.id = chi_tiet_thue_do.thue_do_id").
		Where("chi_tiet_thue_do.san_pham_id = ? AND thue_do.trang_thai = 3", item.ID).
		Count(&soLanThue)

	// Tính tổng doanh thu (tổng tiền thuê + tiền phạt của các phiếu Đã trả có SP này)
	type DoanhThu struct {
		Tong float64
	}
	var dt DoanhThu
	h.db.Raw(`
		SELECT COALESCE(SUM(td.tong_tien_thue + td.tien_phat), 0) as tong
		FROM thue_do td
		JOIN chi_tiet_thue_do ct ON ct.thue_do_id = td.id
		WHERE ct.san_pham_id = ? AND td.trang_thai = 3
	`, item.ID).Scan(&dt)

	// Lịch sử thuê
	type LichSuRaw struct {
		MaPhieuThue  string     `json:"ma_phieu_thue"`
		TenKhachHang string     `json:"ten_khach_hang"`
		NgayBatDau   *string    `json:"ngay_bat_dau"`
		NgayHenTra   *string    `json:"ngay_hen_tra"`
		TrangThai    uint8      `json:"trang_thai"`
	}
	var lichSu []LichSuRaw
	h.db.Raw(`
		SELECT td.ma_phieu_thue, kh.ten as ten_khach_hang,
		       td.ngay_bat_dau, td.ngay_hen_tra, td.trang_thai
		FROM thue_do td
		JOIN chi_tiet_thue_do ct ON ct.thue_do_id = td.id
		JOIN khach_hang kh ON kh.id = td.khach_hang_id
		WHERE ct.san_pham_id = ?
		ORDER BY td.id DESC
		LIMIT 50
	`, item.ID).Scan(&lichSu)

	tongDoanhThu := item.GiaGocSanPham.InexactFloat64()
	daThuHoiVon := dt.Tong >= tongDoanhThu

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":              item.ID,
			"ma_san_pham":     item.MaSanPham,
			"ten_san_pham":    item.TenSanPham,
			"slug":            item.Slug,
			"hinh_anh":        item.HinhAnh,
			"gia_goc_san_pham": item.GiaGocSanPham,
			"gia_thue_ngay":   item.GiaThueNgay,
			"trang_thai":      item.TrangThai,
			"ngay_tao":        item.NgayTao,
			"ngay_cap_nhat":   item.NgayCapNhat,
			"so_lan_thue":     soLanThue,
			"tong_doanh_thu":  dt.Tong,
			"da_thu_hoi_von":  daThuHoiVon,
			"lich_su_thue":    lichSu,
		},
	})
}

// POST /api/v1/san-pham
func (h *SanPhamHandler) Create(c *gin.Context) {
	var input model.CreateSanPhamInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	// Tự sinh slug từ tên sản phẩm
	generatedSlug := service.GenerateUniqueSlug(h.db, input.TenSanPham, 0)

	item := model.SanPham{
		MaSanPham:     input.MaSanPham,
		TenSanPham:    input.TenSanPham,
		Slug:          generatedSlug,
		HinhAnh:       input.HinhAnh,
		GiaGocSanPham: input.GiaGocSanPham,
		GiaThueNgay:   input.GiaThueNgay,
		TrangThai:     1, // Mặc định: Trống lịch
	}

	if err := h.db.Create(&item).Error; err != nil {
		common.InternalError(c, "Không thể tạo sản phẩm")
		return
	}
	common.Created(c, item)
}

// PUT /api/v1/san-pham/:id
func (h *SanPhamHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var item model.SanPham
	if err := h.db.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy sản phẩm")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	var input model.UpdateSanPhamInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	// Kiểm tra nếu muốn sửa SKU: chặn nếu đã có phiếu thuê
	if input.MaSanPham != nil && *input.MaSanPham != item.MaSanPham {
		var countPhieu int64
		h.db.Model(&model.ChiTietThueDo{}).Where("san_pham_id = ?", item.ID).Count(&countPhieu)
		if countPhieu > 0 {
			common.Conflict(c, "Không thể sửa mã sản phẩm vì đã có phiếu thuê liên quan")
			return
		}
	}

	updates := map[string]interface{}{}
	if input.MaSanPham != nil {
		updates["ma_san_pham"] = *input.MaSanPham
	}
	if input.TenSanPham != nil {
		updates["ten_san_pham"] = *input.TenSanPham
		// Tự sinh slug mới từ tên mới
		updates["slug"] = service.GenerateUniqueSlug(h.db, *input.TenSanPham, item.ID)
	}
	if input.HinhAnh != nil {
		updates["hinh_anh"] = *input.HinhAnh
	}
	if input.GiaGocSanPham != nil {
		updates["gia_goc_san_pham"] = *input.GiaGocSanPham
	}
	if input.GiaThueNgay != nil {
		updates["gia_thue_ngay"] = *input.GiaThueNgay
	}

	if err := h.db.Model(&item).Updates(updates).Error; err != nil {
		common.InternalError(c, "Không thể cập nhật sản phẩm")
		return
	}
	h.db.First(&item, id)
	common.OK(c, item)
}

// DELETE /api/v1/san-pham/:id
func (h *SanPhamHandler) Delete(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var item model.SanPham
	if err := h.db.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy sản phẩm")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	// Kiểm tra có phiếu thuê không
	var countPhieu int64
	h.db.Model(&model.ChiTietThueDo{}).Where("san_pham_id = ?", item.ID).Count(&countPhieu)
	if countPhieu > 0 {
		common.Conflict(c, "Không thể xóa sản phẩm đã có phiếu thuê. Chuyển sang Đang bảo dưỡng để ngừng cho thuê.")
		return
	}

	if err := h.db.Delete(&item).Error; err != nil {
		common.InternalError(c, "Không thể xóa sản phẩm")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Xóa sản phẩm thành công"})
}

// PATCH /api/v1/san-pham/:id/trang-thai
func (h *SanPhamHandler) PatchTrangThai(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var item model.SanPham
	if err := h.db.First(&item, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy sản phẩm")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	var input model.PatchTrangThaiInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	// Quy tắc: Đã cho thuê (2) không được đổi sang Đang bảo dưỡng (3)
	if item.TrangThai == 2 && input.TrangThai == 3 {
		common.Conflict(c, "Sản phẩm đang được thuê, không thể chuyển sang Đang bảo dưỡng. Vui lòng chờ khách trả đồ.")
		return
	}

	if err := h.db.Model(&item).Update("trang_thai", input.TrangThai).Error; err != nil {
		common.InternalError(c, "Không thể cập nhật trạng thái sản phẩm")
		return
	}
	common.OK(c, item)
}


