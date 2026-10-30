import { Request, Response } from "express";
import { PaymentMethod, OrderStatus } from "@prisma/client";
import { prisma } from "../prisma";
import { notifyFeedback } from "../services/telegramService";

interface OrderItemInput {
  bookId: string;
  quantity: number;
}

export const createFeedback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const message =
    typeof req.body?.message === "string" ? req.body.message.trim() : "";
  const customerName =
    typeof req.body?.customerName === "string" ? req.body.customerName.trim() : "";
  const phone =
    typeof req.body?.phone === "string" ? req.body.phone.trim() : "";

  if (!message) {
    res.status(400).json({
      success: false,
      message: "يرجى كتابة نص المقترح أو الرسالة",
    });
    return;
  }

  try {
    const feedback = {
      content: message,
      customerName: customerName || undefined,
      phone: phone || undefined,
      createdAt: new Date(),
    };

    await notifyFeedback(feedback, req.user);

    res.status(201).json({
      success: true,
      message: "تم إرسال المقترح بنجاح",
    });
  } catch (error) {
    console.error("Feedback submission error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit feedback",
    });
  }
};


export const createOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user.id;
    const { address, notes, paymentMethod, transferNumber, items, name, phone } = req.body;

    if (
      !address ||
      !paymentMethod ||
      !transferNumber ||
      !items ||
      !Array.isArray(items) ||
      items.length === 0
    ) {
      res.status(400).json({
        success: false,
        message:
          "Required order fields missing: address, paymentMethod, transferNumber, items",
      });
      return;
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      res.status(400).json({
        success: false,
        message: `Invalid payment method. Allowed: ${Object.values(PaymentMethod).join(", ")}`,
      });
      return;
    }

    const isCashier =
      req.user?.role === "ADMIN" ||
      (typeof address === "string" && address.includes("كاشير"));
    const initialStatus = isCashier ? OrderStatus.CONFIRMED : OrderStatus.PENDING;
    const deliveryFee = isCashier ? 0 : 20;

    const newOrder = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      const orderItemsToCreate = [];

      for (const item of items as OrderItemInput[]) {
        if (!item.bookId || !item.quantity || item.quantity <= 0) {
          throw new Error("Invalid item format or quantity");
        }

        const book = await tx.book.findUnique({
          where: { id: item.bookId },
          select: {
            id: true,
            title: true,
            price: true,
            quantity: true,
          },
        });

        if (!book) {
          throw new Error(`Book not found with ID: ${item.bookId}`);
        }

        if (book.quantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${book.title}". Available: ${book.quantity}, Requested: ${item.quantity}`,
          );
        }

        
        await tx.book.update({
          where: { id: book.id },
          data: {
            quantity: { decrement: item.quantity },
          },
        });

        subtotal += book.price * item.quantity;

        orderItemsToCreate.push({
          bookId: book.id,
          quantity: item.quantity,
          priceAtBuy: book.price,
        });
      }

      const total = subtotal + deliveryFee;

      
      if (name || phone) {
        const updateData: { name?: string; phone?: string } = {};
        if (typeof name === "string" && name.trim()) {
          updateData.name = name.trim();
        }
        if (typeof phone === "string" && phone.trim()) {
          const trimmedPhone = phone.trim();
          const existing = await tx.user.findUnique({
            where: { phone: trimmedPhone },
            select: { id: true },
          });
          if (!existing || existing.id === userId) {
            updateData.phone = trimmedPhone;
          }
        }
        if (Object.keys(updateData).length > 0) {
          await tx.user.update({
            where: { id: userId },
            data: updateData,
          });
        }
      }

      return await tx.order.create({
        data: {
          userId,
          address,
          notes,
          paymentMethod,
          transferNumber,
          subtotal,
          deliveryFee,
          total,
          status: initialStatus,
          telegramMessageId: null,
          items: {
            create: orderItemsToCreate,
          },
        },
        include: {
          user: {
            select: { id: true, name: true, phone: true, email: true },
          },
          items: {
            include: {
              book: {
                select: { code: true, title: true, image: true },
              },
            },
          },
        },
      });
    });

    res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: newOrder,
    });
  } catch (error: any) {
    console.error("Order creation error:", error);
    res.status(400).json({
      success: false,
      message: error?.message || "Failed to process order",
    });
  }
};


export const getMyOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user.id;

    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            book: {
              select: { code: true, title: true, image: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching user orders",
    });
  }
};


export const getMyOrderById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user.id;
    const orderId = Number(req.params.id);

    if (isNaN(orderId)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        userId: userId, 
      },
      include: {
        items: {
          include: {
            book: {
              select: { code: true, title: true, price: true, image: true },
            },
          },
        },
      },
    });

    if (!order) {
      res.status(404).json({
        success: false,
        message: "Order not found or you do not have permission to view it",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Error fetching single order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching order details",
    });
  }
};


export const updateMyOrder = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const userId = req.user.id;
    const orderId = Number(req.params.id);
    const { address, notes } = req.body;

    if (isNaN(orderId)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    if (!address && notes === undefined) {
      res.status(400).json({
        success: false,
        message: "Please provide address or notes to update",
      });
      return;
    }

    const existingOrder = await prisma.order.findFirst({
      where: { id: orderId, userId },
    });

    if (!existingOrder) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    
    if (existingOrder.status !== OrderStatus.PENDING) {
      res.status(400).json({
        success: false,
        message:
          "Cannot modify order details after it has been confirmed or cancelled",
      });
      return;
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        ...(address ? { address } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
    });

    res.status(200).json({
      success: true,
      message: "Order shipping details updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating order",
    });
  }
};
