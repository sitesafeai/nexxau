#!/bin/bash

# Security Check Script
echo "Running security checks..."

# Check if services are running
docker-compose -f docker-compose.yml -f docker-compose.secure.yml ps

# Check SSL certificate
echo "Checking SSL certificate..."
curl -I https://$DOMAIN 2>/dev/null | head -1

# Check security headers
echo "Checking security headers..."
curl -I https://$DOMAIN 2>/dev/null | grep -E "(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options)"

# Check rate limiting
echo "Testing rate limiting..."
for i in {1..10}; do
    curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN
    echo
done

echo "Security checks complete"
