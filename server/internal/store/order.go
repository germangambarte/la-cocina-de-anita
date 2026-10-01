package store

import (
	"context"
	"database/sql"
	"time"
	"uuid"
)

type Order struct {
	ID              uuid.UUID     `json:"id"`
	CustomerName    string        `json:"customer_name"`
	MenuName        string        `json:"menu_name"`
	RegularQty      int           `json:"regular_qty"`
	LargeQty        int           `json:"large_qty"`
	DeliveryTime    string        `json:"delivery_time"`
	RequireDelivery bool          `json:"require_delivery"`
	DeliveryFee     float64       `json:"delivery_fee"`
	TotalAmount     float64       `json:"total_amount"`
	PaymentMethod   PaymentMethod `json:"payment_method"`
	IsDeliveryPaid  bool          `json:"is_delivery_paid"`
	IsReady         bool          `json:"is_ready"`
	IsDelivered     bool          `json:"is_delivered"`
	UpdatedAt       time.Time     `json:"updated_at"`
	CreatedAt       time.Time     `json:"created_at"`
}

type OrderStore struct {
	db *sql.DB
}

func (s *OrderStore) Create(ctx context.Context) error {
	return nil
}
