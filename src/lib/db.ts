import mongoose from 'mongoose';

const connection: {isConnected?: number} = {};

const dbConnect = async () => {
  if (connection.isConnected) {
    return;
  }
  try {
    const db = await mongoose.connect(process.env.MONGODB_URI as string);
    connection.isConnected = db.connections[0].readyState;
  } catch (error) {
    console.log(error);
  }
};

export default dbConnect;
