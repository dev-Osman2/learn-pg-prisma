import {
  sendTelegramMessage,
  deleteTelegramMessage,
  clearAllTelegramMessages,
} from "./telegram/telegramClient";
import {
  formatConfirmedOrderForPrep,
  formatOrderStatusMessage,
  formatFeedbackMessage,
} from "./telegram/telegramFormatters";

export { clearAllTelegramMessages, deleteTelegramMessage };

export const isCashierOrder = (order: any): boolean => {
  if (!order) return false;

  if (order.user?.role === "ADMIN") return true;

  const address = typeof order.address === "string" ? order.address : "";
  if (
    address.includes("كاشير") ||
    address.includes("مقر المكتبة") ||
    address.includes("بيع مباشر")
  ) {
    return true;
  }

  const notes = typeof order.notes === "string" ? order.notes : "";
  if (notes.includes("كاشير")) {
    return true;
  }

  const transferNumber =
    typeof order.transferNumber === "string" ? order.transferNumber : "";
  if (transferNumber.includes("كاشير")) {
    return true;
  }

  return false;
};

export const notifyConfirmedOrder = async (
  order: any,
): Promise<number | null> => {
  if (isCashierOrder(order)) {
    return null;
  }

  try {
    const text = formatConfirmedOrderForPrep(order);
    return await sendTelegramMessage(text);
  } catch {
    return null;
  }
};

export const notifyNewOrder = notifyConfirmedOrder;

export const notifyOrderStatus = async (
  order: any,
  oldStatus: string,
  newStatus: string,
): Promise<number | null> => {
  if (isCashierOrder(order)) {
    return null;
  }

  try {
    const text = formatOrderStatusMessage(order, oldStatus, newStatus);
    return await sendTelegramMessage(text);
  } catch {
    return null;
  }
};

export const notifyFeedback = async (
  suggestion: any,
  user?: any,
): Promise<number | null> => {
  try {
    const text = formatFeedbackMessage(suggestion, user);
    return await sendTelegramMessage(text);
  } catch {
    return null;
  }
};

export default {
  isCashierOrder,
  notifyConfirmedOrder,
  notifyNewOrder,
  notifyOrderStatus,
  notifyFeedback,
  deleteTelegramMessage,
  clearAllTelegramMessages,
};
