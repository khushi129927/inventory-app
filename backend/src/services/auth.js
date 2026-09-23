import dotenv from "dotenv";
dotenv.config();

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

function isMissingUserTableError(error) {
  if (error?.code !== "P2021") {
    return false;
  }

  const tableName = error?.meta?.table;
  const modelName = error?.meta?.modelName;

  return modelName === "User" || tableName === "public.User" || tableName === "public.users";
}

export function createAuthService(prisma) {
  return {
    async login({ username, password }) {
      let user;

      try {
        user = await prisma.user.findUnique({
          where: { username },
        });
      } catch (error) {
        if (isMissingUserTableError(error)) {
          return null;
        }
        throw error;
      }

      if (!user) return null;

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) return null;

      const token = jwt.sign(
        { sub: user.id, role: user.role },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
        },
      };
    },

    async getSession(token) {
      if (!token) return null;
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await prisma.user.findUnique({
          where: { id: decoded.sub },
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
          },
        });
        if (!user) return null;
        return { user, token };
      } catch {
        return null;
      }
    },
  };
}

export const authMiddleware = (authService) => async (req, res, next) => {
  const token = req.cookies?.token || req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const session = await authService.getSession(token);
  if (!session) {
    return res.status(401).json({ message: "Invalid or expired session" });
  }

  req.user = session.user;
  next();
};

export const roleGuard = (...allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ message: "Insufficient permissions" });
  }
  next();
};
