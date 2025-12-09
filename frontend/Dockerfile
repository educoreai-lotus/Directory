# Frontend Dockerfile (build then serve with nginx)
# Build & run locally (reference):
# cd frontend
# docker build -t directory-frontend:0.0.1 .
# docker run -p 3000:80 directory-frontend:0.0.1

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install --production=false

COPY . .
RUN npm run build

FROM nginx:1.25-alpine AS prod

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

