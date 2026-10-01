package store

import (
	"context"
	"time"
	"uuid"
)

type Expense struct {
	ID            uuid.UUID       `json:"id"`
	Date          time.Time       `json:"date"`
	Concept       string          `json:"concept"`
	Category      ExpenseCategory `json:"category"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
	PaymentMethod PaymentMethod   `json:"payment_method"`
}

type ExpenseStore struct {
}

func (s *ExpenseStore) Create(ctx context.Context) error {
	return nil
}
