FROM node:20-alpine

WORKDIR /app

# Installeer dependencies
COPY package*.json ./
RUN npm ci

# Source code wordt via volume gemount voor hot reload
# Alleen node_modules blijven in de container

EXPOSE 3000

# Start Next.js in development mode met hot reload
CMD ["npm", "run", "dev"]