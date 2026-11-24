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

type CaiDatHandler struct {
	db *gorm.DB
}

func NewCaiDatHandler(db *gorm.DB) *CaiDatHandler {
	return &CaiDatHandler{db: db}
}

// GET /api/v1/cai-dat
func (h *CaiDatHandler) GetAll(c *gin.Context) {
	var list []model.CaiDat
	if err := h.db.Order("id ASC").Find(&list).Error; err != nil {
		common.InternalError(c, "Không thể lấy danh sách cài đặt")
		return
	}
	common.OK(c, list)
}

// PUT /api/v1/cai-dat/:khoa
func (h *CaiDatHandler) UpdateByKhoa(c *gin.Context) {
	khoa := c.Param("khoa")
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

	if err := h.db.Model(&cd).Update("gia_tri", input.GiaTri).Error; err != nil {
		common.InternalError(c, "Không thể cập nhật cài đặt")
		return
	}

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

// Dùng để tránh lint warning
var _ = strconv.Atoi
var _ = http.StatusOK
