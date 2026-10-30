import { Router } from "express";
import { getBooks, getBookById, getRelatedBooks } from "../controllers/book.controller";

const router = Router();


router.get("/", getBooks);


router.get("/:code", getBookById);

router.get('/:code/related', getRelatedBooks);

export default router;