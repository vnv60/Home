import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) return res.status(401).json({ message: "Chưa được xác thực!" });

  jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, payload) => {
    if (err) return res.status(403).json({ message: "Mã thông báo không hợp lệ!" });
    req.userId = payload.id;
    req.userRole = payload.role;
    

    next();
  });
};
