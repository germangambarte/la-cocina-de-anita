package cashWithdrawal

import "context"

type Repository interface {
	Create(ctx context.Context, withdrawal Withdrawal) error
	GetByID(ctx context.Context, id string) (Withdrawal, error)
	List(ctx context.Context) ([]Withdrawal, error)
	Update(ctx context.Context, id string, withdrawal Withdrawal) error
	Delete(ctx context.Context, id string) error
}
