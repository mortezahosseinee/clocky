# Zero-dependency, ultra-fast production container
# Runs instantly with no npm install or network downloads during docker build
FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy pre-bundled standalone server and frontend static build
COPY server.cjs ./server.cjs
COPY dist ./dist

EXPOSE 3000

# Directly launch pre-bundled server with native node (no tsx, npm, or network required)
CMD ["node", "server.cjs"]
