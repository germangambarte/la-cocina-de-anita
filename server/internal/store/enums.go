package store

type PaymentMethod string

const (
	PaymentMethodCash     PaymentMethod = "efectivo"
	PaymentMethodTransfer PaymentMethod = "trasferencia"
	PaymentMethodPendig   PaymentMethod = "pendiente"
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
