// Importing packages
import mongoose from 'mongoose';

const connect = async (): Promise<void> => {
  try {
    mongoose.set('strictQuery', false);
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/milk-distribution-system');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err: any) {
    console.error(`MongoDB Error: ${err.message}`);
    process.exit(1);
  }
};

export default connect;
