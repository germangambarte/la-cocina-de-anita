package config

import "cocinadeanita/internal/api/config/postgres"

type Service struct {
	repository *postgres.Repository
}

func NewService(repository *postgres.Repository) *Service {
	return &Service{
		repository: repository,
	}
}
