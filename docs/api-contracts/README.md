# API contract

Base URL: `http://localhost:8080/api`

Public endpoints:

- `POST /auth/register`
- `POST /auth/login`

Authenticated member endpoints:

- `GET /profile`
- `GET /dashboard`
- `GET /plans/today`
- `GET /meals/today`
- `POST /activities`
- `GET /notifications`

Admin endpoints require a JWT with the `ADMIN` role:

- `GET /admin/dashboard`
- `GET /admin/users`
- `GET /admin/plans`
- `GET /admin/products`
- `GET /admin/missed-items`

The interactive OpenAPI UI is served at `http://localhost:8080/swagger-ui.html`.

