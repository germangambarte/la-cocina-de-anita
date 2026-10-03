package cashBox

import "context"

type Repository interface {
	Get(ctx context.Context) (CashBox, error)
	Upsert(ctx context.Context, cashBox CashBox) error
	Delete(ctx context.Context) error
}
