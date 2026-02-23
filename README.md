# 🌳 Tree & Green Asset Tracker

A full-stack web application for municipalities and NGOs to track urban trees — from planting to maturity. Field workers geo-tag trees with photos, supervisors assign maintenance tasks, and admins monitor city-wide green coverage through an interactive map dashboard.

---

## 🏗️ Architecture

```
tree-tracker/
├── backend/           # Django + DRF + Celery
│   ├── config/        # Settings, URLs, Celery config
│   ├── apps/
│   │   ├── accounts/  # Custom user model, JWT auth, roles
│   │   ├── zones/     # City zones management
│   │   ├── trees/     # Tree registry, health logs, species
│   │   ├── tasks/     # Maintenance task workflows
│   │   └── reports/   # Analytics, PDF/CSV export
│   └── manage.py
├── frontend/          # React + Tailwind + Leaflet
│   └── src/
│       ├── pages/     # Dashboard, Map, Trees, Tasks, Zones, Reports
│       ├── components/ # Layout, sidebar
│       ├── context/   # Auth context
│       └── services/  # Axios API client
├── docker-compose.yml
└── .github/workflows/ # CI/CD pipeline
```

---

## 🚀 Quick Start (Docker)

```bash
# Clone the repo
git clone https://github.com/yourusername/tree-tracker.git
cd tree-tracker

# Start everything
docker-compose up --build

# App will be running at:
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
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run migrations & seed data
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

### Celery (for background tasks & email alerts)

```bash
cd backend
celery -A config worker --beat --loglevel=info
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
| GET | `/api/trees/` | List trees (filterable) |
| POST | `/api/trees/` | Register new tree |
| GET | `/api/trees/:id/` | Tree detail with health history |
| PATCH | `/api/trees/:id/health/` | Update health status |
| GET | `/api/trees/map/` | Lightweight map data |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/` | List tasks |
| POST | `/api/tasks/` | Create task (supervisor/admin) |
| PATCH | `/api/tasks/:id/complete/` | Mark task complete |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/summary/` | City-wide stats |
| GET | `/api/reports/trends/` | Monthly trends |
| GET | `/api/reports/export/pdf/` | Download PDF report |
| GET | `/api/reports/export/csv/` | Download trees CSV |

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — create users, view all zones, download reports |
| **Supervisor** | Create/assign tasks, view zone data, trigger alerts |
| **Field Worker** | Register trees, update health status, complete assigned tasks |

---

## 🌟 Key Features

- **Interactive Map** — Leaflet.js map with color-coded tree health markers, click-to-view popup with tree details
- **Tree Registry** — Each tree gets a unique tag (TRK-00001), species info, GPS coordinates, photo, health history
- **Health Timeline** — Every health status change is logged with who made the update and when
- **Maintenance Workflows** — Supervisors assign water/prune/treat tasks to field workers with due dates and priorities
- **Automated Alerts** — Celery + Redis sends daily email digests for overdue tasks and trees not inspected in 14 days
- **Reports & Export** — City-wide survival rate, zone comparison charts, downloadable PDF and CSV reports
- **JWT Auth** — Role-based access control across all endpoints

---

## ☁️ Cloud Deployment

### AWS Stack
- **EC2** — Backend (Gunicorn + Nginx)
- **RDS** — PostgreSQL (or PostgreSQL + PostGIS)
- **S3** — Tree photos and media storage
- **ElastiCache** — Redis for Celery
- **SES** — Email notifications

### Enable S3 Storage
```env
USE_S3=True
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_STORAGE_BUCKET_NAME=your-bucket
AWS_S3_REGION_NAME=ap-south-1
```

### Enable PostGIS (for advanced geo queries)
```env
DB_ENGINE=django.contrib.gis.db.backends.postgis
```
Then you can use GeoDjango's `PointField`, `PolygonField`, and spatial queries:
```python
# Find all trees within 500m of a point
Tree.objects.filter(location__distance_lte=(point, D(m=500)))
```

---

## 🗂️ Database Schema

```
users → (id, username, role, zone_fk)
zones → (id, name, city, center_lat, center_lng, area_sq_km)
species → (id, common_name, scientific_name, watering_frequency_days)
trees → (id, tag_number, species_fk, zone_fk, latitude, longitude, 
         current_health, planted_date, photo, planted_by_fk)
health_logs → (id, tree_fk, logged_by_fk, previous_health, health_status, logged_at)
maintenance_tasks → (id, title, task_type, priority, zone_fk, tree_fk,
                     assigned_to_fk, due_date, status, completed_at)
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Tailwind CSS, Leaflet.js, Recharts |
| Backend | Django 4.2, Django REST Framework |
| Auth | JWT (djangorestframework-simplejwt) |
| Database | PostgreSQL (+ PostGIS ready) |
| Cache/Queue | Redis, Celery |
| Storage | Local media / AWS S3 |
| Deployment | Docker, GitHub Actions, EC2 |
| API Docs | drf-spectacular (Swagger UI) |

---

## 📝 Interview Talking Points

1. **"I used Django REST Framework with custom permission classes for role-based access control — field workers can only complete their own tasks, supervisors manage their zone, admins see everything."**

2. **"The architecture is PostGIS-ready — I designed the models with lat/lng fields that can be upgraded to PostGIS PointFields to enable spatial queries like 'find all trees within 500 meters' without any schema changes."**

3. **"I built a Celery beat scheduler that runs every morning at 8am — it queries trees not inspected in 14 days and sends supervisor email digests, completely automated."**

4. **"The map view uses a dedicated lightweight API endpoint (`/api/trees/map/`) that returns only the fields needed for rendering markers — id, lat, lng, health, tag — instead of the full tree payload. This was a deliberate optimization."**

5. **"I used django-storages with S3 for media — tree photos uploaded by field workers in the field go straight to an S3 bucket, and the app works identically in dev (local) and prod (S3) by just flipping a USE_S3 env var."**
