const { SerialPort, ReadlineParser } = require("serialport");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const router = express.Router();
const parser = new ReadlineParser({});
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
var connectedPort = null;

app.use(express.json({ limit: "50mb" }));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(cors());
const server = createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let activePort;

const sendData = (data) => {
  connectedPort.write(data);
};

const receiveData = () => {
  return new Promise((resolve, reject) => {
    let receivedData = Buffer.from([]);
    const timeout = setTimeout(() => {
      reject(new Error("Timeout: No data received"));
    }, 5000);

    if (connectedPort) {
      connectedPort.on("data", (data) => {
        clearTimeout(timeout);

        receivedData = Buffer.concat([receivedData, data]);
        const messageStartIndex = receivedData.indexOf(0xc5);
        const messageEndIndex = receivedData.indexOf(0x5c);

        if (messageStartIndex !== -1 && messageEndIndex !== -1) {
          const completeMessage = receivedData.slice(
            messageStartIndex,
            messageEndIndex + 1
          );
          receivedData = receivedData.slice(messageEndIndex + 1);
          resolve(completeMessage);
        }
      });
    } else {
      reject(new Error("Serial port not connected"));
    }
  });
};
app.get("/", (req, res) => {
  res.send("App is running 😊😊😊😊");
});

app.get("/serialport/status", (req, res) => {
  const isConnected = connectedPort !== null;

  if (connectedPort !== null) {
    res.json({ isConnected, connectedPort: connectedPort.settings.path });
  } else {
    res.json({ isConnected, connectedPort: null });
  }
});

app.get("/serialport/ports", (req, res) => {
  console.log("/serialport/ports");
  SerialPort.list()
    .then((ports) => {
      const availablePorts = ports.map((port) => port.path);
      res.json({ ports: availablePorts, portsList: ports });
    })
    .catch((error) => {
      console.error("Error fetching available serial ports:", error);
      res.status(500).json({ error: "Error fetching available serial ports" });
    });
});

app.post("/serialport/connect", async (req, res) => {
  console.log("/serialport/connect");
  const { port } = req.body;
  if (connectedPort !== null) {
    console.warn("Already connected to a serial port. Disconnect first.");
    res.status(400).json({
      connectedPort,
      message: "Already connected to a serial port. Disconnect first.",
    });
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
  // if (connectedPort) {
  console.log("jdbajdfh");
  let receivedData = Buffer.from([]);
  let completeMessage;
  connectedPort.on("data", (data) => {
    receivedData = Buffer.concat([receivedData, data]);
    const messageStartIndex = receivedData.indexOf(0xc5);
    const messageEndIndex = receivedData.indexOf(0x5c);

    if (messageStartIndex !== -1 && messageEndIndex !== -1) {
      completeMessage = receivedData.slice(
        messageStartIndex,
        messageEndIndex + 1
      );
      receivedData = receivedData.slice(messageEndIndex + 1);
      console.log("Received data:", completeMessage);
    }
    const hexArray = Array.from(
      Buffer.from(completeMessage),
      (value) => `0x` + value.toString(16).padStart(2, "0")
    );

    io.emit("serialData", hexArray);
  });
  // }
});
io.on("connection", (socket) => {
  console.log("A user connected");

  // if (connectedPort) {
  //   console.log("jdbajdfh");
  //   let receivedData = Buffer.from([]);
  //   let completeMessage;
  //   connectedPort.on("data", (data) => {
  //     receivedData = Buffer.concat([receivedData, data]);
  //     const messageStartIndex = receivedData.indexOf(0xc5);
  //     const messageEndIndex = receivedData.indexOf(0x5c);

  //     if (messageStartIndex !== -1 && messageEndIndex !== -1) {
  //       completeMessage = receivedData.slice(
  //         messageStartIndex,
  //         messageEndIndex + 1
  //       );
  //       receivedData = receivedData.slice(messageEndIndex + 1);
  //       console.log("Received data:", completeMessage);
  //     }
  //     const hexArray = Array.from(
  //       Buffer.from(completeMessage),
  //       (value) => `0x` + value.toString(16).padStart(2, "0")
  //     );

  //     socket.emit("serialData", hexArray);
  //   });
  // }
  socket.on("serialData1", (data) => {
    console.log(data);
  });
  socket.on("disconnect", () => {
    console.log("User disconnected");
  });
});
server.listen(5005, () => {
  console.log(`Server is running on port 5005`);
});

app.post("/serialport/disconnect", (req, res) => {
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

app.listen(5004, () => {
  console.log("Server started on port 5004");
});
