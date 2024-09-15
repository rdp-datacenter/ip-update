const express = require("express");
const axios = require("axios");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5555;

const dnsRecords = process.env.CF_DNS.split(',');

app.get("/", async (req, res) => {
    try {
        const response = await axios(`https://api.ipify.org?format=json`);
        const ip = response.data.ip;

        const updateResults = await Promise.all(
            dnsRecords.map(async (dnsRecord) => {
                const currentRecord = await axios.get(
                    `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE}/dns_records/${dnsRecord}`,
                    {
                        headers: {
                            "X-Auth-Email": process.env.CF_MAIL,
                            Authorization: `Bearer ${process.env.CF_AUTH}`,
                        },
                    }
                );

                const recordData = currentRecord.data.result;

                const update = await axios.put(
                    `https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE}/dns_records/${dnsRecord}`,
                    {
                        type: recordData.type,  // Keep the same record type (e.g., "A" record)
                        name: recordData.name,  // Keep the same name
                        content: ip,           // Update only the IP address
                        ttl: recordData.ttl,   // Keep the same TTL
                        proxied: recordData.proxied, // Keep the proxy setting
                    },
                    {
                        headers: {
                            "X-Auth-Email": process.env.CF_MAIL,
                            Authorization: `Bearer ${process.env.CF_AUTH}`,
                        },
                    }
                );
                return update;
            })
        );

        const success = updateResults.every((update) => update.status === 200);
        res.json({ status: success ? "success" : "failed" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "failed", error: "An error occurred, Check Logs" });
    }
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});