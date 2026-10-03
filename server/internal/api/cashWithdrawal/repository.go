package cashWithdrawal

import (
	"context"
	"uuid"
)

type Repository interface {
	Create(ctx context.Context, withdrawal Withdrawal) error
	GetByID(ctx context.Context, id uuid.UUID) (Withdrawal, error)
	List(ctx context.Context) ([]Withdrawal, error)
	Update(ctx context.Context, id uuid.UUID, withdrawal Withdrawal) error
	Delete(ctx context.Context, id uuid.UUID) error
}
