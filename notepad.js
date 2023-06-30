const { SerialPort, ReadlineParser } = require("serialport");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const parser = new ReadlineParser({});

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
let activePort;

// const findSerialPort = async (pnpId) => {
//   try {
//     const ports = await SerialPort.list();
//     const port = ports.find((port) => port.pnpId.includes(pnpId));
//     return port ? port.path : null;
//   } catch (error) {
//     console.error("Error searching for Serial Port:", error);
//     return null;
//   }
// };
// var portConnect;
let connectedPort = null;

let receivedData1 = "";
// const connectSerialPort = async (portPath, hexadecimalArray) => {
//   try {
//     console.log("dsfksdjfs->", portPath, hexadecimalArray);
//     portConnect = new SerialPort({
//       path: portPath,
//       baudRate: 115200,
//       dataBits: 8,
//       parity: "none",
//       stopBits: 1,
//       flowControl: false,
//     });

//     portConnect.on("error", (error) =>
//       console.error("Serial Port Error:", error)
//     );
//     portConnect.on("close", () => console.log("Serial Port Closed"));
//   } catch (error) {
//     console.error("Error connecting to Serial Port:", error);
//   }
// };

// const searchAndConnectSerialPort = async (pnpId) => {
//   try {
//     const portPath = await findSerialPort("FTDIBUS");
//     if (portPath) {
//       console.log("Serial Port Found:", portPath);
//       await connectSerialPort(portPath);
//     } else {
//       console.log("Serial Port not found");
//     }
//   } catch (error) {
//     console.error("Error:", error);
//   }
// };
const sendData = (data) => {
  connectedPort.write(data);
};

const receiveData = async (data) => {
  connectedPort.pipe(parser);
  if (connectedPort) {
    connectedPort.on("data", (data) => {
      const hexArray = Array.from(
        Buffer.from(data),
        (value) => `0x` + value.toString(16).padStart(2, "0")
      );
      console.log("Received data:", data);

      receivedData1 = data;
      console.log("Received data:", receivedData1);
      connectedPort.removeListener("data", receiveData);
    });
  }
};
// searchAndConnectSerialPort();
// receiveData();

// Route to get the serial port connection status
app.get("/serialport/status", (req, res) => {
  const isConnected = connectedPort !== null;

  console.log("connected", connectedPort);
  res.json({ isConnected, connectedPort });
});

// Route to get the available serial ports
app.get("/serialport/ports", (req, res) => {
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
app.post("/serialport/connect", (req, res) => {
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
  // connectedPort.on("data", (data) => {
  //   console.log("Received data from serial port:", data.toString());
  //   // Process received data as needed
  // });

  // connectedPort.on("close", () => {
  //   console.log("Serial port connection closed.");
  //   connectedPort = null;
  // });

  console.log(`Connected to serial port: ${port}`);
  // res.sendStatus(200);
  res.json({ isConnected: true, connectedPort });
});

// Route to disconnect from the current serial port
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

app.post("/startTest", async (req, res) => {
  try {
    console.log("post method", req.body);
    const decimalArray = req.body.data;
    const hexadecimalArray = decimalArray.map(
      (decimalValue) => `0x${decimalValue.toString(16).padStart(2, "0")}`
    );
    sendData(hexadecimalArray);
    await receiveData();
    if (receivedData1) {
      console.log("jdhsjdhfs", receivedData1);
      const hexArray = Array.from(
        Buffer.from(receivedData1),
        (value) => `0x` + value.toString(16).padStart(2, "0")
      );
      res.send({ data: hexArray });
      receivedData1 = "";
    }
  } catch (error) {
    console.error("Error:", error);
  }
});

app.listen(5004, () => {
  console.log("Server started on port 5004");
});
