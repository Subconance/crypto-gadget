const express = require('express');
const routes = require("./routes/");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.listen(PORT, () => {
  console.log(`crypto-gadget API started on port: ` + PORT);
});

app.use("/api", routes);