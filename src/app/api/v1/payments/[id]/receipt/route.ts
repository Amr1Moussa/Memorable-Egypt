import { receiptUploadSchema } from "@/features/payments/schemas";
import { attachReceipt } from "@/features/payments/service";
import { uploadReceipt } from "@/features/storage/services";
import { ok, handle } from "@/lib/response";
import { ValidationError } from "@/lib/errors";

/**
 * POST /api/v1/payments/{id}/receipt
 * Upload a receipt for a payment (Phase 5 #4). Multipart form-data:
 *   - file: the receipt image/PDF
 *   - method: "instapay" | "bank_transfer"
 *
 * Validates ownership + state; stores the receipt privately (never public);
 * advances the payment to receipt_uploaded (→ pending_verification is admin
 * territory, but the state machine lets the receipt step complete here).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: paymentId } = await params;

    const form = await request.formData();
    const file = form.get("file");
    const method = form.get("method");
    if (!(file instanceof File)) {
      throw new ValidationError("Please select a receipt to upload.");
    }
    const parsed = receiptUploadSchema.safeParse({
      paymentId,
      method: typeof method === "string" ? method : "instapay",
    });
    if (!parsed.success) {
      throw new ValidationError(
        parsed.error.issues[0]?.message ?? "Invalid receipt request.",
      );
    }

    // Upload to the PRIVATE receipts bucket (Phase 5 #4, #7).
    const buffer = Buffer.from(await file.arrayBuffer());
    const stored = await uploadReceipt(paymentId, {
      name: file.name,
      type: file.type,
      size: file.size,
      buffer,
    });

    // Record the receipt + advance the payment state.
    const payment = await attachReceipt(paymentId, parsed.data.method, {
      storagePath: stored.path,
      fileName: file.name,
      mimeType: stored.mimeType,
      sizeBytes: stored.sizeBytes,
    });

    return ok({ payment }, "Receipt uploaded. We'll verify it within 12 hours.");
  } catch (error) {
    return handle(error);
  }
}
