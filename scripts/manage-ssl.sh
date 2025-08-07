#!/bin/bash

# SSL Certificate Management Script
DOMAIN="${DOMAIN:-localhost}"
EMAIL="${ACME_EMAIL:-admin@example.com}"

echo "Managing SSL certificates for $DOMAIN..."

# Test certificate generation
docker-compose -f docker-compose.yml -f docker-compose.secure.yml up -d traefik

echo "Waiting for certificate generation..."
sleep 30

# Check certificate status
docker-compose -f docker-compose.yml -f docker-compose.secure.yml logs traefik | grep -i certificate

echo "SSL certificate management complete"
