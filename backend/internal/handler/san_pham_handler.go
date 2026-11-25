package handler

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/database"
	"miumiu-rent-stuff/internal/hub"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type SanPhamHandler struct {
	db    *gorm.DB
	wsHub *hub.Hub
}

func NewSanPhamHandler(db *gorm.DB) *SanPhamHandler {
	return &SanPhamHandler{db: db}
}

func NewSanPhamHandlerWithHub(db *gorm.DB, wsHub *hub.Hub) *SanPhamHandler {
	return &SanPhamHandler{db: db, wsHub: wsHub}
}

// GET /api/v1/san-pham
// Query params: search, trang_thai, exclude_bao_duong, sort (gia_asc/gia_desc), page, limit
func (h *SanPhamHandler) GetAll(c *gin.Context) {
	var items []model.SanPham
	q := h.db.Model(&model.SanPham{})

	if tt := c.Query("trang_thai"); tt != "" {
		q = q.Where("trang_thai = ?", tt)
	}
	if c.Query("exclude_bao_duong") == "1" || c.Query("exclude_bao_duong") == "true" {
		q = q.Where("trang_thai != 3")
	}

	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		q = q.Where("ma_san_pham LIKE ? OR ten_san_pham LIKE ?", like, like)
	}

	sortOrder := "id DESC"
	switch c.Query("sort") {
	case "gia_asc":
		sortOrder = "gia_thue_ngay ASC, id DESC"
	case "gia_desc":
		sortOrder = "gia_thue_ngay DESC, id DESC"
	}

	result, err := common.Paginate(c, q, &items, sortOrder)
	if err != nil {
		common.InternalError(c, "Không thể lấy danh sách sản phẩm")
		return
	}
	if items == nil {
		items = []model.SanPham{}
		result.Data = items
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

	// Tính tổng doanh thu theo cùng công thức với BaoCaoService.GetHieuQuaSanPham
	type DoanhThu struct {
		Tong float64
	}
	var dt DoanhThu
	h.db.Raw(`
		SELECT COALESCE(SUM(
			(ct.gia_thue_ngay * COALESCE(td.so_ngay_thue, 1))
			+ ((td.tien_phat * 1.0) / NULLIF((SELECT COUNT(*) FROM chi_tiet_thue_do ct2 WHERE ct2.thue_do_id = td.id), 0))
		), 0) AS tong
		FROM thue_do td
		JOIN chi_tiet_thue_do ct ON ct.thue_do_id = td.id
		WHERE ct.san_pham_id = ? AND td.trang_thai = 3
	`, item.ID).Scan(&dt)

	// Lịch sử thuê
	type LichSuRaw struct {
		ThueDoID      uint    `json:"thue_do_id"`
		MaPhieuThue   string  `json:"ma_phieu_thue"`
		TenKhachHang  string  `json:"ten_khach_hang"`
		NgayBatDau    *string `json:"ngay_bat_dau"`
		NgayHenTra    *string `json:"ngay_hen_tra"`
		NgayTraThucTe *string `json:"ngay_tra_thuc_te"`
		TrangThai     uint8   `json:"trang_thai"`
	}
	lichSu := make([]LichSuRaw, 0)
	h.db.Raw(`
		SELECT td.id AS thue_do_id, td.ma_phieu_thue, kh.ten AS ten_khach_hang,
		       td.ngay_bat_dau, td.ngay_hen_tra, td.ngay_tra_thuc_te, td.trang_thai
		FROM thue_do td
		JOIN chi_tiet_thue_do ct ON ct.thue_do_id = td.id
		JOIN khach_hang kh ON kh.id = td.khach_hang_id
		WHERE ct.san_pham_id = ?
		ORDER BY td.id DESC
		LIMIT 50
	`, item.ID).Scan(&lichSu)

	tongDoanhThu := decimal.NewFromFloat(dt.Tong).Round(2)
	daThuHoiVon := tongDoanhThu.GreaterThanOrEqual(item.GiaGocSanPham) && (item.GiaGocSanPham.IsPositive() || tongDoanhThu.IsPositive())

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":               item.ID,
			"ma_san_pham":      item.MaSanPham,
			"ten_san_pham":     item.TenSanPham,
			"slug":             item.Slug,
			"hinh_anh":         item.HinhAnh,
			"gia_goc_san_pham": item.GiaGocSanPham,
			"gia_thue_ngay":    item.GiaThueNgay,
			"trang_thai":       item.TrangThai,
			"ngay_tao":         item.NgayTao,
			"ngay_cap_nhat":    item.NgayCapNhat,
			"so_lan_thue":      soLanThue,
			"tong_doanh_thu":   tongDoanhThu,
			"da_thu_hoi_von":   daThuHoiVon,
			"lich_su_thue":     lichSu,
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
	input.TenSanPham = strings.TrimSpace(input.TenSanPham)
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	const maxCreateRetries = 5
	for attempt := 0; attempt < maxCreateRetries; attempt++ {
		// Tự sinh mã SKU (prefix MIU-) và slug từ tên sản phẩm
		item := model.SanPham{
			MaSanPham:     service.GenerateMaSanPham(h.db),
			TenSanPham:    input.TenSanPham,
			Slug:          service.GenerateUniqueSlug(h.db, input.TenSanPham, 0),
			HinhAnh:       input.HinhAnh,
			GiaGocSanPham: input.GiaGocSanPham,
			GiaThueNgay:   input.GiaThueNgay,
			TrangThai:     1, // Mặc định: Trống lịch
		}

		if err := h.db.Create(&item).Error; err != nil {
			if database.IsDuplicateKeyError(err) {
				continue
			}
			common.InternalError(c, "Không thể tạo sản phẩm")
			return
		}
		common.Created(c, item)
		return
	}

	common.Conflict(c, "Hệ thống đang bận tạo mã sản phẩm, vui lòng thử lại")
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
	if input.MaSanPham != nil {
		trimmed := strings.TrimSpace(*input.MaSanPham)
		input.MaSanPham = &trimmed
	}
	if input.TenSanPham != nil {
		trimmed := strings.TrimSpace(*input.TenSanPham)
		input.TenSanPham = &trimmed
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

	if len(updates) > 0 {
		if err := h.db.Model(&item).Updates(updates).Error; err != nil {
			if database.IsDuplicateKeyError(err) {
				common.Conflict(c, "Mã sản phẩm đã tồn tại, vui lòng chọn mã khác")
				return
			}
			common.InternalError(c, "Không thể cập nhật sản phẩm")
			return
		}
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

	// Quy tắc: Đã cho thuê (2) không được đổi thủ công — phải trả đồ hoặc hủy phiếu
	if item.TrangThai == 2 && input.TrangThai != 2 {
		common.Conflict(c, "Sản phẩm đang được thuê, không thể đổi trạng thái thủ công. Vui lòng chờ khách trả đồ.")
		return
	}

	// Không cho gán thủ công sang Đã cho thuê (2)
	if input.TrangThai == 2 && item.TrangThai != 2 {
		common.Conflict(c, "Trạng thái 'Đã cho thuê' chỉ được cập nhật tự động khi giao đồ cho phiếu thuê.")
		return
	}

	if err := h.db.Model(&item).Update("trang_thai", input.TrangThai).Error; err != nil {
		common.InternalError(c, "Không thể cập nhật trạng thái sản phẩm")
		return
	}

	h.db.First(&item, id)
	if h.wsHub != nil {
		h.wsHub.Broadcast("san_pham_doi_trang_thai", gin.H{
			"id":         item.ID,
			"trang_thai": item.TrangThai,
		})
	}
	common.OK(c, item)
}
