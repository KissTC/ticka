package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"

	clerkuser "github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gofiber/fiber/v2"
	stripe "github.com/stripe/stripe-go/v80"
	billingportalsession "github.com/stripe/stripe-go/v80/billingportal/session"
	checkoutsession "github.com/stripe/stripe-go/v80/checkout/session"
	"github.com/stripe/stripe-go/v80/webhook"
)

type StripeHandler struct {
	DB                  *sql.DB
	WebhookSecret       string
	PriceIDMonthly      string
	PriceIDYearly       string
	FrontendURL         string
}

func NewStripeHandler(db *sql.DB, secretKey, webhookSecret, priceMonthly, priceYearly, frontendURL string) *StripeHandler {
	stripe.Key = secretKey
	return &StripeHandler{
		DB:             db,
		WebhookSecret:  webhookSecret,
		PriceIDMonthly: priceMonthly,
		PriceIDYearly:  priceYearly,
		FrontendURL:    frontendURL,
	}
}

// POST /api/stripe/checkout
func (h *StripeHandler) CreateCheckoutSession(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
	}
	clerkID, err := verifyClerkToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	var userID, plan string
	var stripeCustomerID sql.NullString
	err = h.DB.QueryRow(
		`INSERT INTO users (clerk_id, email, plan)
		 VALUES ($1, '', 'free')
		 ON CONFLICT (clerk_id) DO UPDATE SET clerk_id = EXCLUDED.clerk_id
		 RETURNING id, plan, stripe_customer_id`,
		clerkID,
	).Scan(&userID, &plan, &stripeCustomerID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al obtener usuario"})
	}

	if plan == "pro" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Ya tienes un plan Pro activo"})
	}

	var body struct {
		PriceID string `json:"price_id"`
	}
	_ = c.BodyParser(&body)
	if body.PriceID != h.PriceIDMonthly && body.PriceID != h.PriceIDYearly {
		body.PriceID = h.PriceIDMonthly
	}

	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{Price: stripe.String(body.PriceID), Quantity: stripe.Int64(1)},
		},
		SuccessURL: stripe.String(h.FrontendURL + "/upgrade/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:  stripe.String(h.FrontendURL + "/upgrade"),
		Metadata:   map[string]string{"user_id": userID},
	}

	if stripeCustomerID.Valid && stripeCustomerID.String != "" {
		params.Customer = stripe.String(stripeCustomerID.String)
	} else {
		// Pre-fill email desde Clerk para mejor UX en el checkout
		if u, err := clerkuser.Get(context.Background(), clerkID); err == nil {
			for _, e := range u.EmailAddresses {
				if e.Verification != nil && e.Verification.Status == "verified" {
					params.CustomerEmail = stripe.String(e.EmailAddress)
					break
				}
			}
			if params.CustomerEmail == nil && len(u.EmailAddresses) > 0 {
				params.CustomerEmail = stripe.String(u.EmailAddresses[0].EmailAddress)
			}
		}
	}

	sess, err := checkoutsession.New(params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al crear sesión de pago: " + err.Error()})
	}

	return c.JSON(fiber.Map{"url": sess.URL})
}

// POST /api/stripe/portal
func (h *StripeHandler) CreatePortalSession(c *fiber.Ctx) error {
	token := extractToken(c)
	if token == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token requerido"})
	}
	clerkID, err := verifyClerkToken(token)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token inválido"})
	}

	var customerID sql.NullString
	if err := h.DB.QueryRow(
		`SELECT stripe_customer_id FROM users WHERE clerk_id = $1`, clerkID,
	).Scan(&customerID); err != nil || !customerID.Valid || customerID.String == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No tienes una suscripción activa"})
	}

	params := &stripe.BillingPortalSessionParams{
		Customer:  stripe.String(customerID.String),
		ReturnURL: stripe.String(h.FrontendURL + "/dashboard"),
	}
	sess, err := billingportalsession.New(params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Error al abrir portal: " + err.Error()})
	}

	return c.JSON(fiber.Map{"url": sess.URL})
}

// POST /api/stripe/webhook  (sin auth — verificado por firma Stripe)
func (h *StripeHandler) HandleWebhook(c *fiber.Ctx) error {
	payload := c.Body()
	sigHeader := c.Get("Stripe-Signature")

	event, err := webhook.ConstructEventWithOptions(payload, sigHeader, h.WebhookSecret,
		webhook.ConstructEventOptions{IgnoreAPIVersionMismatch: true},
	)
	if err != nil {
		log.Printf("[WEBHOOK] error: %v", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Firma inválida: " + err.Error()})
	}

	switch event.Type {
	case "checkout.session.completed":
		var data struct {
			Metadata     map[string]string `json:"metadata"`
			Customer     string            `json:"customer"`
			Subscription string            `json:"subscription"`
		}
		if err := json.Unmarshal(event.Data.Raw, &data); err != nil || data.Metadata["user_id"] == "" {
			break
		}
		_, _ = h.DB.Exec(
			`UPDATE users SET plan='pro', stripe_customer_id=$1, stripe_subscription_id=$2 WHERE id=$3`,
			data.Customer, data.Subscription, data.Metadata["user_id"],
		)

	case "customer.subscription.deleted":
		var data struct {
			Customer string `json:"customer"`
		}
		if err := json.Unmarshal(event.Data.Raw, &data); err != nil || data.Customer == "" {
			break
		}
		_, _ = h.DB.Exec(
			`UPDATE users SET plan='free', stripe_subscription_id=NULL WHERE stripe_customer_id=$1`,
			data.Customer,
		)

	case "customer.subscription.updated":
		var data struct {
			Customer string `json:"customer"`
			Status   string `json:"status"`
		}
		if err := json.Unmarshal(event.Data.Raw, &data); err != nil {
			break
		}
		if data.Status == "past_due" || data.Status == "unpaid" || data.Status == "canceled" {
			_, _ = h.DB.Exec(`UPDATE users SET plan='free' WHERE stripe_customer_id=$1`, data.Customer)
		}
	}

	return c.SendStatus(fiber.StatusOK)
}
