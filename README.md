# Cloudflare DNS Updater

This is a simple Express.js application that updates DNS records on Cloudflare with the current public IP address of the server. It uses the Cloudflare API to perform the updates and requires an API key for access control.

## Features

- Fetches the current public IP address using the [ipify](https://www.ipify.org/) API.
- Updates specified DNS records in [Cloudflare API](https://developers.cloudflare.com/api/) with the current IP address.
- Secured with an API key to prevent unauthorized access.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A Cloudflare account with API credentials
- An `.env` file with the necessary configuration values

- `PORT`: Port number for the Express server (default is 5555).
- `CF_DNS`: Comma-separated list of Cloudflare DNS record IDs that you want to update.
- `CF_ZONE`: Cloudflare Zone ID where DNS records are managed.
- `CF_MAIL`: Cloudflare Email address associated with the account.
- `CF_AUTH`: Cloudflare API token for authentication.
- `RDP_API_KEY`: Your own API key used to authenticate requests to this service.

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

## Usage

1. Start the server:
    ```bash
    npm start
    ```
2. Access the service by sending a GET request to the root endpoint. The service will update the DNS records with the current public IP address.

    ```bash
    curl -X GET http://localhost:5555/?api_key=<your-secure-api-key>
    ```

## API

### GET /

Updates the DNS records with the current public IP address. Requires an API key.

**Headers:**
- `rdp-key` (required) - API key for authentication

**Query Parameters:**
- `api_key` (optional) - API key for authentication (can be used instead of header)

**Response:**
- `200 OK` - If the update is successful
- `400 Bad Request` - If the API key is missing
- `401 Unauthorized` - If the API key is invalid
- `500 Internal Server Error` - If an error occurs during the update process

## Contributing

Feel free to submit issues, feature requests, or pull requests. Contributions are welcome!

## Contact

For any questions or issues, please contact [noc@rdpdatacenter.cloud](mailto:noc@rdpdatacenter.cloud).
