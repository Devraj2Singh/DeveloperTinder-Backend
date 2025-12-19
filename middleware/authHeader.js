import jwt from "jsonwebtoken";

const authenticateToken = (req, res, next) => {
  const token = req.cookies?.token; // <-- FIX
  //console.log("Token from cookie:", token);

  if (!token) {
    return res.status(401).json({ message: "Please Login" });
  }

  jwt.verify(token, "DEV_SECRET_KEY", (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" });
    }

    req.user = user;
    
    next();
  });
};

export default authenticateToken;
