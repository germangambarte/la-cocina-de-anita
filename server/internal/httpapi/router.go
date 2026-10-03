package httpapi

import (
	"cocinadeanita/internal/api/cashBox"
	"cocinadeanita/internal/api/cashWithdrawal"
	"cocinadeanita/internal/api/config"
	"cocinadeanita/internal/api/expense"
	"cocinadeanita/internal/api/health"
	"cocinadeanita/internal/api/order"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

func NewRouter(
	healthHandler *health.Handler,
	orderHandler *order.Handler,
	expenseHandler *expense.Handler,
	configHandler *config.Handler,
	cashBoxHandler *cashBox.Handler,
	cashWithdrawalHandler *cashWithdrawal.Handler,
) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.ClientIPFromRemoteAddr)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Route("/v1", func(r chi.Router) {
		r.Get("/health", healthHandler.Check)
		r.Route("/orders", func(r chi.Router) {
			r.Post("/", orderHandler.Create)
			r.Get("/", orderHandler.List)
			r.Put("/{id}", orderHandler.Update)
			r.Delete("/{id}", orderHandler.Delete)
		})

		r.Route("/expenses", func(r chi.Router) {
			r.Post("/", expenseHandler.Create)
			r.Get("/", expenseHandler.List)
			r.Put("/{id}", expenseHandler.Update)
			r.Delete("/{id}", expenseHandler.Delete)
		})

		r.Route("/config", func(r chi.Router) {
			r.Post("/", configHandler.Upsert)
			r.Get("/", configHandler.GetByKey)
			r.Delete("/{id}", configHandler.Delete)
		})

		r.Route("/cash-box", func(r chi.Router) {
			r.Post("/", cashBoxHandler.Upsert)
			r.Get("/", cashBoxHandler.Get)
			r.Delete("/{id}", cashBoxHandler.Delete)
		})

		r.Route("/cash-withdrawal", func(r chi.Router) {
			r.Post("/", cashWithdrawalHandler.Create)
			r.Get("/", cashWithdrawalHandler.List)
			r.Put("/{id}", cashWithdrawalHandler.Update)
			r.Delete("/{id}", cashWithdrawalHandler.Delete)
		})
	})

	return r
}
