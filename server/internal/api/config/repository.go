package config

import (
	"context"
)

type Repository interface {
	GetByKey(ctx context.Context, key string) (Config, error)
	Upsert(ctx context.Context, config Config) error
	Delete(ctx context.Context, key string) error
}
