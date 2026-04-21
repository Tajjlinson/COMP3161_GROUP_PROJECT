# Deployment Notes

## Render

This repository includes `render.yaml` for a Docker-based Render web service and a Redis-compatible Key Value cache.

### Required environment variables

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `APP_SECRET`

### Recommended deployment flow

1. Push this project to GitHub.
2. In Render, create a new Blueprint from the repository.
3. Let Render create:
   - the web service from `Dockerfile`
   - the `comp3161-cache` Key Value instance
4. Provide the MySQL connection variables for your database.
5. After the first deploy, run `complete_schema.sql` and `seed_data.sql` against your MySQL instance.

## Public URL

Once deployed, the frontend entry point is:

- `/app`

The API root is:

- `/api`
