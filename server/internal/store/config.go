package store

import (
	"context"
	"time"
)

type Config struct {
	Key       string    `json:"key"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ConfigStore struct {
}

func (s *ConfigStore) Create(ctx context.Context) error {
	return nil
}
