import app from './app';
import dotenv from 'dotenv';
import connectDB from './config/db';

dotenv.config();

connectDB();

const PORT: number = Number(process.env.PORT) || 5000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
