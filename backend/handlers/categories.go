package handlers

import (
	"database/sql"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type CategoryHandler struct {
	DB         *sql.DB
	AdminToken string
}

type CategoryResponse struct {
	ID            string    `json:"id"`
	Slug          string    `json:"slug"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	CoverImageURL string    `json:"cover_image_url"`
	CreatedAt     time.Time `json:"created_at"`
	EventCount    int       `json:"event_count"`
}

type CategoryDetailResponse struct {
	CategoryResponse
	Events []EventResponse `json:"events"`
}

type CreateCategoryRequest struct {
	Name          string `json:"name"`
	Description   string `json:"description"`
	CoverImageURL string `json:"cover_image_url"`
}

func NewCategoryHandler(db *sql.DB, adminToken string) *CategoryHandler {
	return &CategoryHandler{DB: db, AdminToken: adminToken}
}

// GET /api/categories
func (h *CategoryHandler) ListCategories(c *fiber.Ctx) error {
	rows, err := h.DB.Query(`
		SELECT c.id, c.slug, c.name, c.description, c.cover_image_url, c.created_at,
		       COUNT(e.id) AS event_count
		FROM categories c
		LEFT JOIN events e ON e.category_id = c.id AND e.is_visible = true AND e.target_date > NOW()
		GROUP BY c.id
		ORDER BY c.created_at DESC
	`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	categories := []CategoryResponse{}
	for rows.Next() {
		var cat CategoryResponse
		if err := rows.Scan(&cat.ID, &cat.Slug, &cat.Name, &cat.Description,
			&cat.CoverImageURL, &cat.CreatedAt, &cat.EventCount); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		categories = append(categories, cat)
	}

	return c.JSON(categories)
}

// GET /api/categories/:slug
func (h *CategoryHandler) GetCategoryBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")

	var cat CategoryResponse
	err := h.DB.QueryRow(`
		SELECT c.id, c.slug, c.name, c.description, c.cover_image_url, c.created_at,
		       COUNT(e.id) AS event_count
		FROM categories c
		LEFT JOIN events e ON e.category_id = c.id AND e.is_visible = true AND e.target_date > NOW()
		WHERE c.slug = $1
		GROUP BY c.id
	`, slug).Scan(&cat.ID, &cat.Slug, &cat.Name, &cat.Description,
		&cat.CoverImageURL, &cat.CreatedAt, &cat.EventCount)

	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Categoría no encontrada"})
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	rows, err := h.DB.Query(`
		SELECT e.id, e.slug, e.title, e.target_date, e.image_url, e.views, e.created_at,
		       e.is_sponsored, COALESCE(e.sponsor_label, ''), e.is_pinned,
		       e.category_id::text, c.slug, c.name
		FROM events e
		INNER JOIN categories c ON e.category_id = c.id
		WHERE c.slug = $1 AND e.is_visible = true AND e.target_date > NOW()
		ORDER BY e.is_pinned DESC, e.target_date ASC
	`, slug)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	events := []EventResponse{}
	for rows.Next() {
		var e EventResponse
		var catID, catSlug, catName sql.NullString
		if err := rows.Scan(&e.ID, &e.Slug, &e.Title, &e.TargetDate, &e.ImageURL,
			&e.Views, &e.CreatedAt, &e.IsSponsored, &e.SponsorLabel, &e.IsPinned,
			&catID, &catSlug, &catName); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		if catID.Valid {
			e.CategoryID = &catID.String
			e.CategorySlug = &catSlug.String
			e.CategoryName = &catName.String
		}
		events = append(events, e)
	}

	return c.JSON(CategoryDetailResponse{
		CategoryResponse: cat,
		Events:           events,
	})
}

// POST /api/categories  (solo admin)
func (h *CategoryHandler) CreateCategory(c *fiber.Ctx) error {
	// Validar token de admin
	token := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
	if h.AdminToken == "" || token != h.AdminToken {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token de administrador inválido"})
	}

	var req CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo de solicitud inválido"})
	}
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El nombre de la categoría es requerido"})
	}

	slug := slugify(req.Name)
	if slug == "" {
		slug = "categoria"
	}

	var id string
	err := h.DB.QueryRow(`
		INSERT INTO categories (slug, name, description, cover_image_url)
		VALUES ($1, $2, $3, $4) RETURNING id
	`, slug, req.Name, req.Description, req.CoverImageURL).Scan(&id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al crear categoría: " + err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":   id,
		"slug": slug,
		"name": req.Name,
	})
}
