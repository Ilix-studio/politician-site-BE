const allowOrigins = [
  "http://localhost:5173",
  "https://www.biswajitphukan.in/",
  "https://biswajitphukan.in/",
  "https://www.biswajitphukan.in",
  "https://biswajitphukan.in/admin/login",
  "https://biswajitphukan.in/admin/dashboard",
];

// Add environment-specific origins
if (process.env.NODE_ENV === "production" && process.env.FRONTEND_URL) {
  allowOrigins.push(process.env.FRONTEND_URL);
}

export default allowOrigins;
