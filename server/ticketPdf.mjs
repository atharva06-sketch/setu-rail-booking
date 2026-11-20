import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/* ------------------------------------------------------------------
   Ticket + invoice PDF
   Generates a printable two-page PDF on the server/Worker. Keeping the
   layout here means the browser downloads a real document instead of an
   HTML file that has to be printed manually.
------------------------------------------------------------------- */

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

const NAVY = rgb(0.043, 0.235, 0.42);
const BLUE_LIGHT = rgb(0.918, 0.945, 0.973);
const TEXT = rgb(0.106, 0.153, 0.2);
const MUTED = rgb(0.392, 0.455, 0.525);
const LINE = rgb(0.843, 0.882, 0.918);
const ORANGE = rgb(0.851, 0.431, 0.071);
const GREEN = rgb(0.13, 0.55, 0.3);
const WHITE = rgb(1, 1, 1);

function clean(value) {
  return String(value ?? "")
    .replace(/₹/g, "Rs. ")
    .replace(/[—–]/g, "-")
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/·/g, "-")
    .replace(/→/g, "->")
    .replace(/×/g, "x")
    .replace(/[^\x20-\x7E]/g, "");
}

function money(value) {
  const amount = Number(value) || 0;
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function wrap(text, font, size, maxWidth) {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function fit(text, font, size, maxWidth) {
  let value = clean(text);
  let current = size;
  while (current > 7 && font.widthOfTextAtSize(value, current) > maxWidth) {
    current -= 0.5;
  }
  if (font.widthOfTextAtSize(value, current) > maxWidth) {
    while (value.length > 3 && font.widthOfTextAtSize(`${value}...`, current) > maxWidth) {
      value = value.slice(0, -1);
    }
    value = `${value}...`;
  }
  return { text: value, size: current };
}

function drawText(page, text, { x, y, size = 10, font, color = TEXT, maxWidth } = {}) {
  const value = clean(text);
  if (!value) return size;
  if (maxWidth) {
    const fitted = fit(value, font, size, maxWidth);
    page.drawText(fitted.text, { x, y, size: fitted.size, font, color });
    return fitted.size;
  }
  page.drawText(value, { x, y, size, font, color });
  return size;
}

function drawWrapped(page, text, { x, y, size = 10, font, color = TEXT, maxWidth, lineHeight = 13 }) {
  const lines = wrap(text, font, size, maxWidth);
  if (lines.length === 0) return y;
  lines.forEach((line, index) => {
    page.drawText(line, { x, y: y - index * lineHeight, size, font, color });
  });
  return y - lines.length * lineHeight;
}

function rule(page, y, x = MARGIN, width = CONTENT_W) {
  page.drawLine({ start: { x, y }, end: { x: x + width, y }, thickness: 0.7, color: LINE });
}

function label(page, text, { x, y, font, color = MUTED, size = 8 }) {
  page.drawText(clean(text).toUpperCase(), { x, y, size, font, color });
}

function pageFooter(page, font, pageNumber) {
  page.drawText(`Rail Bandhu - Train data by RailRadar - Page ${pageNumber} of 2`, {
    x: MARGIN,
    y: 22,
    size: 7,
    font,
    color: MUTED,
  });
}

export async function renderTicketPdf(ticket) {
  const {
    pnr = "",
    train = {},
    classLabel = "",
    classCode = "",
    quotaLabel = "General",
    from = {},
    to = {},
    date = "",
    departure = "",
    arrival = "",
    dayOffset = 0,
    duration = "",
    distance = "",
    passengers = [],
    fare = {},
    payment = {},
    contact = {},
  } = ticket || {};

  const pdf = await PDFDocument.create();
  pdf.setTitle(`Rail Bandhu ticket ${pnr}`);
  pdf.setAuthor("Rail Bandhu");
  pdf.setSubject(`${train.name || "Train"} - ${from.name || ""} to ${to.name || ""}`);

  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);
  const monoBold = await pdf.embedFont(StandardFonts.CourierBold);

  /* ------------------------------ page 1: e-ticket ------------------------------ */
  const page = pdf.addPage([PAGE_W, PAGE_H]);

  page.drawRectangle({ x: 0, y: PAGE_H - 112, width: PAGE_W, height: 112, color: NAVY });
  page.drawText("RAIL BANDHU  -  ELECTRONIC RESERVATION SLIP", {
    x: MARGIN,
    y: PAGE_H - 38,
    size: 8,
    font: bold,
    color: rgb(0.749, 0.827, 0.902),
  });
  page.drawText("Booking confirmed", {
    x: MARGIN,
    y: PAGE_H - 64,
    size: 20,
    font: bold,
    color: WHITE,
  });
  const trainLine = `${train.name || "Train"} (#${train.number || "-"})`;
  drawText(page, trainLine, {
    x: MARGIN,
    y: PAGE_H - 84,
    size: 11,
    font: regular,
    color: rgb(0.812, 0.878, 0.933),
    maxWidth: 330,
  });

  label(page, "PNR", { x: PAGE_W - MARGIN - 150, y: PAGE_H - 44, font: bold, color: rgb(0.749, 0.827, 0.902), size: 7 });
  drawText(page, pnr, {
    x: PAGE_W - MARGIN - 150,
    y: PAGE_H - 66,
    size: 20,
    font: monoBold,
    color: WHITE,
    maxWidth: 150,
  });
  drawText(page, `Booked ${payment.paidAt || "-"}`, {
    x: PAGE_W - MARGIN - 150,
    y: PAGE_H - 84,
    size: 7,
    font: regular,
    color: rgb(0.812, 0.878, 0.933),
    maxWidth: 150,
  });

  let y = PAGE_H - 140;

  page.drawRectangle({
    x: MARGIN,
    y: y - 96,
    width: CONTENT_W,
    height: 96,
    color: BLUE_LIGHT,
  });

  drawText(page, departure, { x: MARGIN + 14, y: y - 30, size: 21, font: monoBold, color: TEXT });
  drawText(page, `${from.name || ""} (${from.code || ""})`, {
    x: MARGIN + 14,
    y: y - 48,
    size: 10,
    font: bold,
    color: TEXT,
    maxWidth: 170,
  });
  drawText(page, "Departure", { x: MARGIN + 14, y: y - 62, size: 8, font: regular, color: MUTED });

  drawText(page, duration, { x: PAGE_W / 2 - 55, y: y - 38, size: 9, font: regular, color: MUTED });
  drawText(page, `${distance || "-"} km`, { x: PAGE_W / 2 - 55, y: y - 51, size: 8, font: regular, color: MUTED });
  page.drawLine({
    start: { x: PAGE_W / 2 - 60, y: y - 58 },
    end: { x: PAGE_W / 2 + 60, y: y - 58 },
    thickness: 0.7,
    color: LINE,
    dashArray: [3, 3],
  });

  const arrivalText = `${arrival}${Number(dayOffset) > 0 ? ` +${Number(dayOffset)}d` : ""}`;
  drawText(page, arrivalText, {
    x: PAGE_W - MARGIN - 184,
    y: y - 30,
    size: 21,
    font: monoBold,
    color: TEXT,
    maxWidth: 170,
  });
  drawText(page, `${to.name || ""} (${to.code || ""})`, {
    x: PAGE_W - MARGIN - 184,
    y: y - 48,
    size: 10,
    font: bold,
    color: TEXT,
    maxWidth: 170,
  });
  drawText(page, "Arrival", {
    x: PAGE_W - MARGIN - 184,
    y: y - 62,
    size: 8,
    font: regular,
    color: MUTED,
  });

  y -= 118;

  const metaRows = [
    ["Class / quota", `${classLabel} (${classCode}) - ${quotaLabel}`],
    ["Journey date", date],
    ["Passengers", `${passengers.length} passenger${passengers.length === 1 ? "" : "s"}`],
    ["Contact", [contact.email, contact.phone].filter(Boolean).join(" - ") || "-"],
  ];
  for (const [key, value] of metaRows) {
    drawText(page, key, { x: MARGIN, y, size: 8, font: regular, color: MUTED });
    drawText(page, value, { x: MARGIN + 100, y, size: 9, font: regular, color: TEXT, maxWidth: CONTENT_W - 100 });
    y -= 16;
  }

  y -= 8;
  label(page, "Passengers & seats", { x: MARGIN, y, font: bold, color: MUTED, size: 8 });
  y -= 18;

  const columns = [
    { key: "name", title: "Passenger", width: 150 },
    { key: "ageGender", title: "Age / gender", width: 78 },
    { key: "coach", title: "Coach", width: 55 },
    { key: "seat", title: "Seat", width: 50 },
    { key: "berth", title: "Berth", width: 95 },
  ];
  let x = MARGIN;
  for (const column of columns) {
    drawText(page, column.title, { x, y, size: 8, font: bold, color: MUTED, maxWidth: column.width - 4 });
    x += column.width;
  }
  y -= 6;
  rule(page, y);
  y -= 14;

  passengers.forEach((passenger, index) => {
    const values = {
      name: `${index + 1}. ${passenger.name || "-"}`,
      ageGender: `${passenger.age || "-"} / ${passenger.gender || "-"}`,
      coach: passenger.coach || "-",
      seat: passenger.seat || "-",
      berth: passenger.berth || "-",
    };
    x = MARGIN;
    for (const column of columns) {
      drawText(page, values[column.key], {
        x,
        y,
        size: 9,
        font: column.key === "name" ? regular : column.key === "berth" ? regular : mono,
        color: column.key === "berth" ? MUTED : TEXT,
        maxWidth: column.width - 6,
      });
      x += column.width;
    }
    y -= 15;
    rule(page, y + 4);
    y -= 2;
  });

  y -= 10;
  page.drawRectangle({
    x: MARGIN,
    y: y - 54,
    width: CONTENT_W,
    height: 54,
    borderColor: LINE,
    borderWidth: 0.7,
    color: WHITE,
  });
  drawWrapped(
    page,
    "Demo ticket. This is a college project and is not a valid Indian Railways ticket. Train and coach data are real; fares, seats and payment are simulated unless live IRCTC data is enabled.",
    {
      x: MARGIN + 10,
      y: y - 16,
      size: 7.5,
      font: regular,
      color: MUTED,
      maxWidth: CONTENT_W - 20,
      lineHeight: 10,
    }
  );

  pageFooter(page, regular, 1);

  /* ------------------------------ page 2: invoice ------------------------------ */
  const invoice = pdf.addPage([PAGE_W, PAGE_H]);
  invoice.drawRectangle({ x: 0, y: PAGE_H - 96, width: PAGE_W, height: 96, color: NAVY });
  invoice.drawText("RAIL BANDHU  -  BOOKING INVOICE", {
    x: MARGIN,
    y: PAGE_H - 38,
    size: 8,
    font: bold,
    color: rgb(0.749, 0.827, 0.902),
  });
  invoice.drawText("Tax invoice / payment receipt", {
    x: MARGIN,
    y: PAGE_H - 64,
    size: 18,
    font: bold,
    color: WHITE,
  });
  drawText(invoice, `PNR ${pnr}`, {
    x: PAGE_W - MARGIN - 150,
    y: PAGE_H - 64,
    size: 13,
    font: monoBold,
    color: WHITE,
    maxWidth: 150,
  });

  let iy = PAGE_H - 124;
  const invoiceMeta = [
    ["Invoice number", `RB-${pnr}`],
    ["Invoice date", payment.paidAt || date || "-"],
    ["Billed to", [contact.email, contact.phone].filter(Boolean).join(" - ") || "-"],
    ["Journey", `${from.name || ""} (${from.code || ""}) to ${to.name || ""} (${to.code || ""})`],
  ];
  for (const [key, value] of invoiceMeta) {
    drawText(invoice, key, { x: MARGIN, y: iy, size: 8, font: regular, color: MUTED });
    drawText(invoice, value, { x: MARGIN + 110, y: iy, size: 9, font: regular, color: TEXT, maxWidth: CONTENT_W - 110 });
    iy -= 16;
  }

  iy -= 10;
  label(invoice, "Fare breakdown", { x: MARGIN, y: iy, font: bold, color: MUTED, size: 8 });
  iy -= 20;

  const fareRows = Array.isArray(fare.breakup) && fare.breakup.length > 0
    ? fare.breakup.map((row) => ({
        label: `${row.label || "Fare"} x ${passengers.length}`,
        amount: Number(row.amount) || 0,
      }))
    : [
        { label: `${classLabel} x ${passengers.length}`, amount: Number(fare.base) || 0 },
        { label: "Convenience fee", amount: Number(fare.fee) || 0 },
      ];

  drawText(invoice, "Description", { x: MARGIN, y: iy, size: 8, font: bold, color: MUTED });
  drawText(invoice, "Amount", { x: PAGE_W - MARGIN - 90, y: iy, size: 8, font: bold, color: MUTED });
  iy -= 6;
  rule(invoice, iy);
  iy -= 16;

  let invoiceTotal = 0;
  for (const row of fareRows) {
    invoiceTotal += row.amount;
    drawText(invoice, row.label, { x: MARGIN, y: iy, size: 9, font: regular, color: TEXT, maxWidth: CONTENT_W - 120 });
    drawText(invoice, money(row.amount), {
      x: PAGE_W - MARGIN - 90,
      y: iy,
      size: 9,
      font: mono,
      color: TEXT,
      maxWidth: 90,
    });
    iy -= 16;
    rule(invoice, iy + 4);
    iy -= 2;
  }

  const total = Number(payment.amount ?? fare.total ?? invoiceTotal) || invoiceTotal;
  iy -= 4;
  drawText(invoice, "Total paid", { x: MARGIN, y: iy, size: 11, font: bold, color: TEXT });
  drawText(invoice, money(total), {
    x: PAGE_W - MARGIN - 110,
    y: iy,
    size: 12,
    font: monoBold,
    color: TEXT,
    maxWidth: 110,
  });
  iy -= 26;

  label(invoice, "Payment details", { x: MARGIN, y: iy, font: bold, color: MUTED, size: 8 });
  iy -= 18;
  const paymentRows = [
    ["Method", [payment.methodLabel, payment.detail].filter(Boolean).join(" - ") || "-"],
    ["Transaction", payment.txnId || "-"],
    ["Auth code", payment.authCode || "-"],
    ["Paid at", payment.paidAt || "-"],
  ];
  for (const [key, value] of paymentRows) {
    drawText(invoice, key, { x: MARGIN, y: iy, size: 8, font: regular, color: MUTED });
    drawText(invoice, value, { x: MARGIN + 100, y: iy, size: 9, font: regular, color: TEXT, maxWidth: CONTENT_W - 100 });
    iy -= 16;
  }

  iy -= 8;
  drawText(invoice, "Payment status: PAID", { x: MARGIN, y: iy, size: 10, font: bold, color: GREEN });

  iy -= 28;
  invoice.drawRectangle({
    x: MARGIN,
    y: iy - 56,
    width: CONTENT_W,
    height: 56,
    borderColor: LINE,
    borderWidth: 0.7,
    color: WHITE,
  });
  drawWrapped(
    invoice,
    "This invoice is part of a college project demo. It is not a GST invoice and is not valid for travel or reimbursement. Train and coach data are real; fares, seats and payment are simulated unless live IRCTC data is enabled.",
    {
      x: MARGIN + 10,
      y: iy - 16,
      size: 7.5,
      font: regular,
      color: MUTED,
      maxWidth: CONTENT_W - 20,
      lineHeight: 10,
    }
  );

  pageFooter(invoice, regular, 2);

  return pdf.save();
}
