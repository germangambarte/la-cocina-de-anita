package store

import (
	"context"
	"time"
	"uuid"
)

type CashConfig struct {
	ID             uuid.UUID `json:"id"`
	StartDate      time.Time `json:"start_date"`
	InitialBalance float64   `json:"initial_balance"`
	CreatedAt      time.Time `json:"created_at"`
}

type CashConfigStore struct {
}

func (s *CashConfigStore) Create(ctx context.Context) error {
	return nil
}
