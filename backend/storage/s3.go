package storage

import (
	"bytes"
	"context"
	"fmt"
	"mime/multipart"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	s3config "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	s3types "github.com/aws/aws-sdk-go-v2/service/s3/types"
	"ticka/backend/config"
)

type S3Storage struct {
	Client *s3.Client
	Bucket string
	CDNURL string
	Endpoint string
}

func NewS3Storage(cfg *config.Config) (*S3Storage, error) {
	if cfg.S3AccessKey == "" || cfg.S3SecretKey == "" || cfg.S3Bucket == "" {
		return nil, fmt.Errorf("credenciales de S3 incompatibles o vacías")
	}

	// Configurar endpoint resolver personalizado para DigitalOcean Spaces (u otro S3 compatible)
	customResolver := aws.EndpointResolverWithOptionsFunc(func(service, region string, options ...interface{}) (aws.Endpoint, error) {
		return aws.Endpoint{
			URL:           cfg.S3Endpoint,
			SigningRegion: cfg.S3Region,
		}, nil
	})

	awsCfg, err := s3config.LoadDefaultConfig(context.TODO(),
		s3config.WithEndpointResolverWithOptions(customResolver),
		s3config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(cfg.S3AccessKey, cfg.S3SecretKey, "")),
		s3config.WithRegion(cfg.S3Region),
	)
	if err != nil {
		return nil, err
	}

	client := s3.NewFromConfig(awsCfg)

	return &S3Storage{
		Client:   client,
		Bucket:   cfg.S3Bucket,
		CDNURL:   cfg.S3CDNURL,
		Endpoint: cfg.S3Endpoint,
	}, nil
}

// UploadBytes sube datos ya procesados a S3 con el content type indicado.
func (s *S3Storage) UploadBytes(data []byte, folder, filename, contentType string) (string, error) {
	key := fmt.Sprintf("%s/%d-%s", folder, time.Now().UnixNano(), filename)

	_, err := s.Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:        aws.String(s.Bucket),
		Key:           aws.String(key),
		Body:          bytes.NewReader(data),
		ContentType:   aws.String(contentType),
		ContentLength: aws.Int64(int64(len(data))),
		ACL:           s3types.ObjectCannedACLPublicRead,
	})
	if err != nil {
		return "", err
	}

	return s.buildURL(key), nil
}

func (s *S3Storage) buildURL(key string) string {
	if s.CDNURL != "" && s.CDNURL != "TU_CDN_URL" {
		return fmt.Sprintf("%s/%s", strings.TrimSuffix(s.CDNURL, "/"), key)
	}
	domain := strings.TrimPrefix(s.Endpoint, "https://")
	domain = strings.TrimPrefix(domain, "http://")
	return fmt.Sprintf("https://%s.%s/%s", s.Bucket, domain, key)
}

func (s *S3Storage) UploadFile(fileHeader *multipart.FileHeader, folder string) (string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return "", err
	}
	defer file.Close()

	// Generar un nombre de archivo único para evitar sobreescritura
	fileName := fmt.Sprintf("%d-%s", time.Now().UnixNano(), strings.ReplaceAll(fileHeader.Filename, " ", "_"))
	key := fmt.Sprintf("%s/%s", folder, fileName)

	// Subir archivo al S3 compatible con ACL de lectura pública
	_, err = s.Client.PutObject(context.TODO(), &s3.PutObjectInput{
		Bucket:      aws.String(s.Bucket),
		Key:         aws.String(key),
		Body:        file,
		ContentType: aws.String(fileHeader.Header.Get("Content-Type")),
		ACL:         s3types.ObjectCannedACLPublicRead,
	})
	if err != nil {
		return "", err
	}

	return s.buildURL(key), nil
}
