# Backend Structure Document for Mindbody Data Analysis

## Endpoints

### API Routes

#### User Authentication

- **POST** `/api/auth/login`
  - **Request**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword"
    }
    ```
  - **Response**:
    ```json
    {
      "token": "jwt_token",
      "user": {
        "id": "user_id",
        "email": "user@example.com",
        "role": "user_role"
      }
    }
    ```

- **POST** `/api/auth/register`
  - **Request**:
    ```json
    {
      "email": "user@example.com",
      "password": "securepassword",
      "name": "User Name"
    }
    ```
  - **Response**:
    ```json
    {
      "message": "Registration successful",
      "user": {
        "id": "user_id",
        "email": "user@example.com"
      }
    }
    ```

- **POST** `/api/auth/password-reset`
  - **Request**:
    ```json
    {
      "email": "user@example.com"
    }
    ```
  - **Response**:
    ```json
    {
      "message": "Password reset email sent"
    }
    ```

#### Data Import & Export

- **POST** `/api/data/import`
  - **Request**:
    ```json
    {
      "file": "datafile.csv"
    }
    ```
  - **Response**:
    ```json
    {
      "message": "Data import successful",
      "recordsImported": 1000
    }
    ```

- **GET** `/api/data/export`
  - **Request Parameters**:
    - `format`: csv or json
  - **Response**:
    ```json
    {
      "fileUrl": "https://cloudstorage.com/exportedfile.csv"
    }
    ```

#### Analytics & Reports

- **POST** `/api/reports/generate`
  - **Request**:
    ```json
    {
      "reportType": "attendance_summary",
      "filters": {
        "dateRange": {
          "start": "2023-01-01",
          "end": "2023-01-31"
        }
      }
    }
    ```
  - **Response**:
    ```json
    {
      "reportId": "report_id",
      "status": "processing"
    }
    ```

- **GET** `/api/reports/status/{reportId}`
  - **Response**:
    ```json
    {
      "reportId": "report_id",
      "status": "completed",
      "downloadUrl": "https://cloudstorage.com/report.pdf"
    }
    ```

## Controllers and Services

### Authentication Controller

- Responsible for handling user authentication requests, interacting with Auth0 and NextAuth.js for session management.

### Data Import Controller

- Handles data upload, parsing, and storage in PostgreSQL using Drizzle ORM.

### Reports Controller

- Manages report generation requests, interacts with database for data retrieval, and formats data for export.

### Notification Service

- Sends email and SMS notifications using integrated third-party services.

### ChatGPT Integration Service

- Manages language query processing using OpenAI's API, converting user queries into actionable database queries.

## Database Schema

### Tables

#### Users

- **Fields**:
  - `id` (UUID, Primary Key)
  - `email` (String, Unique)
  - `passwordHash` (String)
  - `role` (String)
  - `createdAt` (Timestamp)
  - `updatedAt` (Timestamp)

#### Students

- **Fields**:
  - `id` (UUID, Primary Key)
  - `name` (String)
  - `email` (String, Unique)
  - `membershipId` (UUID, Foreign Key)
  - `createdAt` (Timestamp)

#### Classes

- **Fields**:
  - `id` (UUID, Primary Key)
  - `name` (String)
  - `schedule` (JSON)
  - `instructorId` (UUID, Foreign Key)

#### Attendances

- **Fields**:
  - `id` (UUID, Primary Key)
  - `studentId` (UUID, Foreign Key)
  - `classId` (UUID, Foreign Key)
  - `attendanceDate` (Date)

#### Memberships

- **Fields**:
  - `id` (UUID, Primary Key)
  - `studentId` (UUID, Foreign Key)
  - `type` (String)
  - `startDate` (Date)
  - `endDate` (Date)

## Data Flow

1. **Request Initiation**: User sends a request to the API (e.g., data import).
2. **Controller Processing**: The relevant controller receives the request and validates it.
3. **Service Interaction**: The controller invokes services (e.g., data parsing, authentication) to handle business logic.
4. **Database Interaction**: Data is stored or retrieved from PostgreSQL through Drizzle ORM.
5. **Response Formation**: Results are formatted by the controller and sent back to the client.

## Third-party Integrations

- **Auth0 & NextAuth.js**: User authentication and session management.
- **OpenAI API**: Language processing for data queries.
- **Email & SMS Services**: For sending notifications to users.
- **Cloudflare R2**: For storing and serving exported reports.

## State Management Logic

- **Queues**: BullMQ for managing background tasks like report generation.
- **Caching**: Upstash Redis for caching frequently accessed data and session management.
- **Session Management**: Managed via Auth0 and NextAuth.js.

## Error Handling

- **Error Catching**: Try-catch blocks in controllers and services.
- **Logging**: Errors are logged using Sentry and monitored with OpenTelemetry.
- **Client Response**: Errors are formatted and returned with standard HTTP status codes and messages.

## API Documentation

- **Format**: OpenAPI/Swagger
- **Content**:
  - Endpoint URL and method
  - Request format with parameters
  - Response format with example data
  - Error codes and messages

This document provides a comprehensive overview of the backend structure for the Mindbody Data Analysis project, detailing the components and workflows necessary for development and maintenance.
