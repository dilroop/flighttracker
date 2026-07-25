# ✈️ AeroTracker

A real-time flight tracking web application built with React, TypeScript, and Leaflet. Enter any address or use your current location to scan the skies above for active aircraft within a configurable radius.

![AeroTracker Screenshot](public/screenshot1.png)

## Features

- 🗺️ **Interactive Dark Map** — Smooth Leaflet map with CARTO dark tiles
- 📍 **Location Search** — Enter any address or use GPS to set your tracking center
- 🔄 **Real-time Polling** — Flight data refreshes every 30 seconds while the page is visible
- ✈️ **Flight Trails** — Historical and live polyline paths for each aircraft
- 🛫 **Route Info** — Available origin, destination, and airline metadata
- 🎯 **Bidirectional Selection** — Select a plane from the map or flight list
- 📡 **Adjustable Radius** — Scan anywhere from 10 km to 200 km
- 📱 **Responsive UI** — Desktop split view and touch-friendly stacked mobile layout

## Tech Stack

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — fast dev server & bundler
- [Leaflet](https://leafletjs.com/) + [react-leaflet](https://react-leaflet.js.org/) — interactive maps
- [Lucide React](https://lucide.dev/) — icons
- [adsb.lol](https://adsb.lol/) — free ADS-B flight data API

## Getting Started

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Project Structure

The frontend uses a feature-first architecture:

```text
src/
  app/                         application composition
  assets/                      bundled static assets
  features/flights/
    api/                       external API adapters and runtime parsing
    components/                flight UI and map components
    hooks/                     feature orchestration and polling state
    model/                     domain types
  styles/                      global design system and responsive layout
```

The Cloudflare Worker and Vite development server expose matching same-origin proxy routes for
flight, route, track, and geocoding APIs.

## Build for Production

```bash
npm run lint
npm run build
```
