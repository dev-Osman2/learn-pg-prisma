import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { ApiError } from "../utils/apiError";

export const globalErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = err.statusCode || 500;
  let message = err.message || "حدث خطأ غير متوقع في الخادم";
  let errors = null;

  
  if (err instanceof ZodError) {
    statusCode = 400;
    message = "بيانات غير صالحة";
    errors = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  }

  
  else if (err instanceof Prisma.PrismaClientKnownRequestError) {
    
    if (err.code === "P2002") {
      statusCode = 409;
      const target = (err.meta?.target as string[])?.join(", ") || "حقل";
      message = `هذه القيمة مستخدمة بالفعل (${target})`;
    }
    
    else if (err.code === "P2025") {
      statusCode = 404;
      message = "العنصر المطلوب غير موجود في قاعدة البيانات";
    }
  }

  
  if (process.env.NODE_ENV !== "production") {
    console.error("💥 ERROR CAUGHT BY GLOBAL HANDLER:", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
};