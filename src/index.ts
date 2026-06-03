// Importing env variables
import "dotenv/config";

// Importing types
import "./types/express.type";

// Importing packages
import express, { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

// Importing configs
import connect from "./configs/mongoose.config";

// Importing routes
import routes from "./routes/index";

const port = process.env.PORT || 8080;

const app: Express = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api", routes);

// Health check
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({ message: "Milk Distribution System API is running" });
});

connect().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
});
