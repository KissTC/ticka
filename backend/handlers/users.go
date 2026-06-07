package handlers

import (
	"context"
	"database/sql"
	"strings"

	"github.com/clerk/clerk-sdk-go/v2"
	clerkjwt "github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gofiber/fiber/v2"
)

type UserHandler struct {
	DB             *sql.DB
	ClerkSecretKey string
}

func NewUserHandler(db *sql.DB, clerkSecretKey string) *UserHandler {
	clerk.SetKey(clerkSecretKey)
	return &UserHandler{DB: db, ClerkSecretKey: clerkSecretKey}
}

// verifyClerkToken valida el JWT de Clerk y retorna el clerkUserID.
func verifyClerkToken(tokenStr string) (string, error) {
	claims, err := clerkjwt.Verify(context.Background(), &clerkjwt.VerifyParams{
		Token: tokenStr,
	})
	if err != nil {
		return "", err
	}
	return claims.Subject, nil
}

// extractToken extrae el Bearer token del header Authorization.
func extractToken(c *fiber.Ctx) string {
	return strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
}

// GET /api/users/me — plan y estado del usuario autenticado
func (h *UserHandler) GetMe(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
	}
	clerkID, err := verifyClerkToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	var userID, plan string
	var hasSubscription bool
	err = h.DB.QueryRow(
		`INSERT INTO users (clerk_id, email, plan)
		 VALUES ($1, '', 'free')
		 ON CONFLICT (clerk_id) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
		 RETURNING id, plan, stripe_subscription_id IS NOT NULL`,
		clerkID,
	).Scan(&userID, &plan, &hasSubscription)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al obtener usuario"})
	}

	return c.JSON(fiber.Map{
		"id":               userID,
		"plan":             plan,
		"has_subscription": hasSubscription,
	})
}

// GET /api/users/me/events — eventos del usuario autenticado
func (h *UserHandler) GetMyEvents(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
	}

	clerkID, err := verifyClerkToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	// Upsert usuario en nuestra DB
	var userID string
	err = h.DB.QueryRow(`
		INSERT INTO users (clerk_id, email, plan)
		VALUES ($1, '', 'free')
		ON CONFLICT (clerk_id) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
		RETURNING id
	`, clerkID).Scan(&userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al obtener usuario"})
	}

	rows, err := h.DB.Query(`
		SELECT e.id, e.slug, e.title, e.target_date, e.image_url, e.views, e.created_at,
		       e.timezone, e.category_id::text, c.slug, c.name
		FROM events e
		LEFT JOIN categories c ON e.category_id = c.id
		WHERE e.user_id = $1 AND e.is_visible = true
		ORDER BY e.created_at DESC
	`, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	events := []EventResponse{}
	for rows.Next() {
		var e EventResponse
		var catID, catSlug, catName sql.NullString
		if err := rows.Scan(&e.ID, &e.Slug, &e.Title, &e.TargetDate, &e.ImageURL,
			&e.Views, &e.CreatedAt, &e.Timezone, &catID, &catSlug, &catName); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		if catID.Valid {
			e.CategoryID = &catID.String
			e.CategorySlug = &catSlug.String
			e.CategoryName = &catName.String
		}
		events = append(events, e)
	}

	return c.JSON(events)
}
