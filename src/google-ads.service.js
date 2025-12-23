const { GoogleAdsApi } = require('google-ads-api');

/**
 * Creates an authenticated Google Ads API client instance for a user.
 * @param {string} refreshToken - The user's OAuth refresh token for the Ads API.
 * @returns {GoogleAdsApi} An instance of the GoogleAdsApi client.
 */
function createAdsClient(refreshToken) {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.GOOGLE_ADS_DEVELOPER_TOKEN) {
        throw new Error('Google Ads API configuration missing. Please check GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_ADS_DEVELOPER_TOKEN in your .env file.');
    }

    return new GoogleAdsApi({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET, // IMPORTANT: Add this to your .env file
        developer_token: process.env.GOOGLE_ADS_DEVELOPER_TOKEN,
        refresh_token: refreshToken,
    });
}

/**
 * Lists all customer accounts accessible by the user.
 * @param {string} refreshToken - The user's OAuth refresh token.
 * @returns {Promise<Array<{resource_name: string, descriptive_name: string, id: string}>>} A list of accessible customer accounts.
 */
exports.listAccessibleCustomers = async (refreshToken) => {
    const client = createAdsClient(refreshToken);
    // Pass refreshToken explicitly to the method to ensure authentication
    const response = await client.listAccessibleCustomers(refreshToken);
    const resourceNames = response.resource_names || [];

    const accounts = [];
    for (const resourceName of resourceNames) {
        const id = resourceName.split('/')[1];
        const customer = client.Customer({
            customer_id: id,
            login_customer_id: id,
            refresh_token: refreshToken,
        });

        try {
            const [result] = await customer.query(`
                SELECT customer.id, customer.descriptive_name, customer.manager
                FROM customer
                LIMIT 1
            `);
            
            if (result && result.customer) {
                accounts.push({
                    resource_name: resourceName,
                    descriptive_name: result.customer.descriptive_name || `Customer ${id}`,
                    id: result.customer.id.toString(),
                    is_manager: result.customer.manager
                });
            }
        } catch (e) {
            // Fallback if we can't fetch details (e.g. permission issues on specific account)
            accounts.push({
                resource_name: resourceName,
                descriptive_name: `Customer ${id}`,
                id: id,
                is_manager: false
            });
        }
    }
    return accounts;
};

/**
 * Retrieves all campaigns for a given customer ID.
 * @param {string} refreshToken - The user's OAuth refresh token.
 * @param {string} customerId - The ID of the Google Ads account (e.g., '123-456-7890').
 * @returns {Promise<Array<{id: string, name: string, status: string}>>} A list of campaigns.
 */
exports.getCampaigns = async (refreshToken, customerId) => {
    const client = createAdsClient(refreshToken);
    const customer = client.Customer({
        customer_id: customerId,
        login_customer_id: customerId, // For most cases, this is the same as customer_id
        refresh_token: refreshToken, // Explicitly pass refresh token
    });

    const mapRows = (rows) => rows.map(row => ({
        id: row.campaign.id,
        name: row.campaign.name,
        status: row.campaign.status,
        clicks: row.metrics ? row.metrics.clicks : 0,
        impressions: row.metrics ? row.metrics.impressions : 0,
    }));

    try {
        // First, check if this is a manager account to avoid "REQUESTED_METRICS_FOR_MANAGER" error
        const [customerData] = await customer.query(`
            SELECT customer.manager 
            FROM customer 
            LIMIT 1
        `);

        if (customerData && customerData.customer && customerData.customer.manager) {
            // It's a Manager Account. Return the list of associated client accounts.
            const subAccounts = await customer.query(`
                SELECT customer_client.client_customer, customer_client.descriptive_name
                FROM customer_client
                WHERE customer_client.manager = false
                AND customer_client.status = 'ENABLED'
            `);

            return subAccounts.map(account => ({
                id: account.customer_client.client_customer.split('/')[1],
                name: account.customer_client.descriptive_name || `Account ${account.customer_client.client_customer.split('/')[1]}`,
                status: 'Client Account',
                clicks: '-',
                impressions: '-'
            }));
        }

        const campaigns = await customer.query(`
            SELECT campaign.id, campaign.name, campaign.status, metrics.clicks, metrics.impressions
            FROM campaign
            ORDER BY campaign.name
        `);

        return mapRows(campaigns);
    } catch (error) {
        // Capture gRPC details or standard error message
        throw new Error(`Failed to fetch campaigns: ${error.details || error.message || JSON.stringify(error)}`);
    }
};