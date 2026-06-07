package imageutil

import (
	"bytes"
	"fmt"
	"image"
	"io"

	"github.com/disintegration/imaging"
	_ "golang.org/x/image/webp" // registra soporte de decode WebP en image.Decode
)

const (
	MaxFileSizeBytes  = 20 * 1024 * 1024 // 20 MB
	MaxDimension      = 2560             // px en el lado más largo (imagen completa)
	ThumbnailMaxSide  = 480              // px en el lado más largo (miniatura para tarjetas)
	JPEGQuality       = 85
	ThumbnailQuality  = 75
)

// ProcessImage decodifica cualquier imagen soportada (JPEG, PNG, GIF, BMP, TIFF, WebP),
// la redimensiona para que quepa en MaxDimension×MaxDimension preservando el aspect ratio,
// y la recodifica como JPEG de alta calidad. También genera una miniatura ligera para
// usarse en tarjetas/grids. Devuelve (imagen completa, miniatura) listas para subir a S3.
func ProcessImage(src io.Reader) (full []byte, thumbnail []byte, err error) {
	img, _, err := image.Decode(src)
	if err != nil {
		return nil, nil, fmt.Errorf("formato no soportado o imagen corrupta: %w", err)
	}

	bounds := img.Bounds()
	w := bounds.Dx()
	h := bounds.Dy()

	fullImg := img
	if w > MaxDimension || h > MaxDimension {
		// Fit reduce preservando aspect ratio para que ningún lado supere MaxDimension
		fullImg = imaging.Fit(img, MaxDimension, MaxDimension, imaging.Lanczos)
	}

	var fullBuf bytes.Buffer
	if err := imaging.Encode(&fullBuf, fullImg, imaging.JPEG, imaging.JPEGQuality(JPEGQuality)); err != nil {
		return nil, nil, fmt.Errorf("error al codificar imagen: %w", err)
	}

	thumbImg := imaging.Fit(img, ThumbnailMaxSide, ThumbnailMaxSide, imaging.Lanczos)
	var thumbBuf bytes.Buffer
	if err := imaging.Encode(&thumbBuf, thumbImg, imaging.JPEG, imaging.JPEGQuality(ThumbnailQuality)); err != nil {
		return nil, nil, fmt.Errorf("error al codificar miniatura: %w", err)
	}

	return fullBuf.Bytes(), thumbBuf.Bytes(), nil
}
