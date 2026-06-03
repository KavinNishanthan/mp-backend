// Importing packages
import dotenv from 'dotenv';

// Importing models
import userModel from '../models/user.model';

// Importing configs
import connect from '../configs/mongoose.config';

dotenv.config();

const seedAdmin = async () => {
  try {
    await connect();

    const adminExists = await userModel.findOne({ role: 'admin' });

    if (adminExists) {
      console.log('Admin user already exists');
      process.exit();
    }

    const admin = await userModel.create({
      name: 'Distributor Admin',
      username: 'admin',
      password: 'password123',
      role: 'admin'
    });

    console.log(`Admin created successfully: ${admin.username}`);
    process.exit();
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

seedAdmin();
