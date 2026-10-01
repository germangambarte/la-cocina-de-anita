package store

import (
	"context"
	"database/sql"
	"time"
)

type Config struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ConfigStore struct {
	db *sql.DB
}

func (s *ConfigStore) Create(ctx context.Context) error {
	return nil
}
