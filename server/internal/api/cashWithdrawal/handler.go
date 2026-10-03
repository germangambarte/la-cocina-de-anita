package cashWithdrawal

import "net/http"

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{
		service: service,
	}
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request)  {}
func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {}
func (h *Handler) List(w http.ResponseWriter, r *http.Request)    {}
func (h *Handler) Update(w http.ResponseWriter, r *http.Request)  {}
func (h *Handler) Delete(w http.ResponseWriter, r *http.Request)  {}
