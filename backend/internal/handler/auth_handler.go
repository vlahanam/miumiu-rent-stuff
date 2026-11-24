package handler

import (
	"errors"
	"net/http"
	"os"
	"strconv"
	"time"

	"miumiu-rent-stuff/internal/common"
	"miumiu-rent-stuff/internal/model"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type AuthHandler struct {
	db *gorm.DB
}

func NewAuthHandler(db *gorm.DB) *AuthHandler {
	return &AuthHandler{db: db}
}

// POST /api/v1/auth/login
func (h *AuthHandler) Login(c *gin.Context) {
	var input model.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	var user model.NguoiDung
	if err := h.db.Where("email = ?", input.Email).First(&user).Error; err != nil {
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

	token, err := generateJWT(user.ID, user.Email)
	if err != nil {
		common.InternalError(c, "Không thể tạo token")
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"token":     token,
			"nguoi_dung": user.ToPublic(),
		},
	})
}

// GET /api/v1/auth/me
func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID := c.GetUint("user_id")
	var user model.NguoiDung
	if err := h.db.First(&user, userID).Error; err != nil {
		common.NotFound(c, "Không tìm thấy tài khoản")
		return
	}
	common.OK(c, user.ToPublic())
}

// PUT /api/v1/auth/me
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetUint("user_id")

	var user model.NguoiDung
	if err := h.db.First(&user, userID).Error; err != nil {
		common.NotFound(c, "Không tìm thấy tài khoản")
		return
	}

	var input model.UpdateProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		common.BadRequest(c, err.Error())
		return
	}
	if err := input.Validate(); err != nil {
		common.ValidationError(c, err)
		return
	}

	updates := map[string]interface{}{}

	if input.Ten != nil {
		updates["ten"] = *input.Ten
	}

	// Đổi mật khẩu: cần kiểm tra mật khẩu cũ
	if input.MatKhauMoi != nil {
		if input.MatKhauCu == nil {
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
func generateJWT(userID uint, email string) (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "miumiu-secret-key-change-in-production"
	}

	expiryHours := 24
	claims := jwt.MapClaims{
		"user_id": userID,
		"email":   email,
		"exp":     time.Now().Add(time.Duration(expiryHours) * time.Hour).Unix(),
		"iat":     time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// getUint lấy uint từ gin context
func init() {
	// Đăng ký helper method cho gin.Context
	_ = strconv.Atoi
}
