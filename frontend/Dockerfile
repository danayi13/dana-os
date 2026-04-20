FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# --host 0.0.0.0 makes Vite listen on all interfaces so the port is
# reachable from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
