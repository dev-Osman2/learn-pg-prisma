export const formatConfirmedOrderForPrep = (order: any): string => {
  const itemsText =
    order.items
      ?.map(
        (item: any, index: number) =>
          `  ${index + 1}. <b>${item.book?.title || "كتاب"}</b> (الكمية: ${item.quantity}) - ${item.priceAtBuy} ج`,
      )
      .join("\n") || "  لا توجد عناصر";

  const customerName = order.user?.name || "عميل غير محدد";
  const customerPhone = order.user?.phone || "غير متوفر";

  return (
    `📦 <b>طلب مؤكد وجاهز للتجهيز #${order.id}</b>\n\n` +
    `👤 <b>العميل:</b> ${customerName}\n` +
    `📞 <b>الهاتف:</b> ${customerPhone}\n` +
    `📍 <b>العنوان:</b> ${order.address}\n` +
    `💳 <b>طريقة الدفع:</b> ${order.paymentMethod}\n` +
    `🔢 <b>رقم التحويل:</b> <code>${order.transferNumber || "نقدي"}</code>\n` +
    `📝 <b>ملاحظات:</b> ${order.notes || "لا توجد"}\n\n` +
    `📚 <b>العناصر للتجهيز:</b>\n${itemsText}\n\n` +
    `💰 <b>المجموع الجزئي:</b> ${order.subtotal} ج\n` +
    `🚚 <b>رسوم التوصيل:</b> ${order.deliveryFee} ج\n` +
    `💵 <b>الإجمالي الكلي:</b> ${order.total} ج\n` +
    `📅 <b>التاريخ:</b> ${new Date(order.createdAt).toLocaleString("ar-EG")}`
  );
};

export const formatOrderStatusMessage = (
  order: any,
  oldStatus: string,
  newStatus: string,
): string => {
  return (
    `🔄 <b>تحديث حالة الطلب #${order.id}</b>\n\n` +
    `👤 <b>العميل:</b> ${order.user?.name || "غير محدد"}\n` +
    `⚡ <b>الحالة السابقة:</b> ${oldStatus}\n` +
    `✅ <b>الحالة الجديدة:</b> <b>${newStatus}</b>\n` +
    `💵 <b>إجمالي الطلب:</b> ${order.total} ج`
  );
};

export const formatFeedbackMessage = (suggestion: any, user?: any): string => {
  const userName =
    user?.name || suggestion?.customerName || "عميل زائر (بدون تسجيل)";
  const userPhone = user?.phone || suggestion?.phone || "غير متوفر";

  return (
    `💡 <b>ملاحظة / اقتراح جديد</b>\n\n` +
    `👤 <b>المرسل:</b> ${userName}\n` +
    `📞 <b>الهاتف:</b> ${userPhone}\n` +
    `💬 <b>نص الاقتراح:</b>\n${suggestion.content}\n\n` +
    `📅 <b>التاريخ:</b> ${new Date(suggestion.createdAt || Date.now()).toLocaleString("ar-EG")}`
  );
};
