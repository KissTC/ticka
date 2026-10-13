package handlers

import (
	"fmt"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// Attribution es el origen first-touch que el frontend guarda en localStorage en la
// primera visita y envía al crear un contador y al iniciar sesión.
type Attribution struct {
	UTMSource   string `json:"utm_source"`
	UTMMedium   string `json:"utm_medium"`
	UTMCampaign string `json:"utm_campaign"`
	Ref         string `json:"ref"`
	Referrer    string `json:"referrer"`     // solo el host, ej. "google.com"
	LandingPath string `json:"landing_path"` // ruta de la primera visita, sin query
}

// clean recorta espacios y largo para que quepa en las columnas de la migración 010.
func (a *Attribution) clean() {
	a.UTMSource = truncate(strings.ToLower(strings.TrimSpace(a.UTMSource)), 100)
	a.UTMMedium = truncate(strings.ToLower(strings.TrimSpace(a.UTMMedium)), 100)
	a.UTMCampaign = truncate(strings.ToLower(strings.TrimSpace(a.UTMCampaign)), 100)
	a.Ref = truncate(strings.ToLower(strings.TrimSpace(a.Ref)), 100)
	a.Referrer = truncate(strings.ToLower(strings.TrimSpace(a.Referrer)), 255)
	a.LandingPath = truncate(strings.TrimSpace(a.LandingPath), 255)
}

func truncate(s string, max int) string {
	r := []rune(s)
	if len(r) > max {
		return string(r[:max])
	}
	return s
}

// sourceSQL arma la fuente con la que se agrupan los reportes: utm_source > ref > referrer > "directo".
// Cuando no se capturó atribución (registros anteriores a la migración 010, contadores
// sembrados u oficiales) nullCol es NULL y cae en "sin atribución".
func sourceSQL(nullCol string) string {
	return fmt.Sprintf(`CASE WHEN %s IS NULL THEN 'sin atribución'
		ELSE COALESCE(NULLIF(utm_source, ''), NULLIF(ref, ''), NULLIF(first_referrer, ''), 'directo') END`, nullCol)
}

// POST /api/users/me/attribution — guarda la atribución del usuario una sola vez.
// Solo aplica a cuentas recién creadas: a las anteriores no se les puede atribuir
// con certeza su primera visita.
func (h *UserHandler) SetAttribution(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
	}
	clerkID, err := verifyClerkToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	var a Attribution
	if err := c.BodyParser(&a); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Cuerpo de solicitud inválido"})
	}
	a.clean()

	var userID string
	if err := h.DB.QueryRow(`
		INSERT INTO users (clerk_id, email, plan)
		VALUES ($1, '', 'free')
		ON CONFLICT (clerk_id) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
		RETURNING id
	`, clerkID).Scan(&userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al obtener usuario"})
	}

	res, err := h.DB.Exec(`
		UPDATE users
		SET utm_source = $2, utm_medium = $3, utm_campaign = $4, ref = $5,
		    first_referrer = $6, landing_path = $7, attributed_at = NOW()
		WHERE id = $1 AND attributed_at IS NULL AND created_at > NOW() - INTERVAL '7 days'
	`, userID, a.UTMSource, a.UTMMedium, a.UTMCampaign, a.Ref, a.Referrer, a.LandingPath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al guardar atribución"})
	}
	n, _ := res.RowsAffected()

	return c.JSON(fiber.Map{"saved": n == 1})
}

type SourceCount struct {
	Source string `json:"source"`
	Users  int    `json:"users"`
	Pro    int    `json:"pro"`
	Events int    `json:"events"`
}

// GET /api/admin/attribution?days=30 — registros, suscriptores Pro y contadores por fuente.
// Sin days (o days=0) cuenta todo el histórico.
func (h *UserHandler) AttributionReport(c *fiber.Ctx) error {
	if h.AdminToken == "" || c.Get("Authorization") != "Bearer "+h.AdminToken {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "No autorizado"})
	}

	days, _ := strconv.Atoi(c.Query("days"))
	if days < 0 {
		days = 0
	}

	rows, err := h.DB.Query(`
		WITH u AS (
			SELECT `+sourceSQL("attributed_at")+` AS source,
			       COUNT(*) AS users,
			       COUNT(*) FILTER (WHERE plan = 'pro') AS pro
			FROM users
			WHERE $1 = 0 OR created_at > NOW() - make_interval(days => $1)
			GROUP BY 1
		), e AS (
			SELECT `+sourceSQL("utm_source")+` AS source,
			       COUNT(*) AS events
			FROM events
			WHERE $1 = 0 OR created_at > NOW() - make_interval(days => $1)
			GROUP BY 1
		)
		SELECT COALESCE(u.source, e.source), COALESCE(u.users, 0), COALESCE(u.pro, 0), COALESCE(e.events, 0)
		FROM u FULL OUTER JOIN e ON u.source = e.source
		ORDER BY 3 DESC, 2 DESC, 4 DESC
	`, days)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	defer rows.Close()

	sources := []SourceCount{}
	for rows.Next() {
		var s SourceCount
		if err := rows.Scan(&s.Source, &s.Users, &s.Pro, &s.Events); err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		sources = append(sources, s)
	}

	return c.JSON(fiber.Map{"days": days, "sources": sources})
}
