package health

import (
	"encoding/json"
	"net/http"
)

type Handler struct {
	env     string
	version string
}

func NewHandler(env, version string) *Handler {
	return &Handler{
		env:     env,
		version: version,
	}
}

func (h *Handler) Check(w http.ResponseWriter, r *http.Request) {
	data := map[string]string{
		"status":  "ok",
		"env":     h.env,
		"version": h.version,
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)

	_ = json.NewEncoder(w).Encode(data)
}
