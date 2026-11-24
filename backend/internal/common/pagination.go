package common

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

const (
	DefaultPage  = 1
	DefaultLimit = 20
	MaxLimit     = 100
)

// Params chứa thông tin phân trang đã được parse và validate.
type Params struct {
	Page   int
	Limit  int
	Offset int
}

// ParseParams đọc query string ?page=&limit= từ request,
// áp chuẩn hoá giá trị và trả về Params.
func ParseParams(c *gin.Context) Params {
	page, err := strconv.Atoi(c.DefaultQuery("page", strconv.Itoa(DefaultPage)))
	if err != nil || page < 1 {
		page = DefaultPage
	}

	limit, err := strconv.Atoi(c.DefaultQuery("limit", strconv.Itoa(DefaultLimit)))
	if err != nil || limit < 1 || limit > MaxLimit {
		limit = DefaultLimit
	}

	return Params{
		Page:   page,
		Limit:  limit,
		Offset: (page - 1) * limit,
	}
}

// Result là response chuẩn trả về cho client.
type Result struct {
	Data  any   `json:"data"`
	Total int64 `json:"total"`
	Page  int   `json:"page"`
	Limit int   `json:"limit"`
}

// Paginate đếm tổng số bản ghi trên query q, sau đó chạy
// Offset/Limit/Order rồi Scan vào dest. Trả về Result và error nếu có.
//
// Ví dụ:
//
//	result, err := pagination.Paginate(c, q, &items, "id DESC")
func Paginate(c *gin.Context, q *gorm.DB, dest any, orderBy string) (Result, error) {
	p := ParseParams(c)

	var total int64
	if err := q.Count(&total).Error; err != nil {
		return Result{}, err
	}

	if orderBy == "" {
		orderBy = "id DESC"
	}

	if err := q.Offset(p.Offset).Limit(p.Limit).Order(orderBy).Find(dest).Error; err != nil {
		return Result{}, err
	}

	return Result{
		Data:  dest,
		Total: total,
		Page:  p.Page,
		Limit: p.Limit,
	}, nil
}
