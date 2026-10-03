package expense

import (
	"time"
	"uuid"
)

type ExpenseCategory string

const (
	ExpenseCategoryMeat          ExpenseCategory = "carne"
	ExpenseCategoryFish          ExpenseCategory = "pescado"
	ExpenseCategoryVegetables    ExpenseCategory = "verduras_hortalizas"
	ExpenseCategoryPantry        ExpenseCategory = "almacen"
	ExpenseCategoryDisposables   ExpenseCategory = "descartables_envases"
	ExpenseCategoryUtilities     ExpenseCategory = "servicios"
	ExpenseCategoryMiscellaneous ExpenseCategory = "varios"
)

type PaymentMethod string

const (
	PaymentMethodCash     PaymentMethod = "efectivo"
	PaymentMethodTransfer PaymentMethod = "transferencia"
	PaymentMethodPendig   PaymentMethod = "pendiente"
)

type Expense struct {
	ID        uuid.UUID       `json:"id"`
	Date      time.Time       `json:"date"`
	Concept   string          `json:"concept"`
	Category  ExpenseCategory `json:"category"`
	CreatedAt time.Time       `json:"created_at"`
	UpdatedAt time.Time       `json:"updated_at"`
	Amount    float64         `json:"amount"`
	Payment   PaymentMethod   `json:"payment_method"`
}
