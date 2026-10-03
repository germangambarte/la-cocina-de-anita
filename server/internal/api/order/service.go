package order

import (
	"cocinadeanita/internal/api/order/postgres"
	"errors"
)

var ErrCustomerNameRequired = errors.New("customer name is required")

type Service struct {
	repository postgres.Repository
}

func NewService(repository *postgres.Repository) *Service {
	return &Service{
		repository: postgres.Repository{},
	}
}
