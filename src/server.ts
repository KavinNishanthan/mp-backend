// Importing packages
import dotenv from 'dotenv';

// Importing app
import app from './app';

// Importing configs
import connect from './configs/mongoose.config';

dotenv.config();

const startServer = async () => {
  try {
    await connect();

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
};

startServer();
