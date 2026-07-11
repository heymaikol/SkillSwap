package services

import (
	"errors"

	"github.com/mplaczek99/SkillSwap/models"
	"github.com/mplaczek99/SkillSwap/utils"
)

// UserRepositoryInterface defines methods needed from the user repository
type UserRepositoryInterface interface {
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
}

// AuthServiceInterface defines the contract for authentication services
type AuthServiceInterface interface {
	Register(user *models.User) (string, error)
	Login(email, password string) (string, error)
}

// AuthService implements the AuthServiceInterface
type AuthService struct {
	UserRepo UserRepositoryInterface
}

// NewAuthService creates a new authentication service with the provided repository
func NewAuthService(userRepo UserRepositoryInterface) *AuthService {
	return &AuthService{UserRepo: userRepo}
}

// Register creates a new user and returns a token
func (s *AuthService) Register(user *models.User) (string, error) {
	// Check if email already exists
	existingUser, _ := s.UserRepo.GetUserByEmail(user.Email)
	if existingUser != nil {
		return "", errors.New("email already in use")
	}

	// Create the user
	if err := s.UserRepo.CreateUser(user); err != nil {
		return "", err
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Role, user.Email)
	if err != nil {
		return "", err
	}
	return token, nil
}

// Login authenticates a user and returns a token
func (s *AuthService) Login(email, password string) (string, error) {
	// Get user by email
	user, err := s.UserRepo.GetUserByEmail(email)
	if err != nil {
		return "", errors.New("invalid email or password")
	}

	// Check password
	if !user.ComparePassword(password) {
		return "", errors.New("invalid email or password")
	}

	// Generate token
	token, err := utils.GenerateToken(user.ID, user.Role, user.Email)
	if err != nil {
		return "", err
	}
	return token, nil
}
