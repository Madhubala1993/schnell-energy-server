const { SerialPort, ReadlineParser } = require("serialport");
const express = require("express");
const serverless = require("serverless-http");
const cors = require("cors");
const bodyParser = require("body-parser");
const router = express.Router();
const parser = new ReadlineParser({});

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
let activePort;

let connectedPort = null;

const sendData = (data) => {
  connectedPort.write(data);
};

const receiveData = () => {
  return new Promise((resolve, reject) => {
    let receivedData = Buffer.from([]);
    const timeout = setTimeout(() => {
      reject(new Error("Timeout: No data received"));
    }, 5000); // Set a timeout value (in milliseconds) for data reception

    if (connectedPort) {
      connectedPort.on("data", (data) => {
        clearTimeout(timeout); // Clear the timeout as data is received

        receivedData = Buffer.concat([receivedData, data]);
        const messageStartIndex = receivedData.indexOf(0xc5);
        const messageEndIndex = receivedData.indexOf(
          0x5c,
          messageStartIndex + 1
        );

        if (messageStartIndex !== -1 && messageEndIndex !== -1) {
          const completeMessage = receivedData.slice(
            messageStartIndex,
            messageEndIndex + 1
          );
          receivedData = receivedData.slice(messageEndIndex + 1);
          resolve(completeMessage); // Resolve the promise with the complete message
        }
      });
    } else {
      reject(new Error("Serial port not connected"));
    }
  });
};
router.get("/", (req, res) => {
  res.send("App is running 😊😊😊😊");
});

// Route to get the serial port connection status
router.get("/serialport/status", (req, res) => {
  const isConnected = connectedPort !== null;

  console.log("connected", connectedPort);
  res.json({ isConnected, connectedPort });
});

// Route to get the available serial ports
router.get("/serialport/ports", (req, res) => {
  console.log("/serialport/ports");
  SerialPort.list()
    .then((ports) => {
      const availablePorts = ports.map((port) => port.path);
      res.json({ ports: availablePorts });
    })
    .catch((error) => {
      console.error("Error fetching available serial ports:", error);
      res.status(500).json({ error: "Error fetching available serial ports" });
    });
});

// Route to connect to a serial port
router.post("/serialport/connect", (req, res) => {
  console.log("/serialport/connect");
  const { port } = req.body;
  if (connectedPort !== null) {
    console.warn("Already connected to a serial port. Disconnect first.");
    res.status(400).json({ connectedPort });
    return;
  }

  connectedPort = new SerialPort({
    path: port,
    baudRate: 115200,
    dataBits: 8,
    parity: "none",
    stopBits: 1,
    flowControl: false,
  });

  console.log(`Connected to serial port: ${port}`);
  res.json({ isConnected: true, connectedPort });
});

// Route to disconnect from the current serial port
router.post("/serialport/disconnect", (req, res) => {
  if (connectedPort === null) {
    console.warn("No serial port connected.");
    res.status(400).json({ error: "No serial port connected" });
    return;
  }

  connectedPort.close((error) => {
    if (error) {
      console.error("Error closing serial port:", error);
      res.status(500).json({ error: "Error closing serial port" });
    } else {
      console.log("Serial port disconnected.");
      connectedPort = null;
      res.sendStatus(200);
    }
  });
});

router.post("/startTest", async (req, res) => {
  try {
    console.log("post method", req.body);
    const decimalArray = req.body.data;
    const hexadecimalArray = decimalArray.map(
      (decimalValue) => `0x${decimalValue.toString(16).padStart(2, "0")}`
    );
    sendData(hexadecimalArray);
    const receivedData = await receiveData();

    if (receivedData) {
      const hexArray = Array.from(
        Buffer.from(receivedData),
        (value) => `0x` + value.toString(16).padStart(2, "0")
      );
      console.log("Received data:", hexArray);
      res.send({ data: hexArray });
    } else {
      console.log("No data received");
      res.send({ data: [] });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send({ error: "An error occurred" });
  }
});
// app.listen(5004, () => {
//   console.log("Server started on port 5004");
// });

app.use("/.netlify/functions/api", router);
module.exports.handler = serverless(app);
