package service

import (
	"github.com/gin-gonic/gin"
	"github.com/yatochka-dev/pollex/core-svc/internal/db/repository"
	"github.com/yatochka-dev/pollex/core-svc/internal/util"
)

// auth service struct
type AuthService struct {
	Config       *util.Config
	Queries      *repository.Queries
	TokenService *TokenService
}

// constructor
func NewAuthService(
	config *util.Config,
	queries *repository.Queries,
	tokenService *TokenService,

) *AuthService {
	return &AuthService{
		Config:       config,
		Queries:      queries,
		TokenService: tokenService,
	}
}

// validate token, fetch user
func (a *AuthService) Auth(c *gin.Context) (repository.GetUserByIDRow, error) {
	tokenData, err := a.TokenService.ParseToken(c)

	if err != nil {
		return repository.GetUserByIDRow{}, err
	}

	user, err := a.Queries.GetUserByID(c.Request.Context(), tokenData.ID)

	if err != nil {
		return repository.GetUserByIDRow{}, err
	}

	return user, nil
}

// login input struct
type LoginInput struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// login logic, token issue
func (a *AuthService) Login(c *gin.Context, input LoginInput) (string, error) {
	query, err := a.Queries.GetPasswordHashByEmail(c, input.Email)

	if err != nil {
		return "", util.ErrInvalidCredentials
	}

	same, err := util.VerifyPassword(input.Password, query.PasswordHash)

	if !same {
		return "", util.ErrInvalidCredentials
	}

	token, err := a.TokenService.GenerateToken(AuthTokenData{ID: query.ID})

	if err != nil {
		// Token generation is internal error, not user fault
		return "", err
	}

	return token, nil
}

// registration input struct
type RegisterInput struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// register user
func (a *AuthService) Register(c *gin.Context, input RegisterInput) (repository.GetUserByIDRow, error) {

	exists, err := a.Queries.CheckEmailExists(c.Request.Context(), input.Email)

	if err != nil {
		return repository.GetUserByIDRow{}, err
	}

	if exists {
		return repository.GetUserByIDRow{}, util.ErrEmailExists
	}

	passwordHash, err := util.HashPassword(input.Password)

	if err != nil {
		return repository.GetUserByIDRow{}, err
	}

	user, err := a.Queries.CreateUser(c.Request.Context(), repository.CreateUserParams{
		Name:         input.Name,
		Email:        input.Email,
		PasswordHash: passwordHash,
	})

	if err != nil {
		return repository.GetUserByIDRow{}, err
	}

	return repository.GetUserByIDRow{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		CreatedAt: user.CreatedAt,
	}, nil

}

// Token management stubs
//func (a *AuthService) GenerateTokens(...) { ... } // TODO
//func (a *AuthService) ValidateAccessToken(...) { ... } // TODO
//func (a *AuthService) ValidateRefreshToken(...) { ... } // TODO
//func (a *AuthService) RefreshTokens(...) { ... } // TODO
//func (a *AuthService) RevokeRefreshToken(...) { ... } // TODO
