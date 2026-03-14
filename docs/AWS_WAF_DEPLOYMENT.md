# Deploy ATRAVAD WAF EDGE on AWS

Step-by-step instructions to run the WAF proxy server (`proxy-server-standalone.js`) on AWS so customer traffic flows through your AWS edge. You can run it on **EC2** (VM) or **ECS** (containers). Same code as the [Data Center deployment](./DATA_CENTER_WAF_DEPLOYMENT.md). Choose **Data Center** for on-prem or **AWS** for cloud.

---

## Deployment options

| Option | Best for | SSL | Scaling |
|--------|----------|-----|--------|
| **EC2** | Single instance, full control, Nginx + Certbot or ALB | ALB + ACM (recommended) or Nginx + Let's Encrypt | Manual / ASG |
| **ECS Fargate** | Containers, no server management, ALB | ALB + ACM | Service desired count / ASG |

---

## What you need before you start

| Requirement | Details |
|-------------|---------|
| **AWS account** | VPC with public subnets (or private + NAT for outbound). |
| **Outbound internet** | Instance/task must reach **Firebase**: `firestore.googleapis.com` (and optionally `*.googleapis.com`). |
| **Firebase** | Same Firebase project as your Dashboard. Use a **service account** with Firestore read access. |
| **Node.js** | Version **18+** (LTS) on EC2, or use the provided Docker image for ECS. |

---

## Part A: Deploy on EC2

### A.1 Launch an EC2 instance

1. In **AWS Console** → **EC2** → **Launch instance**.
2. **Name:** e.g. `atravad-waf-edge`.
3. **AMI:** Ubuntu 22.04 LTS (or Amazon Linux 2023).
4. **Instance type:** e.g. `t3.small` (2 vCPU, 2 GB RAM); scale up for traffic.
5. **Key pair:** Create or select one for SSH.
6. **Network:** Use a VPC with at least one **public subnet** and **auto-assign public IP** enabled (or use an Elastic IP).
7. **Security group (create new):**
   - **Inbound:** Allow **80** (HTTP) and **443** (HTTPS) from `0.0.0.0/0` (or your LB/Customer IPs).
   - If the WAF listens on **8080** and an ALB forwards to it, allow **8080** from the ALB security group only.
   - **Outbound:** Allow all (or at least HTTPS to `0.0.0.0/0` for Firebase and origins).
8. **Storage:** 8–20 GB is usually enough.
9. Launch the instance and note its **public IP** (or attach an **Elastic IP**).

### A.2 Connect and install Node.js

```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_PUBLIC_IP
```

**Ubuntu:**

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # v20.x
npm -v
```

### A.3 Deploy the application

**Option 1 – Clone from Git:**

```bash
cd /opt
sudo git clone https://github.com/your-org/atravad-waf.git
sudo chown -R $USER:$USER atravad-waf
cd atravad-waf
```

**Option 2 – Copy files** (e.g. from your machine via SCP or CodeDeploy):

- Copy the project (at least `proxy-server-standalone.js`, `src/lib/`, `package.json`, etc.).

**Install dependencies:**

```bash
cd /opt/atravad-waf
npm install --omit=dev
```

### A.4 Configure environment variables

Create `.env.waf` (do not commit to Git):

```bash
nano /opt/atravad-waf/.env.waf
```

**Firebase (required):**

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

**WAF options (optional):**

```env
# Multi-tenant: unset = all tenants; or single/comma-separated (max 10)
# ATRAVAD_TENANT_NAME=Acme
# ATRAVAD_TENANT_NAME=Acme,Corp

# Port: 80 if WAF is the only listener; 8080 if ALB or Nginx forwards to this port
ATRAVAD_HTTP_PORT=80
# ATRAVAD_HTTPS_PORT=443
```

When using an **Application Load Balancer** (recommended on AWS), set `ATRAVAD_HTTP_PORT=8080` and have the ALB forward to port 8080. The ALB will terminate SSL with an ACM certificate.

```bash
sudo chown root:www-data /opt/atravad-waf/.env.waf
sudo chmod 640 /opt/atravad-waf/.env.waf
sudo mkdir -p /opt/atravad-waf/certs
sudo chown -R www-data:www-data /opt/atravad-waf/certs
sudo find /opt/atravad-waf/certs -type d -exec chmod 750 {} \;
sudo find /opt/atravad-waf/certs -type f -exec chmod 640 {} \;
```

### A.5 Run the WAF proxy

**Test run:**

```bash
cd /opt/atravad-waf
node proxy-server-standalone.js
# Or with env file: node proxy-server-standalone.js --env-file=/opt/atravad-waf/.env.waf
```

**Production with PM2:**

```bash
sudo npm install -g pm2
cd /opt/atravad-waf
pm2 start proxy-server-standalone.js --name atravad-waf --env-file .env.waf
pm2 save
pm2 startup
# Run the command that pm2 startup prints
```

**Optional – systemd:** See [DATA_CENTER_WAF_DEPLOYMENT.md](./DATA_CENTER_WAF_DEPLOYMENT.md) Step 5.3; use `WorkingDirectory=/opt/atravad-waf` and `EnvironmentFile=/opt/atravad-waf/.env.waf`.

### A.6 SSL/TLS on AWS (recommended: ALB + ACM)

**Option 1 – Application Load Balancer + ACM (recommended)**

1. **Create an Application Load Balancer** in the same VPC:
   - Scheme: **internet-facing**.
   - Listeners: **HTTP 80** (optional redirect to 443) and **HTTPS 443** with an **ACM certificate**.
2. **Create a target group:**
   - Type: **Instance**.
   - Protocol: **HTTP**, port **8080** (or the port your WAF listens on).
   - Health check: **Path** = `/health`, **Protocol** = HTTP, **Port** = 8080.
3. **Register** your EC2 instance in the target group.
4. **Security group:** Allow inbound **8080** from the ALB security group to the EC2 instance; allow **80** and **443** on the ALB from `0.0.0.0/0`.
5. Set **ATRAVAD_HTTP_PORT=8080** in `.env.waf` and restart the WAF.

Customers (and DNS) point to the **ALB DNS name** (or the CNAME you assign). SSL is terminated at the ALB; the WAF receives HTTP on 8080.

**Option 2 – Nginx + Let's Encrypt on EC2**

If you prefer the WAF host to terminate SSL (e.g. no ALB):

- Follow [DATA_CENTER_WAF_DEPLOYMENT.md](./DATA_CENTER_WAF_DEPLOYMENT.md) Step 6: install Nginx and Certbot, set `ATRAVAD_HTTP_PORT=8080`, and run `certbot --nginx -d waf-aws.yourcompany.com`.

---

## Part B: Deploy on ECS (Fargate)

### B.1 Build and push the Docker image

A **Dockerfile** is provided in the project root. Build and push to **Amazon ECR**:

```bash
# From project root
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com
docker build -t atravad-waf-proxy -f Dockerfile.waf .
docker tag atravad-waf-proxy:latest YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/atravad-waf-proxy:latest
docker push YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/atravad-waf-proxy:latest
```

Replace `YOUR_ACCOUNT_ID` and `us-east-1` with your AWS account ID and region. Create the ECR repository if needed:

```bash
aws ecr create-repository --repository-name atravad-waf-proxy --region us-east-1
```

### B.2 Store Firebase credentials in AWS Secrets Manager

1. **AWS Console** → **Secrets Manager** → **Store a new secret**.
2. **Secret type:** Other (key/value).
3. Add keys (match the env var names the app reads):
   - `FIREBASE_PROJECT_ID` = your Firebase project ID
   - `FIREBASE_CLIENT_EMAIL` = service account email
   - `FIREBASE_PRIVATE_KEY` = full private key string (with `\n` for newlines)
4. **Secret name:** e.g. `atravad-waf/firebase-admin`.
5. Create the secret.

### B.3 Create ECS cluster and task definition

1. **ECS** → **Clusters** → **Create cluster** (e.g. `atravad-waf`, Fargate).
2. **Task definition** → **Create new**:
   - **Family:** `atravad-waf-proxy`.
   - **Task size:** 0.5 vCPU, 1 GB memory (scale up as needed).
   - **Container:**
     - **Image:** `YOUR_ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/atravad-waf-proxy:latest`.
     - **Port mappings:** **8080** (TCP).
     - **Environment (optional):** `ATRAVAD_HTTP_PORT=8080`, `ATRAVAD_TENANT_NAME=Acme` (or leave empty for all tenants).
      - **Secrets:** Add from Secrets Manager:
       - `FIREBASE_PROJECT_ID` → secret `atravad-waf/firebase-admin`, key `FIREBASE_PROJECT_ID`
       - `FIREBASE_CLIENT_EMAIL` → same secret, key `FIREBASE_CLIENT_EMAIL`
       - `FIREBASE_PRIVATE_KEY` → same secret, key `FIREBASE_PRIVATE_KEY`
   - **Log configuration:** AWS Logs (e.g. log group `atravad-waf-proxy`).
   - **Health check (optional):** CMD-SHELL `curl -f http://localhost:8080/health || exit 1` or use ALB health check only.
3. **Task role:** Ensure the task can pull from ECR and read Secrets Manager (or attach a policy that allows `secretsmanager:GetSecretValue`).
4. Create the task definition.

### B.4 Create Application Load Balancer and ECS service

1. **EC2** → **Load Balancers** → **Create Application Load Balancer**:
   - **Listeners:** HTTPS 443 (with ACM cert), optional HTTP 80 → redirect to 443.
   - **Availability Zones:** at least two in your VPC.
2. **Target group** for the ALB:
   - **Target type:** IP (for Fargate).
   - **Protocol:** HTTP, **Port:** 8080.
   - **Health check:** Path `/health`, protocol HTTP, port 8080.
3. **ECS** → **Clusters** → **atravad-waf** → **Create service**:
   - **Launch type:** Fargate.
   - **Task definition:** `atravad-waf-proxy`.
   - **Desired tasks:** 1 (or more for HA).
   - **VPC / subnets:** Use **private subnets** with NAT so tasks can reach Firebase and origins.
   - **Security group:** Allow **8080** from the ALB security group; outbound allow HTTPS.
   - **Load balancing:** Add to the ALB, use the target group you created.
   - **Service discovery (optional):** Skip unless you need it.
4. Create the service. ECS will place tasks in the subnets and register them with the target group.

### B.5 ALB security group and public access

- **ALB security group:** Inbound **80** and **443** from `0.0.0.0/0`.
- **Fargate task security group:** Inbound **8080** only from the ALB security group.

Customers (and DNS) point to the **ALB DNS name** or the CNAME you assign to the ALB.

---

## Step 7: Point DNS and update the Dashboard

### 7.1 Public address

- **EC2:** Use the EC2 **Elastic IP** or **public IP** (if no ALB), or the **ALB DNS name** (recommended).
- **ECS:** Use the **ALB DNS name** (e.g. `atravad-waf-1234567890.us-east-1.elb.amazonaws.com`).

Create a **CNAME** (e.g. `waf-aws.yourcompany.com`) pointing to the ALB DNS name so you can use a friendly name and swap ALBs later.

### 7.2 Update Dashboard WAF_REGIONS

On the machine or deployment where the **Dashboard** runs, set **WAF_REGIONS** to include your AWS endpoint:

**If using ALB (recommended):**

```env
WAF_REGIONS=[{"id":"aws","name":"AWS","ip":"ALB_DNS_OR_CNAME","cname":"waf-aws.yourcompany.com","continents":["NA","SA","EU","AF","AS","OC"]}]
WAF_DEFAULT_REGION=aws
```

Use the **ALB DNS name** or your **CNAME** for `ip` and `cname`. Customers will point their domain’s A or CNAME to this.

**If using EC2 public IP only (no ALB):**

```env
WAF_REGIONS=[{"id":"aws","name":"AWS","ip":"3.xxx.xxx.xxx","cname":"waf-aws.yourcompany.com","continents":["NA","SA","EU","AF","AS","OC"]}]
```

Restart or redeploy the Dashboard so it picks up the new env.

---

## Step 8: Verify and monitor

### 8.1 Health check

- **Health endpoint:** `curl -v http://YOUR_ALB_DNS/health` or `http://YOUR_ALB_DNS/_atravad/health`  
  Returns `200` and JSON: `{"status":"ok","service":"atravad-waf","tenant":"all","applications":N}`.  
  Use this for ALB target group health checks (path `/health`).
- **Unknown Host:** `curl -v http://YOUR_ALB_DNS/` may return "Application not found for domain" if no application is configured for that Host; that confirms the proxy is running and routing by Host.

### 8.2 Logs

- **EC2 + PM2:** `pm2 logs atravad-waf`
- **EC2 + systemd:** `journalctl -u atravad-waf -f`
- **ECS:** **CloudWatch Logs** in the log group you configured (e.g. `atravad-waf-proxy`).

### 8.3 Firestore

Confirm the proxy can read Firestore: Firebase Console → Firestore; ensure `applications` (and optionally `policies`) exist and the service account has read access.

---

## Checklist summary

### EC2

| Step | Action |
|------|--------|
| A.1 | Launch EC2 (Ubuntu 22.04, t3.small, security group 80/443 or 8080 from ALB). |
| A.2 | Install Node.js 18+. |
| A.3 | Deploy code; `npm install --omit=dev`. |
| A.4 | Create `.env.waf` with Firebase and `ATRAVAD_*` (e.g. port 8080 for ALB). |
| A.5 | Run with PM2 or systemd. |
| A.6 | ALB + ACM for SSL, target group port 8080, health path `/health`. |
| 7–8 | Set Dashboard `WAF_REGIONS` to ALB DNS/cname; verify `/health` and test app. |

### ECS Fargate

| Step | Action |
|------|--------|
| B.1 | Build image with `Dockerfile.waf`, push to ECR. |
| B.2 | Store Firebase credentials in Secrets Manager. |
| B.3 | Create ECS task definition (container port 8080, secrets from Secrets Manager). |
| B.4 | Create ALB + target group (port 8080, health `/health`); create ECS service. |
| B.5 | ALB security group 80/443 from internet; task SG 8080 from ALB only. |
| 7–8 | Set Dashboard `WAF_REGIONS` to ALB DNS/cname; verify and monitor. |

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| "Firebase Admin environment variables not set" | `.env.waf` on EC2; ECS: Secrets Manager keys and task role `secretsmanager:GetSecretValue`. |
| Target group unhealthy | Security group allows 8080 from ALB; WAF listens on 8080; path `/health` returns 200. |
| No applications loaded | Outbound HTTPS to `firestore.googleapis.com` (NAT for private subnets); Firestore rules. |
| 502 Bad Gateway | Origin URL reachable from EC2/ECS (NAT, security groups); check WAF logs. |

For more on architecture and traffic flow, see [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md). For on-premises deployment, see [DATA_CENTER_WAF_DEPLOYMENT.md](./DATA_CENTER_WAF_DEPLOYMENT.md).
