# Cloudflare Dynamic DNS Updater

This is a TypeScript Express application that dynamically updates DNS records on Cloudflare with the current public IP address of the server. It uses the Cloudflare API to perform the updates and includes authentication via API key.

## Features

- Fetches the current public IP address using the [ipify](https://ipify.org/) API
- Updates specified DNS records in [Cloudflare API](https://developers.cloudflare.com/api/) with the current IP address
- Secured with an API key to prevent unauthorized access
- Includes unique request IDs for all API responses
- Provides human-friendly JSON responses with automatic pretty-printing
- Clear separation between public and protected endpoints

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [npm](https://npmjs.com/) or [yarn](https://yarnpkg.com/)
- A Cloudflare account with API credentials
- An `.env` file with the necessary configuration values

### Environment Variables

Create a `.env` file in the root directory with the following variables:

- `PORT`: Port number for the Express server (default is 5555)
- `CF_DNS`: Comma-separated list of Cloudflare DNS record IDs that you want to update
- `CF_ZONE`: Cloudflare Zone ID where DNS records are managed
- `CF_MAIL`: Cloudflare Email address associated with the account
- `CF_AUTH`: Cloudflare API token for authentication
- `RDP_API_KEY`: Your own API key used to authenticate requests to this service

Example `.env` file:
```
RDP_API_KEY=your_own_generated_key
CF_DNS=record1,record2,record3
CF_ZONE=your_cloudflare_zone_id
CF_MAIL=your_cloudflare_email
CF_AUTH=your_cloudflare_auth_token
PORT=3000
```

## Installation

1. Clone the repository:
    ```bash
    git clone https://github.com/rdp-datacenter/ip-update.git
    ```
2. Navigate to the project directory:
    ```bash
    cd ip-update
    ```
3. Install dependencies:
    ```bash
    npm install
    ```
4. Build the TypeScript files:
    ```bash
    npm run build
    ```

## Usage

1. Start the server:
    ```bash
    npm start
    ```
2. Access the service information by sending a GET request to the root endpoint:
    ```bash
    curl -X GET http://localhost:5555/
    ```
3. Update the DNS records by sending a GET request to the update endpoint with your API key:
    ```bash
    curl -X GET http://localhost:5555/update?api_key=<your-secure-api-key>
    ```
   Or using the header method:
    ```bash
    curl -X GET -H "rdp-key: <your-secure-api-key>" http://localhost:5555/update
    ```

## API Endpoints

### GET / (Public)

Returns information about the service and available endpoints.

**Response:**
```json
{
  "name": "RDP DNS Updater",
  "version": "1.0.0",
  "request_id": "9ABCDD4CC53F2BC1-RDP",
  "endpoints": [
    { "path": "/update", "method": "GET", "description": "Update DNS records with current IP (requires API key)" },
    { "path": "/health", "method": "GET", "description": "Service health check (no auth required)" },
    { "path": "/update-all", "method": "GET", "description": "Update all DNS records (requires API key)" }
  ],
  "status": "operational"
}
```

### GET /update (Protected)

Updates the DNS records with the current public IP address. Requires an API key.

**Authentication:**
- Header: `rdp-key: <your-api-key>`
- Or Query Parameter: `api_key=<your-api-key>`

**Response (Success):**
```json
{
  "status": "success",
  "ip": "76.76.21.21",
  "request_id": "9ABCDD4CC53F2BC1-RDP",
  "records": [
    {
      "id": "record1",
      "name": "dns.rdpdatacenter.in",
      "success": true,
      "status": 200
    }
  ]
}
```

**Response (Error):**
```json
{
  "status": "failed",
  "request_id": "9ABCDD4CC53F2BC1-RDP",
  "error": "Error message details"
}
```

### GET /health (Public)

Checks if the service is running properly.

**Response:**
```json
{
  "status": "healthy",
  "request_id": "9ABCDD4CC53F2BC1-RDP",
  "timestamp": "2025-04-26T12:34:56.789Z"
}
```

### GET /update-all (Protected)

Updates all configured DNS records. Requires an API key.

**Authentication:**
- Same as `/update` endpoint

**Response:**
```json
{
  "status": "success",
  "request_id": "9ABCDD4CC53F2BC1-RDP",
  "message": "All DNS records updated successfully"
}
```

## Request IDs

Every API response includes a unique request ID in both the response headers (`RDP-Request-ID`) and the response body (`request_id`). These IDs can be used for debugging and tracking purposes.

## Development

For local development with automatic reloading:
```bash
npm run dev
```

## Docker

You can run the application in a Docker container using either Docker directly or Docker Compose.

### Using Docker Compose (Recommended)

A `docker-compose.yml` file is provided for easy deployment:

```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

### Using Docker Directly

```bash
# Build the Docker image
docker build -t ip-update .

# Run the container
docker run -p 5555:5555 --env-file .env ip-update
```

### Docker Configuration

The Docker setup includes:
- Node.js slim image for a lightweight container
- Proper caching of npm dependencies
- Production mode settings
- Health checks via the `/health` endpoint
- Volume mounting for logs
- Automatic container restart

## Vercel Deployment

This project is also configured for deployment on Vercel. The `vercel.json` file includes the necessary configuration.

## Contributing

Feel free to submit issues, feature requests, or pull requests. Contributions are welcome!

## Contact

For any questions or issues, please contact [noc@rdpdatacenter.in](mailto:noc@rdpdatacenter.in).