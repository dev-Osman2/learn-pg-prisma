import { requireAuth, optionalAuth } from "../middleware/auth.middleware";
import {
  createOrder,
  createFeedback,
  getMyOrders,
  getMyOrderById,
  updateMyOrder,
} from "../controllers/order.controller";
import { Router } from "express";

const router = Router();


router.post("/feedback", optionalAuth, createFeedback);


router.use(requireAuth);

router.post("/", createOrder);

router.get("/my-orders", getMyOrders);


router.get("/:id", getMyOrderById);


export default router;