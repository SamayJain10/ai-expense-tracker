import { Router, Request, Response } from "express";
import { parseExpense, ExpenseParseError } from "../services/expenseParser";
import { createExpense, getAllExpenses, deleteExpense } from "../database/db";

const router = Router();

const ok = <T>(res: Response, data: T, status = 200) =>
  res.status(status).json({ success: true, data });

const fail = (res: Response, error: string, status: number) =>
  res.status(status).json({ success: false, error });

interface AddExpenseBody {
  input?: unknown;
}

router.post("/", async (req: Request<{}, {}, AddExpenseBody>, res: Response) => {
  const { input } = req.body;

  if (typeof input !== "string" || !input.trim()) {
    return fail(res, 'Field "input" must be a non-empty string.', 400);
  }

  try {
    const trimmed = input.trim();
    const parsed = await parseExpense(trimmed);
    const expense = createExpense({ ...parsed, original_input: trimmed });

    return ok(res, expense, 201);
  } catch (err) {
    if (err instanceof ExpenseParseError) {
      return fail(res, err.message, 400);
    }

    console.error("[POST /api/expenses]", err);
    return fail(res, "Unexpected server error.", 500);
  }
});

router.get("/", (_req: Request, res: Response) => {
  try {
    const expenses = getAllExpenses();
    return ok(res, expenses);
  } catch (err) {
    console.error("[GET /api/expenses]", err);
    return fail(res, "Failed to retrieve expenses.", 500);
  }
});

router.delete("/:id", (req: Request<{ id: string }>, res: Response) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return fail(res, "Expense ID must be a positive integer.", 400);
  }

  try {
    const deleted = deleteExpense(id);

    if (!deleted) {
      return fail(res, `Expense with ID ${id} not found.`, 404);
    }

    return ok(res, { id, deleted: true });
  } catch (err) {
    console.error(`[DELETE /api/expenses/${id}]`, err);
    return fail(res, "Failed to delete expense.", 500);
  }
});

export default router;