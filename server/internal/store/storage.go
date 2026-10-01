package store

import (
	"context"
	"database/sql"
)

type Storage struct {
	CashConfig     interface{ Create(context.Context) error }
	CashWithdrawal interface{ Create(context.Context) error }
	Config         interface{ Create(context.Context) error }
	Expense        interface{ Create(context.Context) error }
	Order          interface{ Create(context.Context) error }
}

func NewStorage(db *sql.DB) Storage {
	return Storage{
		CashConfig:     &CashConfigStore{db},
		CashWithdrawal: &CashConfigStore{db},
		Expense:        &ExpenseStore{db},
		Order:          &OrderStore{db},
		Config:         &ConfigStore{db},
	}
}
