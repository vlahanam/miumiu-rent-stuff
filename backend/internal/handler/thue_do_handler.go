package handler

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/hub"
	"miumiu-rent-stuff/internal/middleware"
	"miumiu-rent-stuff/internal/model"
	"miumiu-rent-stuff/internal/service"

	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

type ThueDoHandler struct {
	db      *gorm.DB
	svc     *service.ThueDoService
	wsHub   *hub.Hub
}

func NewThueDoHandler(db *gorm.DB, wsHub *hub.Hub) *ThueDoHandler {
	return &ThueDoHandler{
		db:    db,
		svc:   service.NewThueDoService(db),
		wsHub: wsHub,
	}
}

// GET /api/v1/thue-do
// Query params: trang_thai, khach_hang_id, search (mã phiếu), page, limit
func (h *ThueDoHandler) GetAll(c *gin.Context) {
	var list []model.ThueDo
	q := h.db.Model(&model.ThueDo{}).Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham")

	// Kiểm tra + cập nhật quá hạn
	service.UpdateQuaHan(h.db)

	if tt := c.Query("trang_thai"); tt != "" {
		q = q.Where("trang_thai = ?", tt)
	}
	if khID := c.Query("khach_hang_id"); khID != "" {
		q = q.Where("khach_hang_id = ?", khID)
	}
	if search := c.Query("search"); search != "" {
		q = q.Where("ma_phieu_thue LIKE ?", "%"+search+"%")
	}

	// Sắp xếp: active trước (1,2,4), rồi mới đến 3,5
	orderBy := "CASE trang_thai WHEN 4 THEN 1 WHEN 2 THEN 2 WHEN 1 THEN 3 ELSE 4 END ASC, id DESC"

	result, err := common.Paginate(c, q, &list, orderBy)
	if err != nil {
		common.InternalError(c, "Không thể lấy danh sách phiếu thuê")
		return
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
// Quy tắc: Chờ xác nhận → sửa tự do (kể cả chi_tiet); Đang thuê → chỉ so_ngay_thue, tien_phat, ghi_chu
func (h *ThueDoHandler) Update(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		common.BadRequest(c, "ID không hợp lệ")
		return
	}

	var td model.ThueDo
	if err := h.db.Preload("ChiTiet").First(&td, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy phiếu thuê")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	// Phiếu Đã trả hoặc Đã hủy → không sửa
	if td.TrangThai == 3 || td.TrangThai == 5 {
		common.Forbidden(c, "Phiếu đã kết thúc, không thể sửa")
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

	err = h.db.Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{}

		if td.TrangThai == 1 {
			// Chờ xác nhận: sửa tự do
			if input.NgayBatDau != nil {
				updates["ngay_bat_dau"] = input.NgayBatDau
			}
			if input.LoaiCoc != nil {
				updates["loai_coc"] = *input.LoaiCoc
			}
			if input.TienCoc != nil {
				updates["tien_coc"] = *input.TienCoc
			}

			// Nếu có chi_tiet mới → replace toàn bộ
			if len(input.ChiTiet) > 0 {
				// Xóa chi tiết cũ
				if err := tx.Where("thue_do_id = ?", td.ID).Delete(&model.ChiTietThueDo{}).Error; err != nil {
					return err
				}

				// Lấy ngày bắt đầu và hẹn trả mới
				ngayBD := td.NgayBatDau
				if input.NgayBatDau != nil {
					ngayBD = input.NgayBatDau
				}
				soNgay := *td.SoNgayThue
				if input.SoNgayThue != nil {
					soNgay = *input.SoNgayThue
				}
				ngayHenTra := ngayBD.Add(time.Duration(soNgay) * 24 * time.Hour)
				updates["ngay_hen_tra"] = ngayHenTra
				updates["so_ngay_thue"] = soNgay

				phamTramCoc := h.svc.LayPhamTramCoc()
				var newChiTiet []model.ChiTietThueDo

				for _, ct := range input.ChiTiet {
					var sp model.SanPham
					if err := tx.First(&sp, ct.SanPhamID).Error; err != nil {
						return err
					}
					if sp.TrangThai == 3 {
						return errors.New("sản phẩm " + sp.TenSanPham + " đang bảo dưỡng")
					}
					svc := service.NewThueDoService(tx)
					if ngayBD != nil {
						if err := svc.KiemTraTrungLich(sp.ID, *ngayBD, ngayHenTra, td.ID); err != nil {
							return err
						}
					}
					tienCocSP := sp.GiaGocSanPham.Mul(phamTramCoc).Div(newDecimal(100))
					newChiTiet = append(newChiTiet, model.ChiTietThueDo{
						ThueDoID:    td.ID,
						SanPhamID:   sp.ID,
						GiaThueNgay: sp.GiaThueNgay,
						TienCoc:     tienCocSP,
					})
				}

				for i := range newChiTiet {
					if err := tx.Create(&newChiTiet[i]).Error; err != nil {
						return err
					}
				}

				// Tính lại tổng tiền
				tongTien := service.TinhTongTienThue(newChiTiet, soNgay)
				updates["tong_tien_thue"] = tongTien
			} else if input.SoNgayThue != nil {
				updates["so_ngay_thue"] = *input.SoNgayThue
				if td.NgayBatDau != nil {
					ngayHenTra := td.NgayBatDau.Add(time.Duration(*input.SoNgayThue) * 24 * time.Hour)
					updates["ngay_hen_tra"] = ngayHenTra
				}
				// Tính lại tổng tiền
				chiTiet := td.ChiTiet
				tongTien := service.TinhTongTienThue(chiTiet, *input.SoNgayThue)
				updates["tong_tien_thue"] = tongTien
			}
		} else if td.TrangThai == 2 || td.TrangThai == 4 {
			// Đang thuê / Quá hạn: chỉ sửa so_ngay_thue, tien_phat, ghi_chu
			if input.SoNgayThue != nil {
				updates["so_ngay_thue"] = *input.SoNgayThue
				if td.NgayBatDau != nil {
					ngayHenTra := td.NgayBatDau.Add(time.Duration(*input.SoNgayThue) * 24 * time.Hour)
					updates["ngay_hen_tra"] = ngayHenTra
					// Tính lại tổng tiền
					chiTiet := td.ChiTiet
					tongTien := service.TinhTongTienThue(chiTiet, *input.SoNgayThue)
					updates["tong_tien_thue"] = tongTien
				}
			}
			if input.TienPhat != nil {
				updates["tien_phat"] = *input.TienPhat
			}
		}

		if input.GhiChu != nil {
			updates["ghi_chu"] = *input.GhiChu
		}

		if input.NgayHenTra != nil && td.TrangThai == 1 {
			updates["ngay_hen_tra"] = input.NgayHenTra
		}

		if len(updates) > 0 {
			return tx.Model(&td).Updates(updates).Error
		}
		return nil
	})

	if err != nil {
		common.BadRequest(c, err.Error())
		return
	}

	h.db.Preload("KhachHang").Preload("ChiTiet").Preload("ChiTiet.SanPham").First(&td, id)
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

	td, err := h.svc.GiaoDo(uint(id))
	if err != nil {
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
		common.BadRequest(c, err.Error())
		return
	}

	if h.wsHub != nil {
		h.wsHub.Broadcast("phieu_cap_nhat", td)
	}
	common.OK(c, td)
}

// helper
func newDecimal(v int64) decimal.Decimal {
	return decimal.NewFromInt(v)
}
