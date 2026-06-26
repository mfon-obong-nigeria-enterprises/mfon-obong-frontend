# ============================================
# STAGE 1: Build Stage
# ============================================
# Use Node.js to install dependencies and compile the React app
# into static HTML, CSS, and JavaScript files

FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Copy package files FIRST (for better layer caching)
COPY package*.json ./

# Install ALL dependencies (needed for the build process)
RUN npm ci

# Copy the rest of the source code
COPY . .

# Build-time arguments — these are passed in by GitHub Actions
# during the Docker build step (different values for staging vs production)
# Vite bakes these into the compiled files at build time, NOT at runtime.
ARG VITE_API_URL
ARG VITE_LOGIN_API
ARG VITE_SOCKET_URL

# Expose the ARGs as environment variables so Vite can read them during build
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_LOGIN_API=$VITE_LOGIN_API
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

# Compile the React app into static files (outputs to /app/dist)
RUN npm run build


# ============================================
# STAGE 2: Production Stage
# ============================================
# Use Nginx — a lightweight web server — to serve the static files.
# We don't need Node.js at all in production for a React app.
# This makes the final image much smaller and more secure.

FROM nginx:alpine AS production

# Copy the compiled React app from the build stage into Nginx's web root
# (the folder Nginx serves files from by default)
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy our custom Nginx configuration
# This handles React Router (so page refreshes don't return 404)
# and adds performance optimizations like gzip and caching
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 (standard HTTP port — Nginx default)
EXPOSE 80

# Start Nginx in the foreground
# "daemon off" keeps Nginx running as the main process (required for Docker)
CMD ["nginx", "-g", "daemon off;"]
