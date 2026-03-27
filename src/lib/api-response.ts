import { NextResponse } from "next/server";
import { getErrorDetails } from "@/lib/errors";

export function toApiErrorResponse(error: unknown, fallbackMessage: string) {
  const details = getErrorDetails(error, fallbackMessage);
  return NextResponse.json(
    {
      error: details.message,
      code: details.code
    },
    {
      status: details.status
    }
  );
}
