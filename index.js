const express = require("express")
const axios = require("axios");
require("dotenv").config()
const app = express()
const port = process.env.PORT || 3000

app.get("/", async (req, res) => {
    const response = await axios(`https://api.ipapi.is`)
    console.log(response.data.ip)
    const ip = response.data.ip

    const update = await axios.put(`https://api.cloudflare.com/client/v4/zones/${process.env.CF_ZONE}/dns_records/${process.env.CF_DNS}`,  {
        "type": "A",
            "name": "rahul",
            "content": ip,
            "ttl": 1,
            "proxied": true
    }, {
        headers: {
            "X-Auth-Email" : process.env.CF_MAIL,
            "Authorization" : `Bearer ${process.env.CF_AUTH}`
        }
    })
    console.log(update.data)

    res.send( (update.status == 200) ? "success" : "chud gaye guru")
    // res.send(response.data.ip)
})


app.listen(3000)

