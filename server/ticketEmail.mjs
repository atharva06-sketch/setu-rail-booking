function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inr(value) {
  return `₹${new Intl.NumberFormat("en-IN").format(Number(value) || 0)}`;
}

/**
 * Renders the confirmation email. It intentionally contains both the
 * e-ticket and the booking invoice so the email can be printed or saved.
 */
export function renderTicketEmail(ticket) {
  const {
    pnr,
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
  } = ticket;

  const passengerRows = passengers
    .map(
      (passenger, index) => `
        <tr>
          <td style="padding:8px 6px;border-top:1px solid #e2e8f0;">${index + 1}. ${escapeHtml(passenger.name)}</td>
          <td style="padding:8px 6px;border-top:1px solid #e2e8f0;">${escapeHtml(passenger.age)} / ${escapeHtml(passenger.gender)}</td>
          <td style="padding:8px 6px;border-top:1px solid #e2e8f0;font-family:monospace;">${escapeHtml(passenger.coach)}</td>
          <td style="padding:8px 6px;border-top:1px solid #e2e8f0;font-family:monospace;">${escapeHtml(passenger.seat)}</td>
          <td style="padding:8px 6px;border-top:1px solid #e2e8f0;color:#64748b;">${escapeHtml(passenger.berth)}</td>
        </tr>`
    )
    .join("");

  const fareRows = Array.isArray(fare.breakup)
    ? fare.breakup
        .map(
          (row) => `
          <tr>
            <td style="padding:3px 0;color:#64748b;">${escapeHtml(row.label)}</td>
            <td style="padding:3px 0;text-align:right;font-family:monospace;">${inr(row.amount)}</td>
          </tr>`
        )
        .join("")
    : `
      <tr>
        <td style="padding:3px 0;color:#64748b;">${escapeHtml(classLabel)} × ${passengers.length}</td>
        <td style="padding:3px 0;text-align:right;font-family:monospace;">${inr(fare.base)}</td>
      </tr>
      <tr>
        <td style="padding:3px 0;color:#64748b;">Convenience fee</td>
        <td style="padding:3px 0;text-align:right;font-family:monospace;">${inr(fare.fee)}</td>
      </tr>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#eef4fa;font-family:Arial,Helvetica,sans-serif;color:#1b2733;">
    <div style="max-width:640px;margin:0 auto;padding:24px 12px;">
      <div style="background:#0b3c6b;color:#ffffff;border-radius:10px 10px 0 0;padding:20px 24px;">
        <div style="font-size:11px;letter-spacing:1.4px;color:#bfd3e6;">RAIL BANDHU · ELECTRONIC RESERVATION SLIP</div>
        <div style="font-size:22px;font-weight:700;margin-top:6px;">Booking confirmed</div>
        <div style="font-size:13px;color:#cfe0ee;margin-top:4px;">${escapeHtml(train.name)} (#${escapeHtml(train.number)})</div>
      </div>

      <div style="background:#ffffff;padding:20px 24px;border:1px solid #d7e1ea;border-top:0;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td style="padding:4px 0;color:#64748b;">PNR</td>
            <td style="padding:4px 0;text-align:right;font-family:monospace;font-size:20px;font-weight:700;letter-spacing:2px;">${escapeHtml(pnr)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#64748b;">Class / quota</td>
            <td style="padding:4px 0;text-align:right;">${escapeHtml(classLabel)} (${escapeHtml(classCode)}) · ${escapeHtml(quotaLabel)}</td>
          </tr>
          <tr>
            <td style="padding:4px 0;color:#64748b;">Journey</td>
            <td style="padding:4px 0;text-align:right;">${escapeHtml(date)}</td>
          </tr>
        </table>

        <div style="margin:18px 0;padding:14px;background:#eaf1f8;border-radius:8px;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="width:38%;vertical-align:top;">
                <div style="font-family:monospace;font-size:22px;font-weight:700;">${escapeHtml(departure)}</div>
                <div style="font-size:13px;font-weight:700;">${escapeHtml(from.name)} (${escapeHtml(from.code)})</div>
                <div style="font-size:11px;color:#64748b;">Departure</div>
              </td>
              <td style="width:24%;text-align:center;vertical-align:middle;color:#64748b;font-size:11px;">
                ${escapeHtml(duration)}<br />${escapeHtml(distance)} km
              </td>
              <td style="width:38%;text-align:right;vertical-align:top;">
                <div style="font-family:monospace;font-size:22px;font-weight:700;">${escapeHtml(arrival)}${Number(dayOffset) > 0 ? ` <span style="font-size:11px;color:#d96e12;">+${Number(dayOffset)}d</span>` : ""}</div>
                <div style="font-size:13px;font-weight:700;">${escapeHtml(to.name)} (${escapeHtml(to.code)})</div>
                <div style="font-size:11px;color:#64748b;">Arrival</div>
              </td>
            </tr>
          </table>
        </div>

        <div style="font-size:11px;letter-spacing:1px;color:#64748b;margin-bottom:6px;">PASSENGERS &amp; SEATS</div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="text-align:left;color:#64748b;">
              <th style="padding:4px 6px;font-weight:500;">Passenger</th>
              <th style="padding:4px 6px;font-weight:500;">Age / Gender</th>
              <th style="padding:4px 6px;font-weight:500;">Coach</th>
              <th style="padding:4px 6px;font-weight:500;">Seat</th>
              <th style="padding:4px 6px;font-weight:500;">Berth</th>
            </tr>
          </thead>
          <tbody>${passengerRows}</tbody>
        </table>

        <div style="display:block;height:1px;background:#d7e1ea;margin:20px 0;"></div>

        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="width:52%;vertical-align:top;padding-right:16px;">
              <div style="font-size:11px;letter-spacing:1px;color:#64748b;margin-bottom:8px;">INVOICE</div>
              <table style="width:100%;border-collapse:collapse;font-size:12px;">
                ${fareRows}
                <tr>
                  <td style="padding:8px 0 0;border-top:1px solid #d7e1ea;font-weight:700;">Total paid</td>
                  <td style="padding:8px 0 0;border-top:1px solid #d7e1ea;text-align:right;font-family:monospace;font-weight:700;font-size:14px;">${inr(payment.amount ?? fare.total)}</td>
                </tr>
              </table>
            </td>
            <td style="width:48%;vertical-align:top;">
              <div style="font-size:11px;letter-spacing:1px;color:#64748b;margin-bottom:8px;">PAYMENT</div>
              <div style="font-size:12px;line-height:1.7;">
                <div><span style="color:#64748b;">Method:</span> ${escapeHtml(payment.methodLabel)} · ${escapeHtml(payment.detail)}</div>
                <div><span style="color:#64748b;">Transaction:</span> <span style="font-family:monospace;">${escapeHtml(payment.txnId)}</span></div>
                <div><span style="color:#64748b;">Auth code:</span> <span style="font-family:monospace;">${escapeHtml(payment.authCode)}</span></div>
                <div><span style="color:#64748b;">Paid at:</span> ${escapeHtml(payment.paidAt)}</div>
              </div>
            </td>
          </tr>
        </table>

        <div style="margin-top:20px;padding:12px;border:1px dashed #d7e1ea;border-radius:6px;font-size:11px;color:#64748b;line-height:1.6;">
          <strong style="color:#1b2733;">Demo ticket.</strong> This is a college project and is not a valid Indian Railways
          ticket. Train data is real; fares, seats and payment are simulated unless live IRCTC data is enabled.
          Contact: ${escapeHtml(contact.email || "")} ${contact.phone ? `· ${escapeHtml(contact.phone)}` : ""}
        </div>
      </div>

      <div style="text-align:center;font-size:10px;color:#8a99a8;padding:14px;">
        Rail Bandhu · Train data by RailRadar · Generated ${escapeHtml(payment.paidAt || new Date().toLocaleString("en-IN"))}
      </div>
    </div>
  </body>
</html>`;

  const text = [
    `RAIL BANDHU — BOOKING CONFIRMED`,
    `PNR: ${pnr}`,
    `${train.name} (#${train.number})`,
    `${classLabel} (${classCode}) · ${quotaLabel}`,
    `${from.name} (${from.code}) ${departure} → ${to.name} (${to.code}) ${arrival}${Number(dayOffset) > 0 ? ` (+${dayOffset}d)` : ""}`,
    `Date: ${date} · ${duration} · ${distance} km`,
    ``,
    `PASSENGERS`,
    ...passengers.map(
      (passenger, index) =>
        `${index + 1}. ${passenger.name} (${passenger.age}/${passenger.gender}) · Coach ${passenger.coach} · Seat ${passenger.seat} · ${passenger.berth}`
    ),
    ``,
    `INVOICE`,
    ...(Array.isArray(fare.breakup)
      ? fare.breakup.map((row) => `${row.label}: ${inr(row.amount)}`)
      : [`${classLabel} × ${passengers.length}: ${inr(fare.base)}`, `Convenience fee: ${inr(fare.fee)}`]),
    `Total paid: ${inr(payment.amount ?? fare.total)}`,
    ``,
    `PAYMENT`,
    `${payment.methodLabel} · ${payment.detail}`,
    `Transaction: ${payment.txnId}`,
    `Auth code: ${payment.authCode}`,
    `Paid at: ${payment.paidAt}`,
    ``,
    `This is a college project demo ticket and is not valid for travel.`,
  ].join("\n");

  return {
    subject: `Rail Bandhu ticket confirmed · PNR ${pnr} · ${train.name}`,
    html,
    text,
  };
}
