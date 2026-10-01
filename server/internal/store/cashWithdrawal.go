package store

import (
	"context"
	"database/sql"
	"time"
	"uuid"
)

type CashWithdrawal struct {
	ID        uuid.UUID `json:"id"`
	Date      time.Time `json:"date"`
	Concept   string    `json:"concept"`
	Amount    float64   `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

type CashWithdrawalStore struct {
	db *sql.DB
}

func (s *CashWithdrawalStore) Create(ctx context.Context) error {
	return nil
}
