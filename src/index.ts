import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = process.env.PORT || 5555;

const dnsRecords: string[] = process.env.CF_DNS ? process.env.CF_DNS.split(",") : [];

// Middleware to check the API key
const apiKeyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header("rdp-key") || req.query.api_key as string;

    if (!apiKey) {
        // No API key provided
        return res.status(400).json({ status: "failed", message: "Missing api_key or rdp-key Header" });
    } else if (apiKey !== process.env.RDP_API_KEY) {
        // API key is provided but is incorrect
        return res.status(401).json({ status: "failed", message: "Invalid API Key" });
    } else {
        // API key is correct, proceed to the route
        next();
    }
};

app.use(apiKeyMiddleware);

app.get("/", async (req: Request, res: Response) => {
    try {
        // Check if required environment variables are set
        if (!process.env.CF_ZONE || !process.env.CF_MAIL || !process.env.CF_AUTH) {
            return res.status(500).json({ 
                status: "failed", 
                message: "Missing Cloudflare configuration. Please check your environment variables." 
            });
        }

        if (dnsRecords.length === 0) {
            return res.status(500).json({ 
                status: "failed", 
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
            records: updateResults
        });
    } catch (error) {
        console.error("Error in update process:", error);
        res.status(500).json({ 
            status: "failed", 
            error: error instanceof Error ? error.message : "An unknown error occurred" 
        });
    }
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({ status: "healthy" });
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
        console.log(`Configured to update ${dnsRecords.length} DNS records`);
    });
}

export default app;