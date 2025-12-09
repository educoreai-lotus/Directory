# Backend production Dockerfile
# Build & run locally (reference):
# cd backend
# docker build -t directory-backend:0.0.1 .
# docker run -p 3001:3001 directory-backend:0.0.1

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["npm", "start"]

