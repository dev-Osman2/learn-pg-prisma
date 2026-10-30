import { prisma } from "../prisma";

export const getOrderSummary = async () => {
  const [
    totalOrders,
    pendingOrders,
    confirmedOrders,
    cancelledOrders,
    salesAggregate,
    itemsAggregate,
    recentOrders,
  ] = await Promise.all([
    
    prisma.order.count(),

    
    prisma.order.count({ where: { status: "PENDING" } }),

    
    prisma.order.count({ where: { status: "CONFIRMED" } }),

    
    prisma.order.count({ where: { status: "CANCELLED" } }),

    
    prisma.order.aggregate({
      where: {
        status: { not: "CANCELLED" },
      },
      _sum: {
        total: true,
        subtotal: true,
        deliveryFee: true,
      },
    }),

    
    prisma.orderItem.aggregate({
      where: {
        order: {
          status: { not: "CANCELLED" },
        },
      },
      _sum: {
        quantity: true,
      },
    }),

    
    prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },
        items: {
          include: {
            book: {
              select: {
                id: true,
                code: true,
                title: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    overview: {
      totalOrders,
      pendingOrders,
      confirmedOrders,
      cancelledOrders,
      totalSalesRevenue: salesAggregate._sum.total || 0,
      totalSubtotal: salesAggregate._sum.subtotal || 0,
      totalDeliveryFees: salesAggregate._sum.deliveryFee || 0,
      totalBooksSold: itemsAggregate._sum.quantity || 0,
    },
    byStatus: {
      PENDING: pendingOrders,
      CONFIRMED: confirmedOrders,
      CANCELLED: cancelledOrders,
    },
    recentOrders,
  };
};

export default {
  getOrderSummary,
};
