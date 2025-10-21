package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// error response
type TErrorResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// generic response
type TResponse[T any] struct {
	Data T `json:"data"`
}

func OkResponse[T any](
	c *gin.Context,
	data T,
) {
	c.JSON(http.StatusOK, data)
}

func Response[T any](
	c *gin.Context,
	data T,
	status int,
) {
	c.JSON(status, TResponse[T]{Data: data})
}

func ErrorResponse(c *gin.Context, status int, message string) {
	c.JSON(
		status,
		TErrorResponse{
			Message: message,
		},
	)
}

func ErrorResponseWithData(c *gin.Context, status int, message string, data interface{}) {
	c.JSON(
		status,
		TErrorResponse{
			Message: message,
			Data:    data,
		},
	)
}
