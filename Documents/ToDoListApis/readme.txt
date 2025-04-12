# Kanban API

A RESTful API for a Jira-like Kanban board application built with Node.js, Express, and MongoDB.

## Features

- User authentication (register, login)
- Projects management
- Project members with different roles (admin, member, viewer)
- Kanban boards with customizable statuses
- Cards (tasks) with descriptions, assignments, due dates, priorities
- Comments on cards
- Tags for cards
- Activity logging

## Setup Instructions

1. **Clone the repository**

```bash
git clone <repository-url>
cd kanban-api
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure environment variables**

Create a `.env` file in the root directory with the following variables:

```
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
```

Replace `your_mongodb_connection_string` with your MongoDB connection string from MongoDB Atlas or your local MongoDB instance.

Generate a random string for `JWT_SECRET` (used for signing JWTs).

4. **Run the server**

```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login and get JWT token
- `GET /api/auth/me` - Get current user info

### Projects

- `GET /api/projects` - Get all projects for logged in user
- `GET /api/projects/:id` - Get a specific project
- `POST /api/projects` - Create a new project
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project
- `POST /api/projects/:id/members` - Add member to project
- `DELETE /api/projects/:id/members/:userId` - Remove member from project

### Statuses (Columns)

- `GET /api/projects/:projectId/statuses` - Get all statuses for a project
- `GET /api/statuses/:id` - Get a specific status
- `POST /api/projects/:projectId/statuses` - Create a new status
- `PUT /api/statuses/:id` - Update a status
- `DELETE /api/statuses/:id` - Delete a status
- `PUT /api/statuses/reorder/:projectId` - Reorder statuses

### Cards (Tasks)

- `GET /api/projects/:projectId/cards` - Get all cards for a project
- `GET /api/statuses/:statusId/cards` - Get cards for a specific status
- `GET /api/cards/:id` - Get a specific card
- `POST /api/projects/:projectId/cards` - Create a new card
- `PUT /api/cards/:id` - Update a card
- `DELETE /api/cards/:id` - Delete a card
- `PUT /api/statuses/:statusId/cards/reorder` - Reorder cards within a status

### Comments

- `GET /api/cards/:cardId/comments` - Get comments for a card
- `POST /api/cards/:cardId/comments` - Add comment to a card
- `PUT /api/comments/:id` - Update a comment
- `DELETE /api/comments/:id` - Delete a comment

### Tags

- `GET /api/projects/:projectId/tags` - Get all tags for a project
- `POST /api/projects/:projectId/tags` - Create a new tag
- `PUT /api/tags/:id` - Update a tag
- `DELETE /api/tags/:id` - Delete a tag
- `POST /api/cards/:cardId/tags` - Add tag to a card
- `DELETE /api/cards/:cardId/tags/:tagId` - Remove tag from a card

### Activities

- `GET /api/projects/:projectId/activities` - Get activity log for a project
- `GET /api/cards/:cardId/activities` - Get activity log for a card

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. To access protected routes, include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

You receive this token when logging in or registering.

## Error Handling

The API returns appropriate HTTP status codes and JSON responses with the following structure for errors:

```json
{
  "success": false,
  "error": "Error message"
}
```

## Success Responses

Successful responses follow this structure:

```json
{
  "success": true,
  "data": {}  // Requested data or empty object for DELETE operations
}
```

For list endpoints, the response includes count and pagination information:

```json
{
  "success": true,
  "count": 10,
  "pagination": {
    "total": 50,
    "page": 1,
    "pages": 5
  },
  "data": []
}
```