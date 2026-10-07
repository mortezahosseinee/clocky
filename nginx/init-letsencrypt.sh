#!/bin/bash
# Automation script for bootstrapping and renewing Let's Encrypt SSL certificates with Certbot and Nginx

set -e

domains=("yourdomain.com" "www.yourdomain.com")
rsa_key_size=4096
data_path="../clocky-data/certbot"
email="admin@yourdomain.com" # Adding a valid address is strongly recommended
staging=0 # Set to 1 if you're testing your setup to avoid hitting request limits

# 0. Detect Docker Compose Command (v2 plugin vs v1 standalone)
if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD="docker-compose"
else
  echo "❌ Error: Neither 'docker compose' nor 'docker-compose' command was found."
  echo "Please install Docker Compose:"
  echo "  sudo apt-get update && sudo apt-get install -y docker-compose-plugin"
  exit 1
fi

# Ensure clocky-data directory structure exists
mkdir -p "$data_path/conf"
mkdir -p "$data_path/www"
mkdir -p "../clocky-data/nginx"
if [ ! -f "../clocky-data/nginx/nginx.conf" ] && [ -f "./nginx/nginx.conf" ]; then
  cp "./nginx/nginx.conf" "../clocky-data/nginx/nginx.conf"
fi

if [ -d "$data_path/conf/live" ]; then
  read -p "Existing data found for $domains. Continue and replace existing certificate? (y/N) " decision
  if [ "$decision" != "Y" ] && [ "$decision" != "y" ]; then
    exit
  fi
fi

if [ ! -e "$data_path/conf/options-ssl-nginx.conf" ] || [ ! -e "$data_path/conf/ssl-dhparams.pem" ]; then
  echo "### Downloading recommended TLS parameters ..."
  mkdir -p "$data_path/conf"
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot-nginx/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf > "$data_path/conf/options-ssl-nginx.conf" || true
  curl -s https://raw.githubusercontent.com/certbot/certbot/master/certbot/certbot/ssl-dhparams.pem > "$data_path/conf/ssl-dhparams.pem" || true
  echo
fi

echo "### Creating dummy certificate for $domains ..."
mkdir -p "$data_path/conf/live/$domains"

if command -v openssl >/dev/null 2>&1; then
  openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1 \
    -keyout "$data_path/conf/live/$domains/privkey.pem" \
    -out "$data_path/conf/live/$domains/fullchain.pem" \
    -subj "/CN=localhost" >/dev/null 2>&1
else
  path="/etc/letsencrypt/live/$domains"
  $COMPOSE_CMD run --rm --entrypoint "\
    openssl req -x509 -nodes -newkey rsa:$rsa_key_size -days 1\
      -keyout '$path/privkey.pem' \
      -out '$path/fullchain.pem' \
      -subj '/CN=localhost'" certbot
fi
echo

echo "### Starting nginx ..."
$COMPOSE_CMD up --force-recreate -d nginx
echo

echo "### Deleting dummy certificate for $domains ..."
rm -Rf "$data_path/conf/live/$domains"
rm -Rf "$data_path/conf/archive/$domains"
rm -Rf "$data_path/conf/renewal/$domains.conf"
echo

echo "### Requesting Let's Encrypt certificate for $domains ..."
domain_args=""
for domain in "${domains[@]}"; do
  domain_args="$domain_args -d $domain"
done

case "$email" in
  "") email_arg="--register-unsafely-without-email" ;;
  *) email_arg="--email $email" ;;
esac

if [ $staging != "0" ]; then staging_arg="--staging"; fi

$COMPOSE_CMD run --rm --entrypoint "\
  certbot certonly --webroot -w /var/www/certbot \
    $staging_arg \
    $email_arg \
    $domain_args \
    --rsa-key-size $rsa_key_size \
    --agree-tos \
    --force-renewal" certbot
echo

echo "### Reloading nginx ..."
if docker ps --format '{{.Names}}' | grep -q "^attendance_nginx$"; then
  docker exec attendance_nginx nginx -s reload
else
  $COMPOSE_CMD exec nginx nginx -s reload
fi
echo "### SSL Certificate successfully installed and automated auto-renewal daemon is running in certbot service."
