const app = require('./app');

// When running locally with nodemon, start the HTTP server normally
// When running on Vercel, just export the app (Vercel calls it as a function)
if (require.main === module) {
  const prisma = require('./prisma');
  const PORT = process.env.PORT || 3000;

  const start = async () => {
    try {
      await prisma.$connect();
      console.log('✅ Database connected');
      app.listen(PORT, () => console.log(`🚀 OBE Tracker API running on port ${PORT}`));
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  };
  start();
}

// Vercel serverless: export the Express app directly
module.exports = app;
