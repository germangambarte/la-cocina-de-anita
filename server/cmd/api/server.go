package main

import (
	"log"
	"net/http"
	"time"
)

type application struct {
	config cfg
}

func (app *application) run(mux http.Handler) error {
	srv := &http.Server{
		Addr:         app.config.addr,
		Handler:      mux,
		WriteTimeout: time.Second * 30,
		ReadTimeout:  time.Second * 10,
		IdleTimeout:  time.Minute,
	}

	log.Printf("Server started on http://localhost%s\n", app.config.addr)

	return srv.ListenAndServe()
}
