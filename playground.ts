import "dotenv/config";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient({
  log: ["query"],
});

async function learnPrisma() {
  console.log("\n======================================================= ");
  console.log("1. Filtering, Stock Check & Sorting");
  console.log("=======================================================");

  
  const affordableInStockBooks = await prisma.book.findMany({
    where: {
      price: { lte: 150 },      
      quantity: { gt: 0 },     
    },
    orderBy: {
      price: "desc",
    },
    select: {
      code: true,
      title: true,
      price: true,
      quantity: true,
      category: true,
    },
  });

  console.log("Result (Affordable & In-Stock):", affordableInStockBooks);

  console.log("\n=======================================================");
  console.log("2. Relational Query (Eager Loading with Include)");
  console.log("=======================================================");

  
  const orders = await prisma.order.findMany({
    include: {
      user: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      items: {
        include: {
          book: {
            select: {
              code: true,
              title: true,
              price: true,
            },
          },
        },
      },
    },
  });

  console.log("Orders with User & Book Details:\n", JSON.stringify(orders, null, 2));

  console.log("\n=======================================================");
  console.log("3. Atomic Stock Decrement (Simulation)");
  console.log("=======================================================");

  
  const firstBook = await prisma.book.findFirst();

  if (firstBook) {
    const updatedBook = await prisma.book.update({
      where: { id: firstBook.id },
      data: {
        quantity: { decrement: 1 }, 
      },
      select: {
        title: true,
        quantity: true,
      },
    });

    console.log(`Updated "${updatedBook.title}" remaining quantity:`, updatedBook.quantity);
  }
}

learnPrisma()
  .catch((error) => {
    console.error("Execution Error:", error);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });