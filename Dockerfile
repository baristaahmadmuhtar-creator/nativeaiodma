# Production Dockerfile for AIODMA Digital Menu & Cashier
FROM nginx:1.27-alpine-slim

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy all web assets
WORKDIR /usr/share/nginx/html
COPY . .

# Expose port 8080 (Google Cloud Run / standard HTTP)
EXPOSE 8080

# Run nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
