package handler

import (
	"errors"
	"net/http"
	"strings"
	"time"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/config"
	"miumiu-rent-stuff/internal/model"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db             *gorm.DB
	jwtSecret      string
	jwtExpiryHours int
}

func NewAuthHandler(db *gorm.DB) *AuthHandler {
	cfg := config.Load()
	return NewAuthHandlerWithConfig(db, cfg.JWTSecret, cfg.JWTExpiryHours)
}

func NewAuthHandlerWithConfig(db *gorm.DB, jwtSecret string, jwtExpiryHours int) *AuthHandler {
	if jwtSecret == "" {
		jwtSecret = config.Load().JWTSecret
	}
	if jwtExpiryHours <= 0 {
		jwtExpiryHours = 24
	}
	return &AuthHandler{
		db:             db,
		jwtSecret:      jwtSecret,
		jwtExpiryHours: jwtExpiryHours,
	}
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var input model.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	var user model.NguoiDung
	if err := h.db.Where("LOWER(email) = ?", input.Email).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.Unauthorized(c, "Email hoặc mật khẩu không đúng")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.MatKhau), []byte(input.MatKhau)); err != nil {
		common.Unauthorized(c, "Email hoặc mật khẩu không đúng")
		return
	}

	token, err := h.generateJWT(user.ID, user.Email)
	if err != nil {
		common.InternalError(c, "Không thể tạo token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"token":      token,
			"nguoi_dung": user.ToPublic(),
		},
	})
}

// GET /api/v1/auth/me
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetUint("user_id")
	var user model.NguoiDung
	if err := h.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy tài khoản")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}
	common.OK(c, user.ToPublic())
}

// PUT /api/v1/auth/me
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetUint("user_id")

	var user model.NguoiDung
	if err := h.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			common.NotFound(c, "Không tìm thấy tài khoản")
			return
		}
		common.InternalError(c, "Lỗi hệ thống")
		return
	}

	var input model.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if input.Ten != nil {
		trimmed := strings.TrimSpace(*input.Ten)
		input.Ten = &trimmed
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	updates := map[string]interface{}{}

	if input.Ten != nil {
		if *input.Ten == "" {
			common.BadRequest(c, "Tên người dùng không được để trống")
			return
		}
		updates["ten"] = *input.Ten
	}

	// Đổi mật khẩu: cần kiểm tra mật khẩu cũ
	if input.MatKhauMoi != nil && *input.MatKhauMoi != "" {
		if input.MatKhauCu == nil || *input.MatKhauCu == "" {
			common.BadRequest(c, "Cần nhập mật khẩu cũ để đổi mật khẩu")
			return
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.MatKhau), []byte(*input.MatKhauCu)); err != nil {
			common.BadRequest(c, "Mật khẩu cũ không đúng")
			return
		}
		hash, err := bcrypt.GenerateFromPassword([]byte(*input.MatKhauMoi), bcrypt.DefaultCost)
		if err != nil {
			common.InternalError(c, "Không thể mã hóa mật khẩu")
			return
		}
		updates["mat_khau"] = string(hash)
	}

	if len(updates) == 0 {
		common.BadRequest(c, "Không có thông tin nào để cập nhật")
		return
	}

	if err := h.db.Model(&user).Updates(updates).Error; err != nil {
		common.InternalError(c, "Không thể cập nhật tài khoản")
		return
	}

	// Reload
	h.db.First(&user, userID)
	common.OK(c, user.ToPublic())
}

// generateJWT tạo JWT token cho user
func (h *AuthHandler) generateJWT(userID uint, email string) (string, error) {
	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(time.Duration(h.jwtExpiryHours) * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.jwtSecret))
}
