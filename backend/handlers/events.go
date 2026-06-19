package handlers

import (
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"ticka/backend/imageutil"
	"ticka/backend/storage"
)

type EventHandler struct {
	DB         *sql.DB
	Storage    *storage.S3Storage
	AdminToken string
}

type EventResponse struct {
	ID           string    `json:"id"`
	Slug         string    `json:"slug"`
	Title        string    `json:"title"`
	TargetDate   time.Time `json:"target_date"`
	ImageURL     string    `json:"image_url"`
	ThumbnailURL string    `json:"thumbnail_url"`
	Views        int64     `json:"views"`
	CreatedAt    time.Time `json:"created_at"`
	Timezone     string    `json:"timezone"`
	OwnerPlan    string    `json:"owner_plan"`
	IsSponsored  bool      `json:"is_sponsored"`
	SponsorLabel string    `json:"sponsor_label,omitempty"`
	IsPinned     bool      `json:"is_pinned"`
	CategoryID   *string   `json:"category_id,omitempty"`
	CategorySlug *string   `json:"category_slug,omitempty"`
	CategoryName *string   `json:"category_name,omitempty"`
}

type CreateEventRequest struct {
	Title        string `json:"title"`
	TargetDate   string `json:"target_date"` // Formato YYYY-MM-DDTHH:MM (datetime-local)
	ImageURL     string `json:"image_url"`
	ThumbnailURL string `json:"thumbnail_url"` // Opcional: versión reducida para tarjetas
	Timezone     string `json:"timezone"`      // IANA timezone name, ej. "America/Mexico_City"
	CategoryID   string `json:"category_id"`   // UUID opcional
}

func NewEventHandler(db *sql.DB, store *storage.S3Storage, adminToken string) *EventHandler {
	return &EventHandler{DB: db, Storage: store, AdminToken: adminToken}
}

// GET /api/time
func (h *EventHandler) GetServerTime(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"time": time.Now().UTC(),
	})
}

const maxVideoSizeBytes = 100 * 1024 * 1024 // 100 MB

// POST /api/upload
func (h *EventHandler) UploadImage(c *fiber.Ctx) error {
	file, err := c.FormFile("image")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No se recibió ningún archivo"})
	}

	mimeType := file.Header.Get("Content-Type")
	isVideo := strings.HasPrefix(mimeType, "video/")

	if isVideo {
		// Videos: solo usuarios Pro
		token := extractToken(c)
		if token == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Sube un video requiere cuenta Pro. Inicia sesión."})
		}
		clerkID, err := verifyClerkToken(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
		}
		var plan string
		if dbErr := h.DB.QueryRow(`SELECT plan FROM users WHERE clerk_id = $1`, clerkID).Scan(&plan); dbErr != nil || plan != "pro" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "El video de fondo es una función exclusiva de usuarios Pro"})
		}
		if file.Size > maxVideoSizeBytes {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El video no puede superar los 100MB"})
		}

		// Determinar extensión y subir directo sin procesar
		ext := "mp4"
		if strings.Contains(mimeType, "webm") {
			ext = "webm"
		} else if strings.Contains(mimeType, "quicktime") || strings.Contains(mimeType, "mov") {
			ext = "mov"
		}

		src, err := file.Open()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al abrir el video"})
		}
		defer src.Close()

		videoData := make([]byte, file.Size)
		if _, err := src.Read(videoData); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al leer el video"})
		}

		url, err := h.Storage.UploadBytes(videoData, "backgrounds", "bg."+ext, mimeType)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al subir video a Spaces: " + err.Error()})
		}
		return c.JSON(fiber.Map{"url": url, "type": "video"})
	}

	// Imágenes: pipeline existente
	if file.Size > imageutil.MaxFileSizeBytes {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La imagen no puede superar los 20MB"})
	}

	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al abrir la imagen"})
	}
	defer src.Close()

	full, thumbnail, err := imageutil.ProcessImage(src)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Formato no soportado o imagen corrupta: " + err.Error()})
	}

	url, err := h.Storage.UploadBytes(full, "backgrounds", "bg.jpg", "image/jpeg")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al subir imagen a Spaces: " + err.Error()})
	}

	thumbnailURL, err := h.Storage.UploadBytes(thumbnail, "thumbnails", "thumb.jpg", "image/jpeg")
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al subir miniatura a Spaces: " + err.Error()})
	}

	return c.JSON(fiber.Map{"url": url, "thumbnail_url": thumbnailURL, "type": "image"})
}

// POST /api/events
func (h *EventHandler) CreateEvent(c *fiber.Ctx) error {
	var req CreateEventRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo de solicitud inválido"})
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || req.TargetDate == "" || req.ImageURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Todos los campos (title, target_date, image_url) son requeridos"})
	}
	if len(req.Title) < 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El título debe tener al menos 3 caracteres"})
	}
	if len(req.Title) > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El título no puede superar los 100 caracteres"})
	}

	targetTime, err := parseDateWithTimezone(req.TargetDate, req.Timezone)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Formato de fecha inválido: " + err.Error()})
	}
	if !targetTime.After(time.Now().UTC()) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La fecha debe ser en el futuro"})
	}

	slug := slugify(req.Title)
	if len(slug) == 0 {
		slug = "evento"
	}
	slug = fmt.Sprintf("%s-%d", slug, time.Now().Unix()%100000)

	// category_id es opcional — se guarda como NULL si no se envía
	var categoryID *string
	if req.CategoryID != "" {
		categoryID = &req.CategoryID
	}

	tz := req.Timezone
	if tz == "" {
		tz = "UTC"
	}

	// Capturar IP del cliente para rate-limiting de invitados
	clientIP := c.IP()

	// Asociar al usuario si viene con token Clerk válido
	var userID *string
	if token := strings.TrimPrefix(c.Get("Authorization"), "Bearer "); token != "" {
		if clerkID, err := verifyClerkToken(token); err == nil {
			var uid, plan string
			dbErr := h.DB.QueryRow(`
				INSERT INTO users (clerk_id, email, plan)
				VALUES ($1, '', 'free')
				ON CONFLICT (clerk_id) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
				RETURNING id, plan
			`, clerkID).Scan(&uid, &plan)
			if dbErr == nil {
				userID = &uid

				// Plan free: máximo 3 contadores activos por cuenta
				if plan != "pro" {
					var count int
					if err := h.DB.QueryRow(
						`SELECT COUNT(*) FROM events WHERE user_id = $1 AND is_visible = true`, uid,
					).Scan(&count); err == nil && count >= 3 {
						return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
							"error": "Has alcanzado el límite de 3 contadores en el plan gratuito. Elimina uno o mejora a Pro para crear más.",
						})
					}
				}
			}
		}
	}

	// Invitados (sin cuenta): máximo 1 contador activo por IP en las últimas 24h
	if userID == nil && clientIP != "" {
		var guestCount int
		if err := h.DB.QueryRow(
			`SELECT COUNT(*) FROM events WHERE user_id IS NULL AND client_ip = $1 AND is_visible = true AND created_at > NOW() - INTERVAL '24 hours'`,
			clientIP,
		).Scan(&guestCount); err == nil && guestCount >= 1 {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Los visitantes pueden crear 1 contador cada 24 horas. Crea una cuenta gratis para crear más y no perderlos.",
			})
		}
	}

	// thumbnail_url es opcional — si no viene, se guarda como NULL y el frontend usa image_url
	var thumbnailURL *string
	if req.ThumbnailURL != "" {
		thumbnailURL = &req.ThumbnailURL
	}

	var id string
	err = h.DB.QueryRow(
		`INSERT INTO events (slug, title, target_date, image_url, thumbnail_url, category_id, timezone, user_id, client_ip)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
		slug, req.Title, targetTime, req.ImageURL, thumbnailURL, categoryID, tz, userID, clientIP,
	).Scan(&id)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al guardar el evento: " + err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"id":          id,
		"slug":        slug,
		"title":       req.Title,
		"target_date": targetTime,
		"image_url":   req.ImageURL,
		"category_id": categoryID,
	})
}

// GET /api/events
func (h *EventHandler) ListPopularEvents(c *fiber.Ctx) error {
	categorySlug := c.Query("category", "")
	query := strings.TrimSpace(c.Query("q", ""))

	var rows *sql.Rows
	var err error

	switch {
	case categorySlug != "" && query != "":
		rows, err = h.DB.Query(`
			SELECT e.id, e.slug, e.title, e.target_date, e.image_url,
			       COALESCE(e.thumbnail_url, e.image_url) AS thumbnail_url, e.views, e.created_at,
			       e.timezone, e.is_sponsored, COALESCE(e.sponsor_label, ''), e.is_pinned,
			       e.category_id::text, c.slug, c.name
			FROM events e
			INNER JOIN categories c ON e.category_id = c.id
			WHERE c.slug = $1 AND e.is_visible = true AND e.target_date > NOW()
			  AND e.title ILIKE $2
			ORDER BY e.is_pinned DESC, e.views DESC, e.created_at DESC
			LIMIT 50
		`, categorySlug, "%"+query+"%")
	case categorySlug != "":
		rows, err = h.DB.Query(`
			SELECT e.id, e.slug, e.title, e.target_date, e.image_url,
			       COALESCE(e.thumbnail_url, e.image_url) AS thumbnail_url, e.views, e.created_at,
			       e.timezone, e.is_sponsored, COALESCE(e.sponsor_label, ''), e.is_pinned,
			       e.category_id::text, c.slug, c.name
			FROM events e
			INNER JOIN categories c ON e.category_id = c.id
			WHERE c.slug = $1 AND e.is_visible = true AND e.target_date > NOW()
			ORDER BY e.is_pinned DESC, e.views DESC, e.created_at DESC
			LIMIT 50
		`, categorySlug)
	case query != "":
		rows, err = h.DB.Query(`
			SELECT e.id, e.slug, e.title, e.target_date, e.image_url,
			       COALESCE(e.thumbnail_url, e.image_url) AS thumbnail_url, e.views, e.created_at,
			       e.timezone, e.is_sponsored, COALESCE(e.sponsor_label, ''), e.is_pinned,
			       e.category_id::text, c.slug, c.name
			FROM events e
			LEFT JOIN categories c ON e.category_id = c.id
			WHERE e.is_visible = true AND e.target_date > NOW() AND e.title ILIKE $1
			ORDER BY e.is_pinned DESC, e.views DESC, e.created_at DESC
			LIMIT 30
		`, "%"+query+"%")
	default:
		rows, err = h.DB.Query(`
			SELECT e.id, e.slug, e.title, e.target_date, e.image_url,
			       COALESCE(e.thumbnail_url, e.image_url) AS thumbnail_url, e.views, e.created_at,
			       e.timezone, e.is_sponsored, COALESCE(e.sponsor_label, ''), e.is_pinned,
			       e.category_id::text, c.slug, c.name
			FROM events e
			LEFT JOIN categories c ON e.category_id = c.id
			WHERE e.is_visible = true AND e.target_date > NOW()
			ORDER BY e.is_pinned DESC, e.views DESC, e.created_at DESC
			LIMIT 12
		`)
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	events := []EventResponse{}
	for rows.Next() {
		var e EventResponse
		var catID, catSlug, catName sql.NullString
		if err := rows.Scan(&e.ID, &e.Slug, &e.Title, &e.TargetDate, &e.ImageURL, &e.ThumbnailURL,
			&e.Views, &e.CreatedAt, &e.Timezone, &e.IsSponsored, &e.SponsorLabel, &e.IsPinned,
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

	return c.JSON(events)
}

// GET /api/events/:slug
func (h *EventHandler) GetEventBySlug(c *fiber.Ctx) error {
	slug := c.Params("slug")
	if slug == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Slug no provisto"})
	}

	var e EventResponse
	var catID, catSlug, catName sql.NullString
	var ownerPlan sql.NullString

	err := h.DB.QueryRow(`
		SELECT e.id, e.slug, e.title, e.target_date, e.image_url,
		       COALESCE(e.thumbnail_url, e.image_url) AS thumbnail_url, e.views, e.created_at,
		       e.timezone, COALESCE(u.plan, 'free'),
		       e.is_sponsored, COALESCE(e.sponsor_label, ''), e.is_pinned,
		       e.category_id::text, c.slug, c.name
		FROM events e
		LEFT JOIN categories c ON e.category_id = c.id
		LEFT JOIN users u ON e.user_id = u.id
		WHERE e.slug = $1 AND e.is_visible = true
	`, slug).Scan(&e.ID, &e.Slug, &e.Title, &e.TargetDate, &e.ImageURL, &e.ThumbnailURL,
		&e.Views, &e.CreatedAt, &e.Timezone, &ownerPlan,
		&e.IsSponsored, &e.SponsorLabel, &e.IsPinned,
		&catID, &catSlug, &catName)

	if ownerPlan.Valid {
		e.OwnerPlan = ownerPlan.String
	} else {
		e.OwnerPlan = "free"
	}

	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Evento no encontrado"})
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	if catID.Valid {
		e.CategoryID = &catID.String
		e.CategorySlug = &catSlug.String
		e.CategoryName = &catName.String
	}

	go func(eventID string) {
		_, _ = h.DB.Exec("UPDATE events SET views = views + 1 WHERE id = $1", eventID)
	}(e.ID)
	e.Views++

	return c.JSON(e)
}

// POST /api/events/:slug/view — registra una visita con referrer (público, sin auth)
func (h *EventHandler) RecordView(c *fiber.Ctx) error {
	slug := c.Params("slug")

	var body struct {
		Referrer string `json:"referrer"`
	}
	_ = c.BodyParser(&body)

	var eventID string
	err := h.DB.QueryRow(`SELECT id FROM events WHERE slug = $1 AND is_visible = true`, slug).Scan(&eventID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Evento no encontrado"})
	}

	go func() {
		_, _ = h.DB.Exec(
			`INSERT INTO event_views (event_id, referrer) VALUES ($1, $2)`,
			eventID, body.Referrer,
		)
	}()

	return c.SendStatus(fiber.StatusNoContent)
}

// GET /api/events/:slug/analytics — métricas del evento (solo dueño Pro)
func (h *EventHandler) GetAnalytics(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
	}
	clerkID, err := verifyClerkToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	var userID string
	err = h.DB.QueryRow(`SELECT id FROM users WHERE clerk_id = $1`, clerkID).Scan(&userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Usuario no encontrado"})
	}

	slug := c.Params("slug")
	var eventID string
	var ownerID sql.NullString
	err = h.DB.QueryRow(`SELECT id, user_id FROM events WHERE slug = $1 AND is_visible = true`, slug).
		Scan(&eventID, &ownerID)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Evento no encontrado"})
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !ownerID.Valid || ownerID.String != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Sin permiso"})
	}

	// Vistas por día — últimos 30 días
	rows, err := h.DB.Query(`
		SELECT DATE(viewed_at AT TIME ZONE 'UTC') AS day, COUNT(*) AS cnt
		FROM event_views
		WHERE event_id = $1 AND viewed_at >= NOW() - INTERVAL '30 days'
		GROUP BY day
		ORDER BY day ASC
	`, eventID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	type DayCount struct {
		Date  string `json:"date"`
		Count int    `json:"count"`
	}
	viewsByDay := []DayCount{}
	for rows.Next() {
		var dc DayCount
		if err := rows.Scan(&dc.Date, &dc.Count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		viewsByDay = append(viewsByDay, dc)
	}

	// Top referrers
	refRows, err := h.DB.Query(`
		SELECT CASE
			WHEN referrer = '' OR referrer IS NULL THEN 'Directo'
			WHEN referrer ILIKE '%whatsapp%' THEN 'WhatsApp'
			WHEN referrer ILIKE '%t.co%' OR referrer ILIKE '%twitter%' OR referrer ILIKE '%x.com%' THEN 'Twitter / X'
			WHEN referrer ILIKE '%instagram%' THEN 'Instagram'
			WHEN referrer ILIKE '%telegram%' THEN 'Telegram'
			WHEN referrer ILIKE '%facebook%' THEN 'Facebook'
			WHEN referrer ILIKE '%tiktok%' THEN 'TikTok'
			ELSE 'Otro'
		END AS source,
		COUNT(*) AS cnt
		FROM event_views
		WHERE event_id = $1
		GROUP BY source
		ORDER BY cnt DESC
		LIMIT 8
	`, eventID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer refRows.Close()

	type Referrer struct {
		Source string `json:"source"`
		Count  int    `json:"count"`
	}
	referrers := []Referrer{}
	for refRows.Next() {
		var r Referrer
		if err := refRows.Scan(&r.Source, &r.Count); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		referrers = append(referrers, r)
	}

	// Total desde event_views
	var total int
	_ = h.DB.QueryRow(`SELECT COUNT(*) FROM event_views WHERE event_id = $1`, eventID).Scan(&total)

	return c.JSON(fiber.Map{
		"views_by_day": viewsByDay,
		"referrers":    referrers,
		"total":        total,
	})
}

// parseDateWithTimezone interpreta una fecha datetime-local en el timezone del creador y devuelve UTC.
func parseDateWithTimezone(dateStr, timezone string) (time.Time, error) {
	loc := time.UTC
	if timezone != "" {
		if l, err := time.LoadLocation(timezone); err == nil {
			loc = l
		}
	}

	formats := []string{time.RFC3339, "2006-01-02T15:04:05", "2006-01-02T15:04"}
	for _, format := range formats {
		if t, err := time.ParseInLocation(format, dateStr, loc); err == nil {
			return t.UTC(), nil
		}
	}

	return time.Time{}, fmt.Errorf("use RFC3339 o YYYY-MM-DDTHH:MM")
}

// PATCH /api/events/:slug
func (h *EventHandler) UpdateEvent(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
	}
	clerkID, err := verifyClerkToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	var userID string
	err = h.DB.QueryRow(`SELECT id FROM users WHERE clerk_id = $1`, clerkID).Scan(&userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Usuario no encontrado"})
	}

	slug := c.Params("slug")
	var eventID string
	var currentOwner sql.NullString
	err = h.DB.QueryRow(`SELECT id, user_id FROM events WHERE slug = $1 AND is_visible = true`, slug).
		Scan(&eventID, &currentOwner)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Contador no encontrado"})
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !currentOwner.Valid || currentOwner.String != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No tienes permiso para editar este contador"})
	}

	var body struct {
		Title      string `json:"title"`
		TargetDate string `json:"target_date"`
		Timezone   string `json:"timezone"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo inválido"})
	}

	body.Title = strings.TrimSpace(body.Title)
	if len(body.Title) < 3 || len(body.Title) > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "El título debe tener entre 3 y 100 caracteres"})
	}

	targetTime, err := parseDateWithTimezone(body.TargetDate, body.Timezone)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Fecha inválida: " + err.Error()})
	}
	if !targetTime.After(time.Now().UTC()) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "La fecha debe ser en el futuro"})
	}

	tz := body.Timezone
	if tz == "" {
		tz = "UTC"
	}

	_, err = h.DB.Exec(
		`UPDATE events SET title = $1, target_date = $2, timezone = $3 WHERE id = $4`,
		body.Title, targetTime, tz, eventID,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al actualizar: " + err.Error()})
	}

	return c.JSON(fiber.Map{"slug": slug, "title": body.Title, "target_date": targetTime})
}

// DELETE /api/events/:slug
func (h *EventHandler) DeleteEvent(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
	}
	clerkID, err := verifyClerkToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	var userID string
	err = h.DB.QueryRow(`SELECT id FROM users WHERE clerk_id = $1`, clerkID).Scan(&userID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Usuario no encontrado"})
	}

	slug := c.Params("slug")
	var eventID string
	var currentOwner sql.NullString
	err = h.DB.QueryRow(`SELECT id, user_id FROM events WHERE slug = $1 AND is_visible = true`, slug).
		Scan(&eventID, &currentOwner)
	if err == sql.ErrNoRows {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Contador no encontrado"})
	} else if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	if !currentOwner.Valid || currentOwner.String != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "No tienes permiso para eliminar este contador"})
	}

	_, err = h.DB.Exec(`UPDATE events SET is_visible = false WHERE id = $1`, eventID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al eliminar: " + err.Error()})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// PATCH /api/admin/events/:slug/sponsor — marca un evento como patrocinado (solo admin)
func (h *EventHandler) SponsorEvent(c *fiber.Ctx) error {
	if h.AdminToken == "" || c.Get("Authorization") != "Bearer "+h.AdminToken {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado"})
	}

	slug := c.Params("slug")
	var body struct {
		IsSponsored  bool   `json:"is_sponsored"`
		SponsorLabel string `json:"sponsor_label"`
		IsPinned     bool   `json:"is_pinned"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo inválido"})
	}

	res, err := h.DB.Exec(
		`UPDATE events SET is_sponsored=$1, sponsor_label=$2, is_pinned=$3 WHERE slug=$4 AND is_visible=true`,
		body.IsSponsored, body.SponsorLabel, body.IsPinned, slug,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	n, _ := res.RowsAffected()
	if n == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Evento no encontrado"})
	}
	return c.JSON(fiber.Map{"success": true, "slug": slug})
}

// GET /api/sitemap-data — todos los slugs para el sitemap XML (sin auth, sin límite)
func (h *EventHandler) SitemapData(c *fiber.Ctx) error {
	rows, err := h.DB.Query(`
		SELECT slug, created_at FROM events
		WHERE is_visible = true
		ORDER BY created_at DESC
	`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	type SlugEntry struct {
		Slug      string    `json:"slug"`
		UpdatedAt time.Time `json:"updated_at"`
	}
	slugs := []SlugEntry{}
	for rows.Next() {
		var e SlugEntry
		if err := rows.Scan(&e.Slug, &e.UpdatedAt); err != nil {
			continue
		}
		slugs = append(slugs, e)
	}

	catRows, err := h.DB.Query(`SELECT slug FROM categories ORDER BY created_at DESC`)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer catRows.Close()

	catSlugs := []string{}
	for catRows.Next() {
		var s string
		if err := catRows.Scan(&s); err != nil {
			continue
		}
		catSlugs = append(catSlugs, s)
	}

	return c.JSON(fiber.Map{"events": slugs, "categories": catSlugs})
}

// slugify limpia y formatea cadenas para URLs seguras
func slugify(str string) string {
	str = strings.ToLower(strings.TrimSpace(str))
	reg, _ := regexp.Compile("[^a-z0-9]+")
	str = reg.ReplaceAllString(str, "-")
	return strings.Trim(str, "-")
}
