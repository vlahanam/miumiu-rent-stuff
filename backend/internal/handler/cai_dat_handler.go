package handler

import (
	"encoding/json"
	"errors"
	"strconv"
	"strings"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/model"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CaiDatHandler struct {
	db *gorm.DB
}

func NewCaiDatHandler(db *gorm.DB) *CaiDatHandler {
	return &CaiDatHandler{db: db}
}

// GET /api/v1/cai-dat
func (h *CaiDatHandler) GetAll(c *gin.Context) {
	list := make([]model.CaiDat, 0)
	if err := h.db.Order("id ASC").Find(&list).Error; err != nil {
		common.InternalError(c, "Không thể lấy danh sách cài đặt")
		return
	}
	common.OK(c, list)
}

// PUT /api/v1/cai-dat/:khoa
func (h *CaiDatHandler) UpdateByKhoa(c *gin.Context) {
	khoa := strings.TrimSpace(c.Param("khoa"))
	if khoa == "" {
		common.BadRequest(c, "Khóa cài đặt không được để trống")
		return
	}

	var cd model.CaiDat
	if err := h.db.Where("khoa = ?", khoa).First(&cd).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy cài đặt với khóa: "+khoa)
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	var input model.UpdateCaiDatInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	val := strings.TrimSpace(*input.GiaTri)

	// Validate theo kiểu dữ liệu và khóa đặc thù
	switch cd.KieuDuLieu {
	case 2: // Số
		num, err := strconv.ParseFloat(val, 64)
		if err != nil {
			common.BadRequest(c, "Giá trị cài đặt phải là số hợp lệ")
			return
		}
		if khoa == "pham_tram_gia_coc" && (num < 0 || num > 100) {
			common.BadRequest(c, "Tỷ lệ tiền cọc phải nằm trong khoảng từ 0 đến 100%")
			return
		}
	case 3: // Boolean
		lower := strings.ToLower(val)
		if lower != "true" && lower != "false" && lower != "1" && lower != "0" {
			common.BadRequest(c, "Giá trị boolean phải là true hoặc false")
			return
		}
	case 4: // JSON
		if !json.Valid([]byte(val)) {
			common.BadRequest(c, "Giá trị không đúng định dạng JSON")
			return
		}
	}

	if khoa == "so_dien_thoai_lien_he" {
		val = strings.ReplaceAll(val, " ", "")
		if val == "" || len(val) > 20 {
			common.BadRequest(c, "Số điện thoại liên hệ không hợp lệ")
			return
		}
		for _, ch := range val {
			if ch < '0' || ch > '9' {
				common.BadRequest(c, "Số điện thoại liên hệ chỉ được chứa chữ số")
				return
			}
		}
	}

	if err := h.db.Model(&cd).Update("gia_tri", val).Error; err != nil {
		common.InternalError(c, "Không thể cập nhật cài đặt")
		return
	}

	h.db.Where("khoa = ?", khoa).First(&cd)
	common.OK(c, cd)
}

// GetCaiDatValue lấy giá trị cài đặt theo khóa (helper cho các handler khác)
func GetCaiDatValue(db *gorm.DB, khoa string) (string, error) {
	var cd model.CaiDat
	if err := db.Where("khoa = ?", khoa).First(&cd).Error; err != nil {
		return "", err
	}
	if cd.GiaTri == nil {
		return "", nil
	}
	return *cd.GiaTri, nil
}
