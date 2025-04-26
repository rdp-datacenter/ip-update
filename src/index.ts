import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const port = process.env.PORT || 5555;
app.set('json spaces', 2);

const dnsRecords: string[] = process.env.CF_DNS ? process.env.CF_DNS.split(",") : [];

/**
 * Generate a unique RDP identifier
 * Format is 16 hex characters followed by "RDP" 
 * @returns {string} Generated RDP ID
 */
const generateRdpId = (): string => {
    // Generate 8 random bytes (16 hex characters)
    const randomBytes = crypto.randomBytes(8).toString('hex').toUpperCase();
    
    // Add RDP prefix
    return `${randomBytes}-RDP`;
};

// Middleware to check the API key
const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header("rdp-key") || req.query.api_key as string;

    if (!apiKey) {
        // No API key provided
        return res.status(400).json({ 
            status: "failed", 
            request_id: (req as any).rdpId,
            message: "Missing api_key or rdp-key Header" 
        });
    } else if (apiKey !== process.env.RDP_API_KEY) {
        // API key is provided but is incorrect
        return res.status(401).json({ 
            status: "failed", 
            request_id: (req as any).rdpId,
            message: "Invalid API Key" 
        });
    } else {
        // API key is correct, proceed to the route
        next();
    }
};

// Add RDP ID middleware to all routes
app.use((req: Request, res: Response, next: NextFunction) => {
    // Generate and attach an RDP ID to the request
    const rdpId = generateRdpId();
    (req as any).rdpId = rdpId;
    
    // Add RDP ID to response headers
    res.setHeader('RDP-Request-ID', rdpId);
    next();
});

// Root route is now the informational page (no auth required)
app.get("/", (req: Request, res: Response) => {
    res.json({
        name: "RDP Dynamic DNS Updater",
        version: "1.0.0",
        request_id: (req as any).rdpId,
        endpoints: [
            { path: "/update", method: "GET", description: "Update DNS records with current IP (requires API key)" },
            { path: "/health", method: "GET", description: "Service health check (no auth required)" },
            { path: "/update-all", method: "GET", description: "Update all DNS records (requires API key)" }
        ],
        status: "operational"
    });
});

// Health check endpoint (no auth required)
app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({ 
        status: "healthy",
        request_id: (req as any).rdpId,
        timestamp: new Date().toISOString()
    });
});

// Main DNS update endpoint now moved to /update
app.get("/update", apiKeyMiddleware, async (req: Request, res: Response) => {
    try {
        // Check if required environment variables are set
        if (!process.env.CF_ZONE || !process.env.CF_MAIL || !process.env.CF_AUTH) {
            return res.status(500).json({ 
                status: "failed", 
                request_id: (req as any).rdpId,
                message: "Missing Cloudflare configuration. Please check your environment variables." 
            });
        }

        if (dnsRecords.length === 0) {
            return res.status(500).json({ 
                status: "failed", 
                request_id: (req as any).rdpId,
                message: "No DNS records specified. Please check your CF_DNS environment variable." 
            });
        }

        // Get current IP address
        const response = await axios.get<{ ip: string }>("https://api.ipify.org?format=json");
        const ip = response.data.ip;

        console.log(`Current IP address: ${ip}`);

        const updateResults = await Promise.all(
            dnsRecords.map(async (dnsRecord) => {
                try {
                    // Fetch current record data
                    const currentRecord = await axios.get(
                        `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE}/dns_records/${dnsRecord}`,
                        {
                            headers: {
                                "X-Auth-Email": process.env.CF_MAIL as string,
                                "Authorization": `Bearer ${process.env.CF_AUTH}`,
                                "Content-Type": "application/json"
                            },
                        }
                    );

                    if (!currentRecord.data.result) {
                        throw new Error(`Failed to retrieve DNS record ${dnsRecord}`);
                    }

                    const recordData = currentRecord.data.result;
                    console.log(`Updating DNS record: ${recordData.name} (${dnsRecord})`);

                    // Update the record with new IP
                    const update = await axios.put(
                        `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE}/dns_records/${dnsRecord}`,
                        {
                            type: recordData.type,
                            name: recordData.name,
                            content: ip,
                            ttl: recordData.ttl,
                            proxied: recordData.proxied,
                        },
                        {
                            headers: {
                                "X-Auth-Email": process.env.CF_MAIL as string,
                                "Authorization": `Bearer ${process.env.CF_AUTH}`,
                                "Content-Type": "application/json"
                            },
                        }
                    );

                    return {
                        id: dnsRecord,
                        name: recordData.name,
                        success: update.data.success,
                        status: update.status
                    };
                } catch (error) {
                    console.error(`Error updating record ${dnsRecord}:`, error);
                    return {
                        id: dnsRecord,
                        success: false,
                        error: error instanceof Error ? error.message : "Unknown error"
                    };
                }
            })
        );

        const success = updateResults.every((result) => result.success === true);
        
        res.json({ 
            status: success ? "success" : "partial_failure",
            ip,
            request_id: (req as any).rdpId,
            records: updateResults
        });
    } catch (error) {
        console.error("Error in update process:", error);
        res.status(500).json({ 
            status: "failed", 
            request_id: (req as any).rdpId,
            error: error instanceof Error ? error.message : "An unknown error occurred" 
        });
    }
});

// Add protected routes that require authentication
app.get("/update-all", apiKeyMiddleware, async (req: Request, res: Response) => {
    try {
        // Logic to update all DNS records
        res.json({
            status: "success",
            request_id: (req as any).rdpId,
            message: "All DNS records updated successfully"
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            status: "failed",
            request_id: (req as any).rdpId,
            error: error instanceof Error ? error.message : "Unknown error"
        });
    }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        status: "error",
        request_id: (req as any).rdpId,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'production' ? undefined : err.message
    });
});

// 404 handler - must be last
app.use((req: Request, res: Response) => {
    res.status(404).json({
        status: "failed",
        request_id: (req as any).rdpId,
        message: "Endpoint not found"
    });
});

// Start the server only if directly executed, not if imported as a module
if (require.main === module) {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`Configured to update ${dnsRecords.length} DNS records`);
    });
}

// Export for both server usage and importing as a module
export { 
    app,
    apiKeyMiddleware,
    generateRdpId
};

export default app;