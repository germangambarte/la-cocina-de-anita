package expense

import (
	"cocinadeanita/internal/api/expense/postgres"
)

type Service struct {
	repository *postgres.Repository
}

func NewService(repository *postgres.Repository) *Service {
	return &Service{
		repository: repository,
	}
}
