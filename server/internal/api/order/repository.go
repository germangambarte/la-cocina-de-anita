package order

import (
	"context"
	"uuid"
)

type Repository interface {
	Create(ctx context.Context, order Order) error
	List(ctx context.Context) ([]Order, error)
	Update(ctx context.Context, id uuid.UUID, order Order) error
	Delete(ctx context.Context, id uuid.UUID) error
}
