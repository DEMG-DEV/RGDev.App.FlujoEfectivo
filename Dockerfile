FROM node:20-alpine

WORKDIR /app

# Enable corepack for pnpm support with pnpm 9
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy dependency manifests
COPY package.json pnpm-lock.yaml* ./

# Install project dependencies
RUN pnpm install

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start development server
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
