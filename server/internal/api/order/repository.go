package order

import (
	"context"
)

type Repository interface {
	Create(ctx context.Context, order Order) error
	List(ctx context.Context) ([]Order, error)
	Update(ctx context.Context, id string, order Order) error
	Delete(ctx context.Context, id string) error
}
