require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/config/db");

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || "development";

connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on PORT ${PORT} [${NODE_ENV}]`);
});