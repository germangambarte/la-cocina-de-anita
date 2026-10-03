package cashBox

import "cocinadeanita/internal/api/cashBox/postgres"

type Service struct {
	repository *postgres.Repository
}

func NewService(repository *postgres.Repository) *Service {
	return &Service{
		repository: repository,
	}
}
