# CPE Elect 2 Project

A web application to collect post-activity reports.

### Prerequisites

- Node.js 18.17 or newer
- npm (bundled with Node.js)

### Installation
### Run this first to install dependencies:

```bash
npm install
```
### Run the development server

```bash
npm run dev
```

The server starts on `http://localhost:3000` by default. Uploaded files are stored under `uploads/` (for file upload testing purposes).

### Default Accounts

- Admin testing account: username `admin`, password `admin123`


## Project Structure

```
src/
  app.js             Express configuration
  server.js          Entry point
  controllers/       Route handlers
  db/                SQLite client and helpers
  middleware/        Flash, error, and upload middleware
  routes/            Express routers
  services/          Email and event persistence
  validators/        express-validator rules
views/               EJS templates
public/              CSS and static assets
uploads/             Uploaded documents
```

## Notes

- Upload directories (`uploads/attendance`, `uploads/promo`, `uploads/gallery`) are ignored by git and created on demand.
- Maximum file size is 10 MB per file except promotional material (1 MB).
- Gallery uploads support PDFs, images, and short videos.

## Bugs
- Footholder is not at the footer in homepage (need to fix) (fixed na ATA)

## Features to implement (running list)
- design (go libs HAHAHA)
### For foundation foundation
- google drive integration
- google sheets integration? (or make our own attendance system)
- where to store the db file? currently in root dir
- real email recepipt sending 