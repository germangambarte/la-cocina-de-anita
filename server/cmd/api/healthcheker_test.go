package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHealthCheck(t *testing.T) {
	app := &application{
		config: config{
			env: "test",
		},
	}

	router := app.mount()

	request := httptest.NewRequest(
		http.MethodGet,
		"/v1/health",
		nil,
	)

	recorder := httptest.NewRecorder()

	router.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Errorf(
			"expected %d, got %d",
			http.StatusOK,
			recorder.Code,
		)
	}

	var response map[string]string

	err := json.NewDecoder(recorder.Body).Decode(&response)

	if err != nil {
		t.Fatalf("json response could not be read: %v", err)
	}

	if response["status"] != "ok" {
		t.Errorf(
			"expected status %s, got %s",
			"ok",
			response["status"],
		)
	}

	if response["env"] != "test" {
		t.Errorf(
			"expected status %s, got %s",
			"test",
			response["env"],
		)
	}

	if response["version"] != version {
		t.Errorf(
			"expected status %s, got %s",
			version,
			response["version"],
		)
	}
}
