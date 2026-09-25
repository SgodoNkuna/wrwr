# Tshehla AgriHub: self-hosted image (alternative to Vercel).
# Build:  docker build --build-arg VITE_SUPABASE_URL=... --build-arg VITE_SUPABASE_ANON_KEY=... -t tshehla-agrihub .
# Run:    docker run -p 8080:8080 -e SITE_URL=https://your-domain tshehla-agrihub

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
# Public, browser-safe values (the publishable key is designed to be public).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
RUN test -n "$VITE_SUPABASE_URL" && test -n "$VITE_SUPABASE_ANON_KEY" || (echo "Pass VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY as build args" && exit 1)
RUN npm test && npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=8080
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV SUPABASE_URL=$VITE_SUPABASE_URL SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
COPY --from=build /app/dist ./dist
COPY server ./server
COPY vercel.json package.json ./
USER node
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
CMD ["node", "server/index.mjs"]
