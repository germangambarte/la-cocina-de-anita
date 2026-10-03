package main

import "cocinadeanita/internal/env"

type dbConfig struct {
	addr         string
	maxOpenConns int
	maxIdleConns int
	maxIdleTime  string
}

type cfg struct {
	addr string
	env  string
	db   dbConfig
}

func loadConfig() cfg {
	return cfg{
		addr: env.GetString("ADDR", ":8080"),
		env:  env.GetString("ENV", "development"),
		db: dbConfig{
			addr: env.GetString(
				"DB_ADDR",
				"postgres://admin:adminpass@localhost/cocinadeanita?sslmode=disable",
			),
			maxOpenConns: env.GetInt("DB_MAX_OPEN_CONNS", 30),
			maxIdleConns: env.GetInt("DB_MAX_IDLE_CONNS", 30),
			maxIdleTime:  env.GetString("DB_MAX_IDLE_TIME", "15m"),
		},
	}
}
