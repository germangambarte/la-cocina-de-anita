package main

import (
	"cocinadeanita/internal/env"
	"log"
)

const version = "0.0.1"

func main() {
	cfg := config{
		addr: env.GetString("ADDR", ":8080"),
		env:  env.GetString("ENV", "development"),
	}

	app := &application{
		config: cfg,
	}

	r := app.mount()

	log.Fatal(app.run(r))
}
