package cashWithdrawal

import "cocinadeanita/internal/api/cashWithdrawal/postgres"

type Service struct {
	repository *postgres.Repository
}

func NewService(repository *postgres.Repository) *Service {
	return &Service{
		repository: repository,
	}
}
