# Paso 1: Compilación
FROM golang:1.25-alpine AS builder

WORKDIR /app

# Instalar dependencias necesarias
RUN apk add --no-cache git

# Copiar archivos de módulos y descargar dependencias
COPY go.mod go.sum ./
RUN go mod download

# Copiar código fuente
COPY . .

# Compilar el binario
RUN CGO_ENABLED=0 GOOS=linux go build -o main .

# Paso 2: Imagen limpia ejecutable
FROM alpine:3.18

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

# Copiar el binario desde la compilación previa
COPY --from=builder /app/main .

EXPOSE 8082

CMD ["./main"]
