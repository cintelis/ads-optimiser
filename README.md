# Ads Optimiser

This application is a web-based tool to help manage and optimise Google Ads campaigns. It provides user authentication to connect to Google Ads and view campaign data on a simple dashboard.

## Prerequisites

- Node.js and npm installed.
- Access to Google Ads API with credentials.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### 1. Installation

1.  Clone the repository:
    ```sh
    git clone <repository-url>
    ```
2.  Navigate to the `src` directory:
    ```sh
    cd ads-optimiser/src
    ```
3.  Install the dependencies:
    ```sh
    npm install
    ```

### 2. Configuration

The application uses a `.env` file to manage environment variables.

1.  In the `src` directory, create a new file named `.env`.
2.  Add the necessary configuration for the Google Ads API and other settings. It may include credentials like `CLIENT_ID`, `CLIENT_SECRET`, and `DEVELOPER_TOKEN`.

    ```
    # Example .env file
    GOOGLE_CLIENT_ID=your-google-client-id
    GOOGLE_CLIENT_SECRET=your-google-client-secret
    GOOGLE_ADS_DEVELOPER_TOKEN=your-google-ads-developer-token
    SESSION_SECRET_ID=your-login-session-secret
    UNSPLASH_ACCESS_KEY=your-unsplash-secret
    ```

    *Note: The SESSION_SECRET is used by the express-session middleware to sign the session ID cookie. This is a crucial security measure that helps protect user sessions from being hijacked. The secret is used to compute a hash of the session ID, which is then stored in the cookie. When a request comes back, the server re-computes the hash to ensure the session cookie has not been tampered with by an attacker. Without the secret, an attacker cannot create a valid session cookie.*

### 3. Running the Application

1.  Make sure you are in the `src` directory.
2.  Run the start script:
    ```sh
    npm start
    ```
3.  The server will start, typically on a local port (e.g., `http://localhost:3000`). Open your web browser and navigate to the application's address.

## Project Structure

The main application code is located in the `src` directory.

```
src/
├── auth.controller.js   # Handles authentication logic
├── auth.middleware.js   # Express middleware for authentication
├── dashboard.html       # Frontend for the dashboard
├── dashboard.js         # Client-side script for the dashboard
├── google-ads.service.js# Service for interacting with Google Ads API
├── index.js             # Main application entry point logic
├── package.json         # Project dependencies and scripts
├── server.js            # Express server setup
└── user.controller.js   # Handles user-related logic
```
