# FireFlow

AI-poet workflow builder and execution engine.

## Tech Stack

- React + TypeScript
- Tambo AI
- TanStack Start
- Vite
- Tailwind CSS
- Drizzle ORM + PostgreSQL
- React Flow (xyflow)
- Better Auth

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run database migrations
npm run db:push

# Start development server
npm run dev
```

The app runs at http://localhost:2000

## Scripts

- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run db:generate` - Generate migrations
- `npm run db:push` - Push schema to database
- `npm run db:studio` - Open Drizzle Studio

## Project Structure

```
src/
  components/    # React components
  db/            # Database schema
  lib/           # Utilities and business logic
  routes/        # TanStack Router routes
```
