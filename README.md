# 🌳 Tree & Green Asset Tracker

A full-stack web application for municipalities and NGOs to track urban trees — from planting to maturity. Field workers geo-tag trees with photos, supervisors assign maintenance tasks, and admins monitor city-wide green coverage through an interactive map, dashboard, and AI-powered insights.

**Live Demo:**
- 🌐 Frontend: https://tree-tracker-wheat.vercel.app
- ⚙️ Backend API: https://treetracker-backend.onrender.com/api/
- 📖 API Docs: https://treetracker-backend.onrender.com/api/docs/

---

## 🏗️ Architecture

```
tree-tracker/
├── backend/                  # Django + DRF
│   ├── config/               # Settings, URLs
│   ├── apps/
│   │   ├── accounts/         # Custom user model, JWT auth, roles
│   │   ├── zones/            # City zones management
│   │   ├── trees/            # Tree registry, health logs, species
│   │   ├── tasks/            # Maintenance task workflows
│   │   └── reports/          # Analytics, PDF/CSV export
│   └── manage.py
├── frontend/                 # React + Tailwind + Leaflet
│   └── src/
│       ├── pages/            # Dashboard, Map, Trees, Tasks, Zones, Reports, AI
│       ├── components/       # Layout, sidebar
│       ├── context/          # Auth context
│       └── services/         # Axios API client, Groq AI client
└── docker-compose.yml        # Local development
```

---

## ☁️ Deployment Stack (All Free)

| Service | Platform | Purpose |
|---------|----------|---------|
| Frontend | Vercel | React app hosting |
| Backend | Render | Django + Gunicorn (Docker) |
| Database | Render PostgreSQL | Primary database |
| Images | Cloudinary | Tree photo storage |
| AI | Groq (LLaMA 3.3 70B) | AI Assistant features |

---

## 🚀 Quick Start (Docker)

```bash
git clone https://github.com/Shrey-sa/tree-tracker.git
cd tree-tracker
docker-compose up --build

# Running at:
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
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # Edit with your DB credentials

python manage.py makemigrations accounts zones trees tasks
python manage.py migrate
python manage.py seed_data
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
# Create .env with: VITE_GROQ_API_KEY=your_groq_key
npm run dev
```

---

## 🤖 AI Assistant (Powered by Groq + LLaMA 3.3)

Three agentic AI features built into the sidebar:

### 1 — Health Diagnosis
Upload a tree photo → LLaMA 3.3 (vision) analyzes it → returns:
- Diagnosed health status (healthy / at risk / dead)
- Issues detected (yellowing, bark damage, fungal growth etc.)
- Recommended action and task type

### 2 — Maintenance Advisor
Select a zone → AI reads live tree data → suggests:
- 3-5 specific maintenance tasks with priorities
- Reasoning for each recommendation
- Number of trees affected and due dates

### 3 — Report Summarizer
One click → AI reads all city stats → generates:
- Executive headline and overall assessment
- Key wins and concerns with specific numbers
- Prioritized action items for city officials

> All AI calls go directly from the browser to Groq's API (no backend proxy needed). Uses `llama-3.3-70b-versatile` for text and `llama-4-scout-17b-16e-instruct` for vision.

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
| POST | `/api/trees/` | Register new tree with photo |
| GET | `/api/trees/:id/` | Tree detail with health history |
| PATCH | `/api/trees/:id/health/` | Update health status |
| GET | `/api/trees/map/` | Lightweight map markers |
| GET | `/api/species/` | List all species |

### Zones
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zones/` | List all zones |
| POST | `/api/zones/` | Create zone (admin) |
| GET | `/api/zones/:id/stats/` | Zone health breakdown |

### Tasks
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/` | List tasks (role-filtered) |
| POST | `/api/tasks/` | Create task (supervisor+) |
| PATCH | `/api/tasks/:id/complete/` | Mark complete |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/reports/summary/` | City-wide stats |
| GET | `/api/reports/trends/` | 12-month planting trends |
| GET | `/api/reports/export/pdf/` | Download PDF report |
| GET | `/api/reports/export/csv/` | Download CSV |

---

## 👥 User Roles

| Role | Permissions |
|------|-------------|
| **Admin** | Full access — manage users, all zones, all tasks, reports |
| **Supervisor** | Create/assign tasks, view zone stats |
| **Field Worker** | Register trees, update health, complete own tasks |

---

## 🌟 Key Features

- **Interactive Map** — Leaflet.js with color-coded health markers, click-to-view popups
- **Tree Registry** — Unique tags (TRK-00001), species info, GPS, photo upload, health history timeline
- **Health Tracking** — Every update logged with who changed it, previous status, notes, timestamp
- **Maintenance Workflows** — Priority tasks (urgent/high/medium/low) with due dates assigned to field workers
- **AI Assistant** — LLaMA 3.3 70B via Groq: photo diagnosis, zone advisor, report summarizer
- **Cloudinary Storage** — Tree photos persist across deployments
- **Reports & Export** — PDF + CSV download, zone comparison charts, survival rate trends
- **JWT Auth** — Role-based access at queryset level, not just view level

---

## 🗂️ Database Schema

```
users             → id, username, email, role (admin/supervisor/field_worker)
zones             → id, name, city, center_lat, center_lng, area_sq_km
species           → id, common_name, scientific_name, watering_frequency_days
trees             → id, tag_number, species_fk, zone_fk, latitude, longitude,
                    current_health, planted_date, height_cm, photo, planted_by_fk
health_logs       → id, tree_fk, logged_by_fk, previous_health, health_status,
                    notes, logged_at
maintenance_tasks → id, title, task_type, priority, zone_fk, tree_fk,
                    assigned_to_fk, due_date, status, completed_at
```

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router 6, Tailwind CSS |
| Maps | Leaflet.js + react-leaflet |
| Charts | Recharts |
| AI | Groq API (LLaMA 3.3 70B + LLaMA 4 Scout Vision) |
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

`python manage.py seed_data` creates:
- 5 zones across Bangalore
- 8 tree species (Neem, Peepal, Gulmohar, Banyan, Rain Tree, Tamarind, Ashoka, Silver Oak)
- 9 users (1 admin, 3 supervisors, 5 field workers)
- 240 trees with realistic health distribution
- 40 maintenance tasks with varied priorities

---