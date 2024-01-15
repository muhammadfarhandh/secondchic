const mongoose = require('mongoose');

const connect = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("Mongodb Connected");
    } catch (error) {
        console.error(error);
        console.error("Database not connected");
        process.exit(1);
      }
}

module.exports = {
    connect
}