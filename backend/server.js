const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const app = express();

app.use(express.json());
app.use(cookieParser());

app.use(cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
    credentials: true
}));


const authRoutes = require("./routes/loginRoutes");
app.use("/", authRoutes);
const userRoutes = require("./routes/userRoutes");
app.use("/users", userRoutes);
const departmentRoutes = require("./routes/departmentRoutes");
app.use("/api/departments", departmentRoutes);


app.listen(3000, () => console.log(" Server running at http://localhost:3000"));
