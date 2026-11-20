import type { FareBreakupRow } from "./booking";

/* ------------------------------------------------------------------
   Client for the local backend (/api/send-ticket).

   The backend can deliver through SMTP, EmailJS, or (with no
   credentials) an Ethereal test inbox that returns a preview URL.
   Nothing sensitive is ever shipped to the browser.
------------------------------------------------------------------- */

export interface TicketEmailPassenger {
  name: string;
  age: number | string;
  gender: string;
  coach: string;
  seat: number | string;
  berth: string;
}

export interface TicketEmailPayload {
  pnr: string;
  train: { name: string; number: string };
  classLabel: string;
  classCode: string;
  quotaLabel: string;
  from: { name: string; code: string };
  to: { name: string; code: string };
  date: string;
  departure: string;
  arrival: string;
  dayOffset: number;
  duration: string;
  distance: string;
  passengers: TicketEmailPassenger[];
  fare: {
    base: number;
    fee: number;
    total: number;
    breakup?: FareBreakupRow[];
  };
  payment: {
    methodLabel: string;
    detail: string;
    txnId: string;
    authCode: string;
    paidAt: string;
    amount: number;
  };
  contact: { email: string; phone: string };
}

export interface EmailSendResult {
  success: boolean;
  mode: "smtp" | "emailjs" | "ethereal" | "preview" | string;
  message: string;
  previewUrl?: string | null;
  messageId?: string;
}

export class EmailError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "EMAIL_ERROR", status = 0) {
    super(message);
    this.name = "EmailError";
    this.code = code;
    this.status = status;
  }
}

export async function sendTicketEmail(
  to: string,
  ticket: TicketEmailPayload
): Promise<EmailSendResult> {
  let response: Response;
  try {
    response = await fetch("/api/send-ticket", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ to, ticket }),
    });
  } catch {
    throw new EmailError(
      "The local booking API is offline. Start it with `npm run dev:api` (or `npm run dev:all`), then retry.",
      "BACKEND_OFFLINE",
      0
    );
  }

  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new EmailError("The booking API returned an unexpected response.", "BAD_RESPONSE", response.status);
  }

  if (!response.ok || body?.success === false) {
    throw new EmailError(
      body?.message || `The ticket email could not be sent (HTTP ${response.status}).`,
      body?.code || `HTTP_${response.status}`,
      response.status
    );
  }

  return body as EmailSendResult;
}

/** Plain-text fallback used by the "open email draft" link. */
export function buildTicketEmailText(ticket: TicketEmailPayload): string {
  const inr = (value: number) => `Rs ${new Intl.NumberFormat("en-IN").format(value)}`;
  const lines = [
    "RAIL BANDHU - BOOKING CONFIRMED",
    `PNR: ${ticket.pnr}`,
    `${ticket.train.name} (#${ticket.train.number})`,
    `${ticket.classLabel} (${ticket.classCode}) - ${ticket.quotaLabel}`,
    `${ticket.from.name} (${ticket.from.code}) ${ticket.departure} -> ${ticket.to.name} (${ticket.to.code}) ${ticket.arrival}${ticket.dayOffset > 0 ? ` (+${ticket.dayOffset}d)` : ""}`,
    `Date: ${ticket.date} - ${ticket.duration} - ${ticket.distance} km`,
    "",
    "PASSENGERS",
    ...ticket.passengers.map(
      (passenger, index) =>
        `${index + 1}. ${passenger.name} (${passenger.age}/${passenger.gender}) - Coach ${passenger.coach} - Seat ${passenger.seat} - ${passenger.berth}`
    ),
    "",
    "INVOICE",
    ...(ticket.fare.breakup && ticket.fare.breakup.length > 0
      ? ticket.fare.breakup.map((row) => `${row.label}: ${inr(row.amount)}`)
      : [`${ticket.classLabel} x ${ticket.passengers.length}: ${inr(ticket.fare.base)}`]),
    `Convenience fee: ${inr(ticket.fare.fee)}`,
    `Total paid: ${inr(ticket.payment.amount || ticket.fare.total)}`,
    "",
    "PAYMENT",
    `${ticket.payment.methodLabel} - ${ticket.payment.detail}`,
    `Transaction: ${ticket.payment.txnId}`,
    `Auth code: ${ticket.payment.authCode}`,
    `Paid at: ${ticket.payment.paidAt}`,
    "",
    "This is a college project demo ticket and is not valid for travel.",
  ];
  return lines.join("\n");
}

/** mailto: fallback if the backend cannot deliver email. */
export function mailtoTicketLink(ticket: TicketEmailPayload): string {
  const subject = `Rail Bandhu ticket ${ticket.pnr} - ${ticket.train.name}`;
  const body = buildTicketEmailText(ticket);
  return `mailto:${encodeURIComponent(ticket.contact.email)}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}

/**
 * Downloads the ticket + invoice as a single HTML file. It opens in any
 * browser and prints cleanly to PDF, so the booking documents are always
 * available even when no email credentials are configured.
 */
export async function downloadTicketDocument(ticket: TicketEmailPayload): Promise<void> {
  let response: Response;
  try {
    response = await fetch("/api/ticket-document", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ticket }),
    });
  } catch {
    throw new EmailError(
      "The local booking API is offline, so the ticket file could not be created.",
      "BACKEND_OFFLINE"
    );
  }

  if (!response.ok) {
    throw new EmailError(
      `The ticket file could not be created (HTTP ${response.status}).`,
      `HTTP_${response.status}`,
      response.status
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `RailBandhu-Ticket-${ticket.pnr}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
