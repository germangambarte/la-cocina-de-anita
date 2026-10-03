package cashBox

import "net/http"

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request)    {}
func (h *Handler) Upsert(w http.ResponseWriter, r *http.Request) {}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request) {}
