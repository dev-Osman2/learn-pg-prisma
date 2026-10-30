import { Router } from "express";
import { requireAdmin } from "../middleware/auth.middleware";
import {
  getAdminStats,
  createBook,
  updateBook,
  deleteBook,
  getAdminOrders,
  updateOrderStatus,
  getAdminUsers, 
  updateOrderAdminNote,
  clearAllOrders,
  verifyAdminSession,
} from "../controllers/admin.controller";

const router = Router();

router.use(requireAdmin);

router.get("/verify", verifyAdminSession);
router.get("/stats", getAdminStats);


router.get("/users", getAdminUsers);

router.post("/books", createBook);
router.put("/books/:id", updateBook);
router.delete("/books/:id", deleteBook);

router.get("/orders", getAdminOrders);
router.delete("/orders/clear-all", clearAllOrders);
router.patch("/orders/:id/status", updateOrderStatus);
router.patch("/orders/:id/note", updateOrderAdminNote);
router.patch("/orders/:id/admin-note", updateOrderAdminNote);

export default router;