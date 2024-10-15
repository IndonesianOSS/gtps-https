const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();
app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 100, 
});
app.use(limiter);

const privateKey = fs.readFileSync("key.pem", "utf8");
const certificate = fs.readFileSync("cert.pem", "utf8");
const credentials = { key: privateKey, cert: certificate };

const logConnection = (req, sentKB) => {
  const log = `--------------\n${new Date().toISOString()} || Connection from: ${
    req.ip
  }. Connected to ${req.path}. Sent: ${sentKB} KB.\n--------------`;
  fs.appendFile(path.join(__dirname, "log.txt"), log + "\n", (err) => {
    if (err) {
      console.error("Error writing to log file:", err);
    }
  });
  console.log(log);
};

function getJsonObjectFromFile(fileName, key) {
  try {
    const data = fs.readFileSync(fileName, "utf8");
    const jsonData = JSON.parse(data);
    return jsonData[key];
  } catch (error) {
    console.error("Error reading the JSON file:", error);
    return null;
  }
}

const conf = getJsonObjectFromFile("conf.json", "config");

var pack = `server|${conf.ip}
port|${conf.port}
type|1
#maint|HTTP SERVER Free on Netflexs github

beta_server|127.0.0.1
beta_port|17091

beta_type|1
meta|localhost
RTENDMARKERBS1001
`;

app.use((req, res, next) => {
  const startTime = new Date();
  res.on("finish", () => {
    const endTime = new Date();
    const sentKB = res.get("Content-Length") / 1000 || 0;
    logConnection(req, sentKB);
  });
  next();
});

app.post("/growtopia/server_data.php", (req, res) => {
  res.send(pack);
});

app.get("/host", (req, res) => {
  if (conf) {
    res.send(
      `#Powertunnel enjoyer : )<br>${conf.ip} www.growtopia1.com<br>${conf.ip} www.growtopia2.com`
    );
  } else {
    res.status(500).send("Internal Server Error");
  }
});

app.get("/downhost", function (req, res) {
  const filePath = path.join(__dirname, "public", "host.txt");

  res.sendFile(
    filePath,
    {
      headers: {
        "Content-Disposition": `attachment; filename="host.txt"`,
      },
    },
    function (err) {
      if (err) {
        if (err.code === "ECONNABORTED") {
          console.log("Request aborted by the client");
        } else {
          console.error("Error while sending file:", err);
          res.status(err.status).end();
        }
      } else {
        console.log("File sent successfully");
      }
    }
  );
});

const HTTPS_PORT = 443;
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(HTTPS_PORT, () => {
  console.log(
    `HTTPS Server for game is running on https://localhost:${HTTPS_PORT}`
  );
});
