# k-mind: AI-Powered Multi-Linked Mind Map Builder

`k-mind` is a Next.js mind-mapping application designed to represent complex learning pathways and skill structures. Unlike traditional mindmaps that are restricted to hierarchical tree layouts, `k-mind` allows directed acyclic graphs (DAGs) where a single concept can connect to multiple parents (prerequisites) and multiple children. 

It features an AI-assisted copilot to suggest related parent/sibling/child skills and supports importing/exporting maps in OPML, FreeMind (.mm), and native JSON formats.

---

## 🚀 Quick Start (Docker Compose)

The easiest way to run the entire stack (Next.js standalone server, PostgreSQL, Redis, and Nginx proxy) is via Docker Compose.

### Prerequisites
- Install [Docker and Docker Compose](https://docs.docker.com/get-docker/).

### Run the Stack
1. Clone the repository and navigate into it:
   ```bash
   git clone <repo-url> k-mind
   cd k-mind
   ```
2. Copy the example environment file and configure your keys:
   ```bash
   cp .env.example .env
   ```
   *Make sure to add your Google Gemini or OpenAI API keys inside `.env` to enable the AI suggestions feature.*

3. Spin up the containers:
   ```bash
   docker compose up --build -d
   ```

4. Access the application in your browser:
   - **Local URL**: [http://localhost](http://localhost) (Proxied via Nginx)

5. Stop the stack:
   ```bash
   docker compose down
   ```

---

## 💻 Local Development Setup

If you prefer to run the Next.js frontend locally with hot-reloading:

### 1. Run Dependencies (Database & Cache)
You can use docker compose to run only PostgreSQL and Redis:
```bash
docker compose up -d db redis
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Run Database Migrations
Make sure your `.env` contains the correct `DATABASE_URL` pointing to localhost (e.g. `postgresql://postgres:postgres@localhost:5432/kmind`).
```bash
npm run db:push  # if using drizzle-kit push, or:
npm run db:migrate
```

### 4. Run Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛠️ Stack & Architecture

- **Frontend Framework**: Next.js 16 (App Router), React 19, Tailwind CSS.
- **Canvas Renderer**: React Flow (`@xyflow/react`) for graph canvas interactions.
- **Database**: PostgreSQL with Drizzle ORM for schema declarations and migrations.
- **Caching**: Redis for caching LLM suggestion responses and rate-limiting.
- **Reverse Proxy**: Nginx routing requests to the Next.js runtime.

---

## 📚 Project Documentation

Detailed project architecture and technical specifications are stored in the `/docs` directory:
- [Requirements Specification](file:///Users/kevo/Projects/k-mind/docs/REQUIREMENTS.md): User stories, features scope, and performance requirements.
- [Technical Design & Architecture](file:///Users/kevo/Projects/k-mind/docs/DESIGN.md): Database schemas, API route design, layout engine strategies, and Nginx configurations.
- [Feature Catalog](file:///Users/kevo/Projects/k-mind/docs/FEATURES.md): Functional overview of the interactive canvas, AI Copilot integration, and import/export adapters.
- [Project Roadmap](file:///Users/kevo/Projects/k-mind/TODO.md): Phase-by-phase implementation tasks.
