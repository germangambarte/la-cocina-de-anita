package cashBox

import (
	"time"
	"uuid"
)

type CashBox struct {
	ID             uuid.UUID `json:"id"`
	StartDate      time.Time `json:"start_date"`
	InitialBalance float64   `json:"initial_balance"`
	CreatedAt      time.Time `json:"created_at"`
}
