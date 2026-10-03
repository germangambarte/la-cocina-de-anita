package order

import (
	"time"
	"uuid"
)

type PriceMode string

const (
	PriceModeAutomatic PriceMode = "automatic"
	PriceModeManual    PriceMode = "manual"
)

type Order struct {
	ID               uuid.UUID `json:"id"`
	UpdatedAt        time.Time `json:"updated_at"`
	CreatedAt        time.Time `json:"created_at"`
	CustomerName     string    `json:"customer_name"`
	MenuName         string    `json:"menu_name"`
	RegularQty       int       `json:"regular_qty"`
	LargeQty         int       `json:"large_qty"`
	RegularUnitPrice float64   `json:"regular_unit_price"`
	LargeUnitPrice   float64   `json:"large_unit_price"`
	FoodSubtotal     float64   `json:"food_subtotal"`
	HasDelivery      bool      `json:"has_delivery"`
	DeliveryTime     string    `json:"delivery_time"`
	DeliveryFee      float64   `json:"delivery_fee"`
	Total            float64   `json:"total_amount"`
	IsDeliveryPaid   bool      `json:"is_delivery_paid"`
	IsReady          bool      `json:"is_ready"`
	IsDelivered      bool      `json:"is_delivered"`
	IsPaid           bool      `json:"is_paid"`
}
