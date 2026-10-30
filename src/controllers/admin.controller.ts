import { Request, Response } from "express";
import { OrderStatus } from "@prisma/client";
import { prisma } from "../prisma";
import {
  notifyConfirmedOrder,
  deleteTelegramMessage,
  clearAllTelegramMessages,
  isCashierOrder,
} from "../services/telegramService";

export const getAdminStats = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const [totalBooks, totalOrders, totalUsers, revenueResult] =
      await Promise.all([
        prisma.book.count(),
        prisma.order.count(),
        prisma.user.count(),
        prisma.order.aggregate({
          _sum: { total: true },
          where: { status: "CONFIRMED" },
        }),
      ]);

    res.status(200).json({
      success: true,
      data: {
        totalBooks,
        totalOrders,
        totalUsers,
        totalRevenue: revenueResult._sum.total || 0,
        authenticatedAdmin: {
          name: req.user.name,
          email: req.user.email,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const createBook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      code,
      title,
      description,
      fullDescription,
      price,
      oldPrice,
      quantity,
      category,
      image,
      author,
      publisher,
      pagesCount,
    } = req.body;

    if (
      !code ||
      !title ||
      !description ||
      price === undefined ||
      !category ||
      !image
    ) {
      res.status(400).json({
        success: false,
        message:
          "Required fields missing: code, title, description, price, category, image",
      });
      return;
    }

    const existingBook = await prisma.book.findUnique({
      where: { code: String(code) },
    });

    if (existingBook) {
      res.status(409).json({
        success: false,
        message: `Book with code ${code} already exists`,
      });
      return;
    }

    const newBook = await prisma.book.create({
      data: {
        code: String(code),
        title,
        description,
        fullDescription,
        price: Math.round(Number(price)),
        oldPrice: oldPrice ? Math.round(Number(oldPrice)) : null,
        quantity: quantity !== undefined ? Number(quantity) : 0,
        category,
        image,
        author,
        publisher,
        pagesCount: pagesCount ? Number(pagesCount) : null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Book created successfully",
      data: newBook,
    });
  } catch (error) {
    console.error("Error creating book:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error while creating book",
      });
  }
};

export const updateBook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const book = await prisma.book.findUnique({
      where: { id },
    });

    if (!book) {
      res.status(404).json({ success: false, message: "Book not found" });
      return;
    }

    const dataToUpdate: any = { ...updateData };
    if (updateData.code !== undefined)
      dataToUpdate.code = String(updateData.code);
    if (updateData.price !== undefined)
      dataToUpdate.price = Math.round(Number(updateData.price));
    if (updateData.oldPrice !== undefined)
      dataToUpdate.oldPrice = updateData.oldPrice
        ? Math.round(Number(updateData.oldPrice))
        : null;
    if (updateData.quantity !== undefined)
      dataToUpdate.quantity = Number(updateData.quantity);
    if (updateData.pagesCount !== undefined)
      dataToUpdate.pagesCount = updateData.pagesCount
        ? Number(updateData.pagesCount)
        : null;

    const updatedBook = await prisma.book.update({
      where: { id },
      data: dataToUpdate,
    });

    res.status(200).json({
      success: true,
      message: "Book updated successfully",
      data: updatedBook,
    });
  } catch (error) {
    console.error("Error updating book:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error while updating book",
      });
  }
};

export const deleteBook = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;

    const orderedItemsCount = await prisma.orderItem.count({
      where: { bookId: id },
    });

    if (orderedItemsCount > 0) {
      res.status(400).json({
        success: false,
        message:
          "Cannot delete book that is referenced in existing customer orders. Set quantity to 0 instead.",
      });
      return;
    }

    await prisma.book.delete({
      where: { id },
    });

    res.status(200).json({
      success: true,
      message: "Book deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting book:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error while deleting book",
      });
  }
};

export const getAdminUsers = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          not: "ADMIN",
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,

        _count: {
          select: { orders: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users for admin:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching registered users",
    });
  }
};

export const getAdminOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { status } = req.query;

    const orders = await prisma.order.findMany({
      where:
        status && typeof status === "string"
          ? { status: status as OrderStatus }
          : {},
      include: {
        user: {
          select: { name: true, phone: true, email: true, role: true },
        },
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
    console.error("Error fetching admin orders:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error while fetching orders",
      });
  }
};

export const updateOrderStatus = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(OrderStatus).includes(status)) {
      res.status(400).json({
        success: false,
        message: `Invalid status. Permitted values: ${Object.values(OrderStatus).join(", ")}`,
      });
      return;
    }

    const orderId = Number(id);
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        user: { select: { name: true, phone: true, email: true, role: true } },
      },
    });

    if (!existingOrder) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const previousStatus = existingOrder.status;
    const targetStatus = status as OrderStatus;

    let updatedOrder = await prisma.$transaction(async (tx) => {
      if (
        targetStatus === OrderStatus.CANCELLED &&
        previousStatus !== OrderStatus.CANCELLED
      ) {
        for (const item of existingOrder.items) {
          if (item.bookId) {
            await tx.book.update({
              where: { id: item.bookId },
              data: {
                quantity: { increment: item.quantity },
              },
            });
          }
        }
      }

      if (
        previousStatus === OrderStatus.CANCELLED &&
        (targetStatus === OrderStatus.PENDING ||
          targetStatus === OrderStatus.CONFIRMED)
      ) {
        for (const item of existingOrder.items) {
          if (item.bookId) {
            await tx.book.update({
              where: { id: item.bookId },
              data: {
                quantity: { decrement: item.quantity },
              },
            });
          }
        }
      }

      return await tx.order.update({
        where: { id: orderId },
        data: {
          status: targetStatus,
          ...(targetStatus === OrderStatus.CANCELLED
            ? { telegramMessageId: null }
            : {}),
        },
        include: {
          user: {
            select: { name: true, phone: true, email: true, role: true },
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

    if (
      targetStatus === OrderStatus.CONFIRMED &&
      !isCashierOrder(updatedOrder)
    ) {
      try {
        const messageId = await notifyConfirmedOrder(updatedOrder);
        if (messageId) {
          updatedOrder = await prisma.order.update({
            where: { id: orderId },
            data: { telegramMessageId: messageId },
            include: {
              user: {
                select: { name: true, phone: true, email: true, role: true },
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
        }
      } catch (tgError) {
        console.error("Failed to dispatch order to Telegram:", tgError);
      }
    } else if (targetStatus === OrderStatus.CANCELLED) {
      if (existingOrder.telegramMessageId) {
        try {
          await deleteTelegramMessage(existingOrder.telegramMessageId);
        } catch (tgError) {
          console.error(
            "Failed to delete order message from Telegram:",
            tgError,
          );
        }
      }
    }

    res.status(200).json({
      success: true,
      message: `Order #${id} status updated to ${status}`,
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Internal server error while updating status",
      });
  }
};

export const updateOrderAdminNote = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const orderId = Number(id);
    if (isNaN(orderId)) {
      res.status(400).json({ success: false, message: "Invalid order ID" });
      return;
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!existingOrder) {
      res.status(404).json({ success: false, message: "Order not found" });
      return;
    }

    const trimmedNote =
      typeof adminNote === "string" && adminNote.trim() !== ""
        ? adminNote.trim()
        : null;

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { adminNote: trimmedNote },
      include: {
        user: { select: { name: true, phone: true, email: true, role: true } },
        items: {
          include: {
            book: {
              select: { code: true, title: true, image: true },
            },
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      message: "Order admin note updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Error updating order admin note:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while updating admin note",
    });
  }
};

export const clearAllOrders = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const ordersWithTelegram = await prisma.order.findMany({
      where: {
        telegramMessageId: {
          not: null,
        },
      },
      select: {
        telegramMessageId: true,
      },
    });

    const messageIds = ordersWithTelegram
      .map((order) => order.telegramMessageId)
      .filter((id): id is number => id !== null && typeof id === "number");

    const telegramMessagesDeleted = await clearAllTelegramMessages(messageIds);

    const [deletedItems, deletedOrders] = await prisma.$transaction([
      prisma.orderItem.deleteMany({}),
      prisma.order.deleteMany({}),
    ]);

    res.status(200).json({
      success: true,
      message: "تم تفريغ قاعدة بيانات الطلبات بالكامل ومسح رسائل التلجرام",
      data: {
        deletedOrdersCount: deletedOrders.count,
        deletedItemsCount: deletedItems.count,
        telegramMessagesDeleted,
      },
    });
  } catch (error) {
    console.error("Error clearing all orders:", error);
    res.status(500).json({
      success: false,
      message: "فشل في مسح وتفريغ الطلبات",
    });
  }
};

export const verifyAdminSession = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Forbidden - Admin access required",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Admin verified successfully",
      data: {
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          role: req.user.role,
        },
      },
    });
  } catch (error) {
    console.error("Error verifying admin session:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during verification",
    });
  }
};
