package common

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// OK trả về 200 với data
func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"data": data})
}

// Created trả về 201 với data
func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, gin.H{"data": data})
}

// NoContent trả về 204
func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

// BadRequest trả về 400
func BadRequest(c *gin.Context, msg string) {
	c.JSON(http.StatusBadRequest, gin.H{"error": msg})
}

// Unauthorized trả về 401
func Unauthorized(c *gin.Context, msg string) {
	c.JSON(http.StatusUnauthorized, gin.H{"error": msg})
}

// Forbidden trả về 403
func Forbidden(c *gin.Context, msg string) {
	c.JSON(http.StatusForbidden, gin.H{"error": msg})
}

// NotFound trả về 404
func NotFound(c *gin.Context, msg string) {
	c.JSON(http.StatusNotFound, gin.H{"error": msg})
}

// Conflict trả về 409
func Conflict(c *gin.Context, msg string) {
	c.JSON(http.StatusConflict, gin.H{"error": msg})
}

// UnprocessableEntity trả về 422 với chi tiết lỗi validation
func ValidationError(c *gin.Context, err error) {
	c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err})
}

// InternalError trả về 500
func InternalError(c *gin.Context, msg string) {
	c.JSON(http.StatusInternalServerError, gin.H{"error": msg})
}
