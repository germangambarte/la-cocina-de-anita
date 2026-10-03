package cashWithdrawal

import (
	"time"
	"uuid"
)

type Withdrawal struct {
	ID        uuid.UUID `json:"id"`
	Date      time.Time `json:"date"`
	Concept   string    `json:"concept"`
	Amount    float64   `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}
