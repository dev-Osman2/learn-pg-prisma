import { Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

export const getBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    
    const { category, search } = req.query;

    
    const whereConditions: Prisma.BookWhereInput = {};

    
    if (category && typeof category === "string" && category !== "All") {
      whereConditions.category = category;
    }

    
    if (search && typeof search === "string" && search.trim() !== "") {
      const searchTerm = search.trim();
      whereConditions.OR = [
        {
          title: {
            contains: searchTerm,
            mode: "insensitive", 
          },
        },
        {
          author: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ];
    }

    
    const books = await prisma.book.findMany({
      where: whereConditions
    });

    
    res.status(200).json({
      success: true,
      count: books.length,
      data: books,
    });
  } catch (error) {
    console.error("Error fetching books:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching books",
    });
  }
};


export const getBookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const book = await prisma.book.findUnique({
      where: { code },
    });

    if (!book) {
      res.status(404).json({
        success: false,
        message: "Book not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: book,
    });
  } catch (error) {
    console.error("Error fetching book details:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error while fetching book details",
    });
  }
};


const getSearchTokens = (value: string | null | undefined): Set<string> =>
  new Set(
    (value || "")
      .toLocaleLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length > 2)
  );

export const getRelatedBooks = async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const currentBook = await prisma.book.findUnique({
      where: { code: String(code) },
    });

    if (!currentBook) {
      return res.status(404).json({ message: 'الكتاب غير موجود' });
    }

    const candidates = await prisma.book.findMany({
      where: {
        id: { not: currentBook.id },
        quantity: { gt: 0 },
      },
    });

    const currentTitleTokens = getSearchTokens(currentBook.title);

    const relatedBooks = candidates
      .map((book) => {
        const titleTokens = getSearchTokens(book.title);
        const titleOverlap = [...currentTitleTokens].filter((token) =>
          titleTokens.has(token)
        ).length;

        const score =
          (book.category === currentBook.category ? 5 : 0) +
          (book.author && book.author === currentBook.author ? 3 : 0) +
          (book.publisher && book.publisher === currentBook.publisher ? 2 : 0) +
          titleOverlap * 2;

        return { book, score };
      })
      .filter(({ score }) => score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          b.book.createdAt.getTime() - a.book.createdAt.getTime()
      )
      .slice(0, 4)
      .map(({ book }) => book);

    return res.status(200).json(relatedBooks);
  } catch (error) {
    return res.status(500).json({ message: 'حدث خطأ أثناء جلب المقترحات', error });
  }
};