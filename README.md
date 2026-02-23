# 🌳 Tree & Green Asset Tracker

A full-stack web application for municipalities and NGOs to track urban trees — from planting to maturity. Field workers geo-tag trees with photos, supervisors assign maintenance tasks, and admins monitor city-wide green coverage through an interactive map and dashboard.

**Live Demo:**
- 🌐 Frontend: https://tree-tracker-wheat.vercel.app
- ⚙️ Backend API: https://treetracker-backend.onrender.com/api/
- 📖 API Docs: https://treetracker-backend.onrender.com/api/docs/

---

## 🏗️ Architecture

```
tree-tracker/
├── backend/              # Django + DRF
│   ├── config/           # Settings, URLs
│   ├── apps/
│   │   ├── accounts/     # Custom user model, JWT auth, roles
│   │   ├── zones/        # City zones management
│   │   ├── trees/        # Tree registry, health logs, species
│   │   ├── tasks/        # Maintenance task workflows
│   │   └── reports/      # Analytics, PDF/CSV export
│   └── manage.py
├── frontend/             # React + Tailwind + Leaflet
│   └── src/
│       ├── pages/        # Dashboard, Map, Trees, Tasks, Zones, Reports
│       ├── components/   # Layout, sidebar
│       ├── context/      # Auth context
│       └── services/     # Axios API client
├── docker-compose.yml    # Local development
└── .github/workflows/    # CI pipeline
```

---

## ☁️ Deployment Stack (Free Tier)

| Service | Platform | Purpose |
|---------|----------|---------|
| Frontend | Vercel | React app hosting |
| Backend | Render | Django + Gunicorn |
| Database | Render PostgreSQL | Primary database |
| Images | Cloudinary | Tree photo storage |
| CI | GitHub Actions | Automated testing |

---

## 🚀 Quick Start (Docker - Local Dev)

```bash
# Clone the repo
git clone https://github.com/Shrey-sa/tree-tracker.git
cd tree-tracker

# Start everything (db + backend + frontend)
docker-compose up --build

# App running at:
#   Frontend: http://localhost:5173
#   Backend:  http://localhost:8000
#   API Docs: http://localhost:8000/api/docs/
```

**Demo credentials:**

| Role | Username | Password |
|------|----------|----------|
| Admin | `admin` | `admin123` |
| Supervisor | `supervisor1` | `pass1234` |
| Field Worker | `worker1` | `pass1234` |

---

## 🛠️ Local Development (Without Docker)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run migrations & seed demo data
python manage.py makemigrations accounts zones trees tasks
python manage.py migrate
python manage.py seed_data

# Start server
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login/` | Get JWT tokens |
| POST | `/api/auth/token/refresh/` | Refresh access token |
| GET | `/api/auth/me/` | Get current user |
| POST | `/api/auth/register/` | Create user (admin only) |

### Trees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/trees/` | List trees (filterable by zone, health, species) |
| POST | `/api/trees/` | Register new tree with photo |
| GET | `/api/trees/:id/` | Tree detail with full health history |
| PATCH | `/api/trees/:id/health/` | Update health status |
| GET | `/api/trees/map/` | Lightweight map markers data |
| GET | `/api/species/` | List all species |

### Zones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zones/` | List all zones |
| POST | `/api/zones/` | Create zone |
| GET | `/api/zones/:id/stats/` | Zone health breakdown |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/` | List tasks (field workers see only their own) |
| POST | `/api/tasks/` | Create task (supervisor/admin only) |
| PATCH | `/api/tasks/:id/complete/` | Mark task complete with notes |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/summary/` | City-wide stats dashboard |
| GET | `/api/reports/trends/` | 12-month planting trends |
| GET | `/api/reports/export/pdf/` | Download PDF report |
| GET | `/api/reports/export/csv/` | Download full tree registry CSV |

---

## 👥 User Roles & Permissions

| Role | What they can do |
|------|-----------------|
| **Admin** | Full access — manage users, all zones, all tasks, download reports |
| **Supervisor** | Create and assign maintenance tasks, view zone stats |
| **Field Worker** | Register trees, update health status, complete their assigned tasks |

---

## 🌟 Key Features

- **Interactive Map** — Leaflet.js map with color-coded health markers (green/amber/red), click popup with tree details and direct link to tree page
- **Tree Registry** — Each tree gets a unique auto-generated tag (TRK-00001), species info, GPS coordinates, photo upload, and full health history timeline
- **Health Tracking** — Every health update is logged with who made the change, previous status, new status, notes, and timestamp
- **Maintenance Workflows** — Supervisors create water/prune/treat/inspect tasks with priority levels and due dates, assigned to specific field workers
- **Reports & Export** — City-wide survival rates, zone comparison charts, monthly planting trends, downloadable PDF and CSV
- **Cloudinary Image Storage** — Tree photos uploaded by field workers are stored on Cloudinary and persist across deployments
- **JWT Authentication** — Role-based access control across all API endpoints, 24h access tokens with auto-refresh

---

## 🗂️ Database Schema

```
users          → id, username, email, role (admin/supervisor/field_worker)
zones          → id, name, city, center_lat, center_lng, area_sq_km
species        → id, common_name, scientific_name, watering_frequency_days, native
trees          → id, tag_number, species_fk, zone_fk, latitude, longitude,
                 current_health, planted_date, height_cm, photo, planted_by_fk
health_logs    → id, tree_fk, logged_by_fk, previous_health, health_status,
                 notes, photo, logged_at
maintenance_tasks → id, title, task_type, priority, zone_fk, tree_fk,
                    assigned_to_fk, due_date, status, completed_at, completed_by_fk
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router 6, Tailwind CSS |
| Maps | Leaflet.js + react-leaflet |
| Charts | Recharts |
| Backend | Django 4.2, Django REST Framework 3.14 |
| Auth | JWT (djangorestframework-simplejwt) |
| Database | PostgreSQL 15 |
| Image Storage | Cloudinary |
| Static Files | WhiteNoise |
| API Docs | drf-spectacular (Swagger UI) |
| Frontend Deploy | Vercel |
| Backend Deploy | Render (Docker) |
| CI | GitHub Actions |

---

## 🌱 Seed Data

Running `python manage.py seed_data` creates:

- 5 zones (Bangalore North/South/East/West/Central)
- 8 tree species (Neem, Peepal, Gulmohar, Banyan, Rain Tree, Tamarind, Ashoka, Silver Oak)
- 9 users (1 admin, 3 supervisors, 5 field workers)
- 240 trees across all zones with realistic health distribution
- 40 maintenance tasks with varied statuses and priorities

---
