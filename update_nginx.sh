#!/bin/bash
set -e

NGINX_TARGET="../clocky-data/nginx/nginx.conf"

if [ -f "$NGINX_TARGET" ]; then
  DOMAIN=$(grep -o "live/[^/]*/" "$NGINX_TARGET" 2>/dev/null | head -n1 | cut -d'/' -f2 || echo "")
  cp ./nginx/nginx.conf "$NGINX_TARGET"
  if [ -n "$DOMAIN" ] && [ "$DOMAIN" != "yourdomain.com" ]; then
    sed -i "s|/etc/letsencrypt/live/[^/]*/|/etc/letsencrypt/live/$DOMAIN/|g" "$NGINX_TARGET"
  fi
  echo "✅ Updated $NGINX_TARGET (Domain preserved: ${DOMAIN:-none})"
else
  mkdir -p "../clocky-data/nginx"
  cp ./nginx/nginx.conf "$NGINX_TARGET"
  echo "✅ Created $NGINX_TARGET"
fi

if command -v docker >/dev/null 2>&1; then
  docker restart attendance_nginx || true
fi

echo "🚀 Nginx configuration successfully updated and reloaded!"
