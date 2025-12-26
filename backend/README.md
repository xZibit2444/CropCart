# CropCart GH Backend API

Backend API for CropCart GH - Ghana's farm-to-table produce platform.

## Features

- **Produce Database**: 35+ Ghanaian produce items across 5 categories
- **Farm Directory**: 6 verified farms across Ghana
- **RESTful API**: Clean endpoints for produce, farms, and search
- **Location-based**: Filter by region and season
- **Real-time data**: JSON-based data storage for quick updates

## Quick Start

### Installation

```powershell
cd backend
npm install
```

### Run Server

```powershell
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on: **http://localhost:3001**

## API Endpoints

### Core Routes

- `GET /` - API information and endpoint list
- `GET /health` - Health check

### Produce

- `GET /api/produce` - Get all produce items
  - Query params: `?category=greens`, `?season=year-round`
- `GET /api/produce/:id` - Get specific produce item
- `GET /api/produce/category/:categoryId` - Get all items in a category
- `GET /api/categories` - Get all categories

### Farms

- `GET /api/farms` - Get all farms
  - Query params: `?location=accra`
- `GET /api/farms/:id` - Get specific farm

### Search

- `GET /api/search?q=mango` - Search produce and farms

## Example Requests

### Get all greens

```powershell
curl http://localhost:3001/api/produce/category/greens
```

### Find farms in Accra

```powershell
curl http://localhost:3001/api/farms?location=accra
```

### Search for mangoes

```powershell
curl http://localhost:3001/api/search?q=mango
```

## Data Structure

### Produce Categories

1. **Greens** - Spinach, Arugula, Lettuce, Kale
2. **Root Vegetables** - Cassava, Yam, Carrots, Beets, Cocoyam
3. **Tropical Fruits** - Mango, Pawpaw, Pineapple, Orange, Banana, Watermelon, Avocado
4. **Tomatoes & Peppers** - Heirloom Tomatoes, Cherry Tomatoes, Scotch Bonnet, Bell Pepper
5. **Herbs & Aromatics** - Ginger, Basil, Thyme, Cilantro

### Farm Locations

- Accra (4 farms)
- Kumasi (1 farm)
- Volta Region (1 farm)

## Tech Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **CORS** - Cross-origin support
- **JSON** - Data storage

## Environment

- Node.js >= 16.0.0
- Port: 3001 (configurable via PORT env var)

## Development

To add produce or farms, edit:
- `data/produce.json`
- `data/farms.json`

Server will reload automatically in dev mode.

## License

MIT
