package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// --- Response types and helpers ---

type TErrorResponse struct {
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
} // error response struct

type TResponse[T any] struct {
	Data T `json:"data"`
} // generic response struct

func OkResponse[T any](
	c *gin.Context,
	data T,
) {
	c.JSON(http.StatusOK, data) // 200 OK response
}

func Response[T any](
	c *gin.Context,
	data T,
	status int,
) {
	c.JSON(status, TResponse[T]{Data: data}) // custom status response
}

func ErrorResponse(c *gin.Context, status int, message string) {
	c.JSON(
		status,
		TErrorResponse{
			Message: message,
		},
	) // error response
}

func ErrorResponseWithData(c *gin.Context, status int, message string, data interface{}) {
	c.JSON(
		status,
		TErrorResponse{
			Message: message,
			Data:    data,
		},
	) // error with data
}
