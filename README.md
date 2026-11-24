# MiuMiu Rent Stuff

Ứng dụng cho thuê trang phục cao cấp được xây dựng với Docker Compose.

## Kiến trúc

```
┌─────────────┐    ┌──────────────┐    ┌────────────────┐
│   Browser   │───▶│    Nginx     │───▶│  Frontend      │
│             │    │   :80        │    │  Next.js :3000 │
└─────────────┘    │              │    └────────────────┘
                   │              │───▶│  Backend       │
                   │   /api/*     │    │  Golang :8080  │
                   └──────────────┘    └───────┬────────┘
                                               │
                                       ┌───────▼────────┐
                                       │    MySQL       │
                                       │    :3306       │
                                       └────────────────┘
```

## Tech Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Shadcn UI    |
| Backend  | Golang 1.23, Gin, GORM, ozzo-validation            |
| Database | MySQL 8.0                                           |
| Gateway  | Nginx (Alpine)                                      |
| Runtime  | Docker Compose                                      |

## Cấu trúc thư mục

```
miumiu-rent-stuff/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── cmd/
│   │   └── server/
│   │       └── main.go
│   └── internal/
│       ├── database/
│       │   └── database.go
│       ├── handler/
│       │   └── item_handler.go
│       ├── model/
│       │   └── item.go
│       └── router/
│           └── router.go
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── components.json        ← Shadcn UI config
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── globals.css
│       │   └── items/
│       │       └── page.tsx
│       ├── components/
│       │   └── ui/            ← Shadcn UI components
│       ├── lib/
│       │   ├── utils.ts
│       │   └── api.ts
│       └── types/
│           └── index.ts
├── nginx/
│   ├── nginx.conf
│   └── conf.d/
│       └── default.conf
└── database/
    └── init.sql               ← Khởi tạo bảng + seed data
```

## Cài đặt & Chạy

### Yêu cầu
- Docker Engine ≥ 24.0
- Docker Compose ≥ 2.20

### Khởi động

```bash
# 1. Clone và vào thư mục
cd miumiu-rent-stuff

# 2. Copy file env
cp .env.example .env

# 3. Build và khởi động tất cả services
docker compose up --build -d

# 4. Xem logs
docker compose logs -f
```

### Dừng

```bash
docker compose down

# Dừng và xóa toàn bộ volumes (database)
docker compose down -v
```

## Endpoints

| URL                      | Mô tả                   |
|--------------------------|-------------------------|
| `http://localhost`       | Trang chủ Frontend      |
| `http://localhost/items` | Danh sách sản phẩm      |
| `http://localhost/api/v1/items` | REST API items  |
| `http://localhost/health`| Health check            |

## API Backend

| Method | Endpoint             | Mô tả                |
|--------|----------------------|----------------------|
| GET    | /api/v1/items        | Lấy danh sách items  |
| GET    | /api/v1/items/:id    | Lấy chi tiết item    |
| POST   | /api/v1/items        | Tạo item mới         |
| PUT    | /api/v1/items/:id    | Cập nhật item        |
| DELETE | /api/v1/items/:id    | Xóa item             |

## Database

Bảng được khởi tạo tự động từ file `database/init.sql` khi MySQL container start lần đầu.

Tables: `items`, `users`, `rentals`

## Thêm Shadcn UI components

```bash
# Vào trong container frontend
docker compose exec frontend npx shadcn@latest add <component-name>

# Ví dụ
docker compose exec frontend npx shadcn@latest add dialog
docker compose exec frontend npx shadcn@latest add input
docker compose exec frontend npx shadcn@latest add table
```

## Thêm Go packages

```bash
# Vào trong container backend
docker compose exec backend go get <package-name>

# Ví dụ
docker compose exec backend go get github.com/golang-jwt/jwt/v5
```
