import jwt from "jsonwebtoken";
import { config } from "./config.js";
function createToken(user) {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "8h", issuer: "cuido-api" });
}
function authenticate(req, res, next) {
  const token = req.header("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ message: "Debes iniciar sesi\xF3n." });
    return;
  }
  try {
    req.user = jwt.verify(token, config.jwtSecret, { issuer: "cuido-api" });
    next();
  } catch {
    res.status(401).json({ message: "Tu sesi\xF3n venci\xF3. Inicia sesi\xF3n nuevamente." });
  }
}
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.rol)) {
      res.status(403).json({ message: "No tienes permiso para realizar esta acci\xF3n." });
      return;
    }
    next();
  };
}
export {
  authenticate,
  authorize,
  createToken
};
