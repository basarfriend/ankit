const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

const port = Number(process.env.PORT) || 3000;

if (!process.env.MONGO_URI || !process.env.SESSION_SECRET) {
  console.error('MONGO_URI and SESSION_SECRET must be set in .env.');
  process.exit(1);
}

const app = require('./app');

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB.');
    app.listen(port, () => console.log(`Tixly is running at http://localhost:${port}`));
  })
  .catch((error) => {
    console.error('Unable to connect to MongoDB:', error.message);
    process.exit(1);
  });
