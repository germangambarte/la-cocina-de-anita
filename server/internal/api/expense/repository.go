package expense

import (
	"context"
)

type Repository interface {
	Create(ctx context.Context, expense Expense) error
	List(ctx context.Context) ([]Expense, error)
	Update(ctx context.Context, id string, expense Expense) error
	Delete(ctx context.Context, id string) error
}
