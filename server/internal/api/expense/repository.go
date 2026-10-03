package expense

import (
	"context"
	"uuid"
)

type Repository interface {
	Create(ctx context.Context, expense Expense) error
	List(ctx context.Context) ([]Expense, error)
	Update(ctx context.Context, id uuid.UUID, expense Expense) error
	Delete(ctx context.Context, id uuid.UUID) error
}
