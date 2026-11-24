package router

import (
	"miumiu-rent-stuff/internal/handler"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func Setup(db *gorm.DB) *gin.Engine {
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API v1 routes
	v1 := r.Group("/api/v1")
	{
		// --- Sản phẩm ---
		sanPhamHandler := handler.NewSanPhamHandler(db)
		sanPham := v1.Group("/san-pham")
		{
			sanPham.GET("", sanPhamHandler.GetAll)
			sanPham.GET("/:id", sanPhamHandler.GetByID)
			sanPham.POST("", sanPhamHandler.Create)
			sanPham.PUT("/:id", sanPhamHandler.Update)
			sanPham.DELETE("/:id", sanPhamHandler.Delete)
		}

		// --- Khách hàng ---
		khachHangHandler := handler.NewKhachHangHandler(db)
		khachHang := v1.Group("/khach-hang")
		{
			khachHang.GET("", khachHangHandler.GetAll)
			khachHang.GET("/:id", khachHangHandler.GetByID)
			khachHang.POST("", khachHangHandler.Create)
			khachHang.PUT("/:id", khachHangHandler.Update)
			khachHang.DELETE("/:id", khachHangHandler.Delete)
		}

		// --- Thuê đồ ---
		thueDoHandler := handler.NewThueDoHandler(db)
		thueDo := v1.Group("/thue-do")
		{
			thueDo.GET("", thueDoHandler.GetAll)
			thueDo.GET("/:id", thueDoHandler.GetByID)
			thueDo.POST("", thueDoHandler.Create)
			thueDo.PUT("/:id", thueDoHandler.Update)
			thueDo.DELETE("/:id", thueDoHandler.Delete)
		}
	}

	return r
}
