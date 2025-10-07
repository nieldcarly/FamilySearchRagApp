const express = require('express');
const apiRoutes = require('./routes/api');
const path = require('path');

const app = express();
const port = 3000;

// Serve frontend if needed
app.use(express.static(path.join(__dirname, '../../my-js-front-end')));

// Mount API routes
app.use('/', apiRoutes);

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});