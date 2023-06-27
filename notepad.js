const { SerialPort, ReadlineParser } = require("serialport");
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const parser = new ReadlineParser({
  // delimiter: "\r\n",
});

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
let activePort;
// const listSerialPorts = async () => {
//   try {
//     const ports = await SerialPort.list();
//     console.log("Available Serial Ports:");
//     ports.forEach((port) => {
//       console.log(`- ${port}`);
//       if (port.pnpId.includes("FTDIBUS")) {
//         activePort = port.path;
//       }
//     });
//     // Store the list of ports in a variable or use it as needed
//     const portPaths = ports.map((port) => port);
//     console.log("Port Paths:", portPaths);
//     return portPaths;
//   } catch (error) {
//     console.error("Error listing Serial Ports:", error);
//   }
// };

// const printPortNum = async () => {
//   let a = await listSerialPorts();
//   console.log("listed serialports", a);
// };

// Call the wrapper function
// printPortNum();
// console.log("activePort--------->", activePort);
// console.log("listed serialports", await listSerialPorts());
// Call the function to list serial ports
// listSerialPorts();

// const port = new SerialPort({
//   path: activePort,
//   baudRate: 115200,
//   dataBits: 8,
//   parity: "none",
//   stopBits: 1,
//   flowControl: false,
// });

// Function to search for a serial port based on pnpId
const findSerialPort = async (pnpId) => {
  try {
    const ports = await SerialPort.list();
    const port = ports.find((port) => port.pnpId.includes(pnpId));
    return port ? port.path : null;
  } catch (error) {
    console.error("Error searching for Serial Port:", error);
    return null;
  }
};
let portConnect;
// Connect to the active serial port
const connectSerialPort = async (portPath, hexadecimalArray) => {
  try {
    // const port = new SerialPort(portPath, { baudRate: 115200 });
    console.log("dsfksdjfs->", portPath, hexadecimalArray);
    portConnect = new SerialPort({
      path: portPath,
      baudRate: 115200,
      dataBits: 8,
      parity: "none",
      stopBits: 1,
      flowControl: false,
    });
    // const parser = port.pipe(new Readline({ delimiter: "\n" }));
    // port.write(hexadecimalArray);
    // // Handle data received from the serial port
    // //   console.log("ehbjf");
    // port.on("data", (data) => {
    //   const hexArray = Array.from(
    //     Buffer.from(data),
    //     (value) => `0x` + value.toString(16).padStart(2, "0")
    //   );
    //   console.log("Received data:", data);
    //   // Process the received data as needed
    //   if (data) {
    //     return data;
    //   }
    // });

    // Handle errors and close events
    port.on("error", (error) => console.error("Serial Port Error:", error));
    port.on("close", () => console.log("Serial Port Closed"));
  } catch (error) {
    console.error("Error connecting to Serial Port:", error);
  }
};

// Search for the serial port with the specified pnpId
const searchAndConnectSerialPort = async (pnpId) => {
  try {
    const portPath = await findSerialPort("FTDIBUS");
    if (portPath) {
      console.log("Serial Port Found:", portPath);
      await connectSerialPort(portPath);
    } else {
      console.log("Serial Port not found");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};
const sendData = (data) => {
  portConnect.write(hexadecimalArray);
};

const receiveData = (data) => {
  portConnect.pipe(parser);
  portConnect.on("data", (data) => {
    const hexArray = Array.from(
      Buffer.from(data),
      (value) => `0x` + value.toString(16).padStart(2, "0")
    );
    console.log("Received data:", data);
  });
};
searchAndConnectSerialPort();
receiveData();

app.post("/startTest", async (req, res) => {
  try {
    console.log("post method", req.body);
    const decimalArray = req.body.data;
    const hexadecimalArray = decimalArray.map(
      (decimalValue) => `0x${decimalValue.toString(16).padStart(2, "0")}`
    );
    sendData(hexadecimalArray);
    // console.log(hexadecimalArray);
    // const portPath = await findSerialPort("FTDIBUS");
    // if (portPath) {
    //   console.log("Serial Port Found:", portPath);
    //   let a = await connectSerialPort(portPath, hexadecimalArray);

    //   console.log("check data", a);
    //   res.send({ data: a });
    // } else {
    //   console.log("Serial Port not found");
    // }
  } catch (error) {
    console.error("Error:", error);
  }
});

// searchAndConnectSerialPort("FTDIBUS");
app.listen(5004, () => {
  console.log("Server started on port 5004");
});
