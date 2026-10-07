#!/bin/bash
# Automation script for bootstrapping and renewing Let's Encrypt SSL certificates with Certbot and Nginx
# Usage: ./init_ssl.sh <domain_name> [email] [staging_flag: 0 or 1]
# Example: ./init_ssl.sh example.com admin@example.com

set -e

if [ -z "$1" ]; then
  echo "خطا: لطفاً نام دامنه را به عنوان آرگومان وارد کنید."
  echo "Usage: $0 <domain_name> [email] [staging: 0|1]"
  echo "Example: $0 clocky.example.com admin@example.com"
  exit 1
fi

DOMAIN="$1"
EMAIL="${2:-admin@$DOMAIN}"
STAGING="${3:-0}"
RSA_KEY_SIZE=4096

DATA_PATH="../clocky-data/certbot"
NGINX_PATH="../clocky-data/nginx"

echo "=========================================================="
echo "  شروع راه‌اندازی SSL برای دامنه: $DOMAIN"
echo "  ایمیل مدیر: $EMAIL"
echo "  حالت تستی (Staging): $STAGING"
echo "=========================================================="

# 0. Detect Docker Compose Command (v2 plugin vs v1 standalone)
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo ""
  echo "❌ خطا: دستور docker compose یا docker-compose در سیستم یافت نشد."
  echo "Docker Compose is not installed on this system."
  echo ""
  echo "لطفاً با یکی از دستورات زیر ابزار Compose را روی سرور خود نصب فرمایید:"
  echo "  1) برای اوبونتو/دبیان (روش مدرن):"
  echo "     sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
  echo ""
  echo "  2) یا نصب پکیج مستقل docker-compose:"
  echo "     sudo apt-get update && sudo apt-get install -y docker-compose"
  echo ""
  exit 1
fi

echo "### ابزار Docker Compose شناسایی شد: $COMPOSE_CMD"

# 1. Ensure external clocky-data directory structure exists
mkdir -p "$DATA_PATH/conf"
mkdir -p "$DATA_PATH/www"
mkdir -p "$NGINX_PATH"

# 2. Synchronize and update nginx.conf with the specified domain
if [ ! -f "$NGINX_PATH/nginx.conf" ] && [ -f "./nginx/nginx.conf" ]; then
  cp "./nginx/nginx.conf" "$NGINX_PATH/nginx.conf"
fi

if [ -f "$NGINX_PATH/nginx.conf" ]; then
  echo "### تنظیم نام دامنه $DOMAIN در فایل کانفیگ Nginx ..."
  sed -i "s|/etc/letsencrypt/live/[^/]*/|/etc/letsencrypt/live/$DOMAIN/|g" "$NGINX_PATH/nginx.conf"
fi

# 3. Check for existing certificate
if [ -d "$DATA_PATH/conf/live/$DOMAIN" ]; then
  read -p "گواهی قبلی برای $DOMAIN یافت شد. آیا مایل به جایگزینی هستید؟ (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    echo "عملیات متوقف گردید."
    exit 0
  fi
fi

# 4. Download recommended TLS parameters if not present
if [ ! -e "$DATA_PATH/conf/options-ssl-nginx.conf" ] || [ ! -e "$DATA_PATH/conf/ssl-dhparams.pem" ]; then
  echo "### دریافت تنظیمات امنیتی TLS و پارامترهای DH ..."
  mkdir -p "$DATA_PATH/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$DATA_PATH/conf/options-ssl-nginx.conf" || true
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$DATA_PATH/conf/ssl-dhparams.pem" || true
fi

# 5. Create dummy certificate to allow initial Nginx startup
echo "### ایجاد گواهی موقت برای راه‌اندازی اولیه Nginx ..."
mkdir -p "$DATA_PATH/conf/live/$DOMAIN"

if command -v openssl >/dev/null 2>&1; then
  openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
    -keyout "$DATA_PATH/conf/live/$DOMAIN/privkey.pem" \
    -out "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" \
    -subj "/CN=localhost" >/dev/null 2>&1
else
  DUMMY_PATH="/etc/letsencrypt/live/$DOMAIN"
  $COMPOSE_CMD run --rm --entrypoint "\
    openssl req -x509 -nodes -newkey rsa:$RSA_KEY_SIZE -days 1 \
      -keyout '$DUMMY_PATH/privkey.pem' \
      -out '$DUMMY_PATH/fullchain.pem' \
      -subj '/CN=localhost'" certbot
fi

# 6. Start nginx so ACME challenges can be served
echo "### اجرای سرویس Nginx ..."
$COMPOSE_CMD up --force-recreate -d nginx

# 7. Delete dummy certificate
echo "### حذف گواهی موقت ..."
rm -Rf "$DATA_PATH/conf/live/$DOMAIN"
rm -Rf "$DATA_PATH/conf/archive/$DOMAIN"
rm -Rf "$DATA_PATH/conf/renewal/$DOMAIN.conf"

# 8. Request real Let's Encrypt certificate
echo "### درخواست گواهی رسمی Let's Encrypt برای $DOMAIN ..."
STAGING_ARG=""
if [ "$STAGING" != "0" ]; then
  STAGING_ARG="--staging"
fi

$COMPOSE_CMD run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $STAGING_ARG \
    --email $EMAIL \
    -d $DOMAIN \
    --rsa-key-size $RSA_KEY_SIZE \
    --agree-tos \
    --no-eff-email \
    --force-renewal" certbot

# 9. Reload nginx to apply new certificate
echo "### بارگذاری مجدد کانفیگ Nginx با گواهی رسمی جدید ..."
if docker ps --format '{{.Names}}' | grep -q "^attendance_nginx$"; then
  docker exec attendance_nginx nginx -s reload
else
  $COMPOSE_CMD exec nginx nginx -s reload
fi

# 10. Check result
if [ -f "$DATA_PATH/conf/live/$DOMAIN/fullchain.pem" ]; then
  echo "=========================================================="
  echo "  ✅ گواهی SSL با موفقیت برای $DOMAIN نصب و فعال شد!"
  echo "  دیمن تمدید خودکار نیز در کانتینر certbot هر ۱۲ ساعت فعال است."
  echo "=========================================================="
else
  echo "=========================================================="
  echo "  ⚠️ هشدار: فرایند به پایان رسید اما فایل گواهی در مسیر زیر یافت نشد:"
  echo "  $DATA_PATH/conf/live/$DOMAIN/fullchain.pem"
  echo "  لطفاً لاگ‌های خروجی بالا و رکورد A در DNS دامنه را بررسی فرمایید."
  echo "=========================================================="
fi
