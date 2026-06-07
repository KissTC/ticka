package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port                  string
	DBConnStr             string
	S3Endpoint            string
	S3Region              string
	S3AccessKey           string
	S3SecretKey           string
	S3Bucket              string
	S3CDNURL              string
	AdminToken            string
	ClerkSecretKey        string
	StripeSecretKey       string
	StripeWebhookSecret   string
	StripePriceIDMonthly  string
	StripePriceIDYearly   string
	FrontendURL           string
	CORSOrigins           string
}

func LoadConfig() (*Config, error) {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8082"
	}

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	dbSSLMode := os.Getenv("DB_SSLMODE")

	if dbHost == "" || dbUser == "" || dbPassword == "" || dbName == "" {
		return nil, fmt.Errorf("faltan variables de entorno obligatorias de base de datos")
	}

	if dbPort == "" {
		dbPort = "5432"
	}
	if dbSSLMode == "" {
		dbSSLMode = "disable"
	}

	dbConnStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPassword, dbName, dbSSLMode)

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:3000"
	}

	// CORS_ORIGINS: lista separada por comas de orígenes permitidos (ej. "https://ticka.dev,https://www.ticka.dev")
	// Si no se define, se permite cualquier origen (modo desarrollo).
	corsOrigins := os.Getenv("CORS_ORIGINS")
	if corsOrigins == "" {
		corsOrigins = "*"
	}

	return &Config{
		Port:                 port,
		DBConnStr:            dbConnStr,
		S3Endpoint:           os.Getenv("S3_ENDPOINT"),
		S3Region:             os.Getenv("S3_REGION"),
		S3AccessKey:          os.Getenv("S3_ACCESS_KEY"),
		S3SecretKey:          os.Getenv("S3_SECRET_KEY"),
		S3Bucket:             os.Getenv("S3_BUCKET"),
		S3CDNURL:             os.Getenv("S3_CDN_URL"),
		AdminToken:           os.Getenv("ADMIN_TOKEN"),
		ClerkSecretKey:       os.Getenv("CLERK_SECRET_KEY"),
		StripeSecretKey:      os.Getenv("STRIPE_SECRET_KEY"),
		StripeWebhookSecret:  os.Getenv("STRIPE_WEBHOOK_SECRET"),
		StripePriceIDMonthly: os.Getenv("STRIPE_PRICE_ID_MONTHLY"),
		StripePriceIDYearly:  os.Getenv("STRIPE_PRICE_ID_YEARLY"),
		FrontendURL:          frontendURL,
		CORSOrigins:          corsOrigins,
	}, nil
}
