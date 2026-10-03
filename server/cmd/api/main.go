package main

import (
	"cocinadeanita/internal/api/cashBox"
	cashBoxPostgres "cocinadeanita/internal/api/cashBox/postgres"
	"cocinadeanita/internal/api/cashWithdrawal"
	cashWithdrawalPostgres "cocinadeanita/internal/api/cashWithdrawal/postgres"
	"cocinadeanita/internal/api/config"
	configPostgres "cocinadeanita/internal/api/config/postgres"
	"cocinadeanita/internal/api/expense"
	expensePostgres "cocinadeanita/internal/api/expense/postgres"
	"cocinadeanita/internal/api/health"
	"cocinadeanita/internal/api/order"
	orderPostgres "cocinadeanita/internal/api/order/postgres"
	"cocinadeanita/internal/database"
	"cocinadeanita/internal/httpapi"
	"log"
)

const version = "0.0.1"

func main() {
	cfg := loadConfig()

	db, err := database.New(
		cfg.db.addr,
		cfg.db.maxOpenConns,
		cfg.db.maxIdleConns,
		cfg.db.maxIdleTime,
	)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	log.Println("database connection pool established")

	healthHandler := health.NewHandler(cfg.env, version)

	orderRepository := orderPostgres.NewRepository(db)
	orderService := order.NewService(orderRepository)
	orderHandler := order.NewHandler(orderService)

	expenseRepository := expensePostgres.NewRepository(db)
	expenseService := expense.NewService(expenseRepository)
	expenseHandler := expense.NewHandler(expenseService)

	configRepository := configPostgres.NewRepository(db)
	configService := config.NewService(configRepository)
	configHandler := config.NewHandler(configService)

	cashBoxRepository := cashBoxPostgres.NewRepository(db)
	cashBoxService := cashBox.NewService(cashBoxRepository)
	cashBoxHandler := cashBox.NewHandler(cashBoxService)

	cashWithdrawalRepository := cashWithdrawalPostgres.NewRepository(db)
	cashWithdrawalService := cashWithdrawal.NewService(cashWithdrawalRepository)
	cashWithdrawalHandler := cashWithdrawal.NewHandler(cashWithdrawalService)

	router := httpapi.NewRouter(
		healthHandler,
		orderHandler,
		expenseHandler,
		configHandler,
		cashBoxHandler,
		cashWithdrawalHandler,
	)

	app := &application{
		config: cfg,
	}

	log.Fatal(app.run(router))
}
