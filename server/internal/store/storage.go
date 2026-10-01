package store

import "context"

type Storage struct {
	CashConfig     interface{ Create(context.Context) error }
	CashWithdrawal interface{ Create(context.Context) error }
	Config         interface{ Create(context.Context) error }
	Expense        interface{ Create(context.Context) error }
	Order          interface{ Create(context.Context) error }
}

func NewStorage() Storage {
	return Storage{
		CashConfig:     &CashConfigStore{},
		CashWithdrawal: &CashConfigStore{},
		Expense:        &ExpenseStore{},
		Order:          &OrderStore{},
		Config:         &ConfigStore{},
	}
}
