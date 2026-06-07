package main

import (
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/limiter"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"ticka/backend/config"
	"ticka/backend/database"
	"ticka/backend/handlers"
	"ticka/backend/storage"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Error al cargar la configuración: %v", err)
	}

	db, err := database.ConnectPostgres(cfg.DBConnStr)
	if err != nil {
		log.Fatalf("Error al conectar a PostgreSQL: %v", err)
	}
	defer db.Close()
	log.Println("Conexión exitosa a PostgreSQL")

	s3Storage, err := storage.NewS3Storage(cfg)
	if err != nil {
		log.Fatalf("Error al inicializar DigitalOcean Spaces: %v", err)
	}
	log.Println("Conexión exitosa a DigitalOcean Spaces")

	app := fiber.New(fiber.Config{
		AppName:        "Ticka API MVP",
		ReadBufferSize: 16384, // 16KB — necesario para JWTs de Clerk (~2KB) + otros headers
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: cfg.CORSOrigins,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PATCH, DELETE, OPTIONS",
	}))

	eventHandler := handlers.NewEventHandler(db, s3Storage, cfg.AdminToken)
	categoryHandler := handlers.NewCategoryHandler(db, cfg.AdminToken)
	userHandler := handlers.NewUserHandler(db, cfg.ClerkSecretKey)
	stripeHandler := handlers.NewStripeHandler(db,
		cfg.StripeSecretKey, cfg.StripeWebhookSecret,
		cfg.StripePriceIDMonthly, cfg.StripePriceIDYearly,
		cfg.FrontendURL,
	)

	api := app.Group("/api")

	// Tiempo del servidor
	api.Get("/time", eventHandler.GetServerTime)

	// Datos para sitemap (público, sin auth)
	api.Get("/sitemap-data", eventHandler.SitemapData)

	// Upload de imágenes
	api.Post("/upload", eventHandler.UploadImage)

	// Eventos (rate limit: 5 creaciones por IP por hora)
	createLimiter := limiter.New(limiter.Config{
		Max:        5,
		Expiration: time.Hour,
		KeyGenerator: func(c *fiber.Ctx) string {
			return c.IP()
		},
		LimitReached: func(c *fiber.Ctx) error {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Límite alcanzado: máximo 5 contadores por hora por IP.",
			})
		},
	})
	api.Post("/events", createLimiter, eventHandler.CreateEvent)
	api.Get("/events", eventHandler.ListPopularEvents)
	api.Get("/events/:slug", eventHandler.GetEventBySlug)
	api.Patch("/events/:slug", eventHandler.UpdateEvent)
	api.Delete("/events/:slug", eventHandler.DeleteEvent)
	api.Post("/events/:slug/view", eventHandler.RecordView)
	api.Get("/events/:slug/analytics", eventHandler.GetAnalytics)
	api.Patch("/admin/events/:slug/sponsor", eventHandler.SponsorEvent)

	// Categorías (GET público, POST solo admin)
	api.Get("/categories", categoryHandler.ListCategories)
	api.Get("/categories/:slug", categoryHandler.GetCategoryBySlug)
	api.Post("/categories", categoryHandler.CreateCategory)

	// Usuarios autenticados
	api.Get("/users/me", userHandler.GetMe)
	api.Get("/users/me/events", userHandler.GetMyEvents)

	// Stripe
	api.Post("/stripe/checkout", stripeHandler.CreateCheckoutSession)
	api.Post("/stripe/portal", stripeHandler.CreatePortalSession)
	api.Post("/stripe/webhook", stripeHandler.HandleWebhook)

	app.Use(func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Ruta no encontrada"})
	})

	log.Printf("Iniciando servidor en puerto %s...", cfg.Port)
	if err := app.Listen(":" + cfg.Port); err != nil {
		log.Fatalf("Error al iniciar el servidor: %v", err)
	}
}
