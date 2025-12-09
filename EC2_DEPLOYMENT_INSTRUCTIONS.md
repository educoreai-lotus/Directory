# AWS EC2 Manual Deployment Instructions

This guide walks you through manually deploying the Directory service on AWS EC2 using Docker and docker-compose.

---

## Prerequisites

- AWS EC2 instance running (Ubuntu or Amazon Linux)
- SSH access to EC2 instance
- Docker and Docker Compose installed on EC2
- Docker Hub images available: `jasminemograby/directory-backend:latest` and `jasminemograby/directory-frontend:latest`

---

## Step 1: Install Docker and Docker Compose on EC2

### For Ubuntu/Debian:

```bash
# Update system
sudo apt-get update

# Install Docker
sudo apt-get install -y docker.io

# Start Docker service
sudo systemctl enable --now docker

# Add ec2-user/ubuntu to docker group (replace with your username)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
exit
# (SSH back in)

# Install Docker Compose plugin
sudo apt-get install -y docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

### For Amazon Linux 2:

```bash
# Update system
sudo yum update -y

# Install Docker
sudo amazon-linux-extras install docker -y

# Start Docker service
sudo systemctl enable --now docker

# Add ec2-user to docker group
sudo usermod -aG docker ec2-user

# Log out and back in
exit
# (SSH back in)

# Install Docker Compose plugin
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker compose version
```

---

## Step 2: Create Project Directory on EC2

```bash
# Create directory
mkdir -p /home/ec2-user/directory
cd /home/ec2-user/directory
```

---

## Step 3: Create .env File on EC2

```bash
# Create .env file
nano /home/ec2-user/directory/.env
```

**Copy the contents from `.env.ec2.example` and fill in your actual values:**

```bash
# Example .env content (fill in YOUR actual values)
PORT=3001
NODE_ENV=production

# Database (Supabase)
DATABASE_URL=postgresql://user:password@host:5432/database
# OR use individual parameters:
DB_HOST=db.YOUR_PROJECT_REF.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=YOUR_ACTUAL_PASSWORD
DB_SSL=true
SUPABASE_PROJECT_REF=YOUR_PROJECT_REF

# Coordinator
COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app
SERVICE_NAME=directory-service
PRIVATE_KEY=YOUR_PRIVATE_KEY
COORDINATOR_PUBLIC_KEY=YOUR_PUBLIC_KEY

# Directory URL (use your EC2 public IP or domain)
DIRECTORY_URL=http://YOUR_EC2_PUBLIC_IP:8080
FRONTEND_URL=http://YOUR_EC2_PUBLIC_IP:3000

# Add other required variables from .env.ec2.example
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 4: Create docker-compose.yaml on EC2

```bash
# Create docker-compose.yaml
nano /home/ec2-user/directory/docker-compose.yaml
```

**Paste the following content:**

```yaml
version: "3.8"

services:
  backend:
    image: jasminemograby/directory-backend:latest
    container_name: directory-backend-ec2
    env_file:
      - .env
    environment:
      - PORT=3001
    ports:
      - "8080:3001"
    networks:
      - directory-net
    restart: unless-stopped

  frontend:
    image: jasminemograby/directory-frontend:latest
    container_name: directory-frontend-ec2
    environment:
      - VITE_API_URL=http://backend:3001
    ports:
      - "3000:80"
    depends_on:
      - backend
    networks:
      - directory-net
    restart: unless-stopped

networks:
  directory-net:
    driver: bridge
```

**Save and exit:** Press `Ctrl+X`, then `Y`, then `Enter`

---

## Step 5: Configure EC2 Security Group

Make sure your EC2 Security Group allows inbound traffic on:

- **Port 8080** (Backend API)
- **Port 3000** (Frontend)

**AWS Console → EC2 → Security Groups → Your Security Group → Inbound Rules:**

```
Type: Custom TCP
Port: 8080
Source: 0.0.0.0/0 (or your specific IP)

Type: Custom TCP
Port: 3000
Source: 0.0.0.0/0 (or your specific IP)
```

---

## Step 6: Pull and Start Containers

```bash
# Navigate to project directory
cd /home/ec2-user/directory

# Pull latest images from Docker Hub
docker compose pull

# Start containers
docker compose up -d

# Verify containers are running
docker ps

# Check logs
docker compose logs -f
```

**Expected output from `docker ps`:**

```
CONTAINER ID   IMAGE                                      STATUS         PORTS
xxx            jasminemograby/directory-backend:latest   Up X minutes   0.0.0.0:8080->3001/tcp
xxx            jasminemograby/directory-frontend:latest  Up X minutes   0.0.0.0:3000->80/tcp
```

---

## Step 7: Verify Deployment

1. **Check Backend Health:**
   ```bash
   curl http://localhost:8080/health
   # Or from your local machine:
   curl http://YOUR_EC2_PUBLIC_IP:8080/health
   ```

2. **Access Frontend:**
   - Open browser: `http://YOUR_EC2_PUBLIC_IP:3000`
   - Frontend should load and connect to backend

---

## Step 8: Useful Commands

### View Logs:
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

### Stop Containers:
```bash
docker compose down
```

### Restart Containers:
```bash
docker compose restart
```

### Update Containers (after new images pushed):
```bash
docker compose pull
docker compose up -d
```

### Remove Everything:
```bash
docker compose down -v
```

---

## Troubleshooting

### Containers won't start:
```bash
# Check logs
docker compose logs

# Check if images exist
docker images | grep directory

# Verify .env file exists and has correct values
cat .env
```

### Port already in use:
```bash
# Check what's using the port
sudo netstat -tulpn | grep :8080
sudo netstat -tulpn | grep :3000

# Stop conflicting service or change ports in docker-compose.yaml
```

### Database connection errors:
- Verify `.env` file has correct database credentials
- Check Supabase firewall allows your EC2 IP
- Verify `DB_SSL=true` is set

### Frontend can't connect to backend:
- Verify `VITE_API_URL=http://backend:3001` in docker-compose.yaml
- Check both containers are on the same network (`directory-net`)
- Verify backend container is running: `docker ps`

---

## Next Steps

After successful manual deployment, you can:

1. **Set up automatic deployments** using the GitHub Actions workflow (`.github/workflows/cd-ec2.yaml`)
2. **Configure a domain name** and update `DIRECTORY_URL` and `FRONTEND_URL` in `.env`
3. **Set up SSL/TLS** using Let's Encrypt or AWS Certificate Manager
4. **Configure monitoring** and logging

---

**Deployment Complete!** 🎉

Your Directory service should now be running on EC2 at:
- Backend: `http://YOUR_EC2_PUBLIC_IP:8080`
- Frontend: `http://YOUR_EC2_PUBLIC_IP:3000`

