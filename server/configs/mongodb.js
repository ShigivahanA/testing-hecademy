import mongoose from "mongoose";

// Connect to the MongoDB database
const connectDB = async () => {
  mongoose.connection.on("connected", () => console.log("Database Connected"));

  // ✅ Append db name "lms" only once
  await mongoose.connect(`${process.env.MONGODB_URI}lms`);
};

export default connectDB;
