import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  BadgeCheck,
  Building2,
  Check,
  ChevronLeft,
  CreditCard,
  Landmark,
  Lock,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Timer,
  Wallet,
} from "lucide-react";
import {
  makeAuthCode,
  makeBookingTime,
  makeTransactionId,
  maskCardNumber,
  maskPhone,
  type PaymentReceipt,
} from "@/lib/booking";
import { AMBER, BLUE_DARK, BLUE_LIGHT, FONT_BODY, FONT_MONO, GREEN, LINE, MUTED, ORANGE, RED, TEXT } from "@/theme";

type Method = "upi" | "card" | "netbanking" | "wallet";
type Stage = "form" | "otp" | "processing";

const METHODS: Array<{ id: Method; label: string; icon: typeof Smartphone }> = [
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "card", label: "Card", icon: CreditCard },
  { id: "netbanking", label: "Net Banking", icon: Landmark },
  { id: "wallet", label: "Wallet", icon: Wallet },
];

const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Punjab National Bank",
  "Kotak Mahindra Bank",
  "Bank of Baroda",
  "Canara Bank",
];

const WALLETS = ["PhonePe", "Paytm", "Amazon Pay", "Mobikwik"];

const UPI_APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM"];

function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

function formatCardNumber(value: string) {
  return digitsOnly(value).slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiry(value: string) {
  const digits = digitsOnly(value).slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function cardBrand(digits: string) {
  if (/^4/.test(digits)) return "VISA";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "MASTERCARD";
  if (/^3[47]/.test(digits)) return "AMEX";
  if (/^(60|65|81|82|508)/.test(digits)) return "RUPAY";
  return "CARD";
}

function luhnCheck(digits: string) {
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number(digits[index]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return digits.length > 0 && sum % 10 === 0;
}

function expiryIsValid(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const now = new Date();
  return new Date(year, month, 1) > now;
}

function upiIsValid(value: string) {
  return /^[a-zA-Z0-9.\-_]{2,}@[a-zA-Z]{2,}$/.test(value.trim());
}

function vpaName(vpa: string) {
  const prefix = vpa.split("@")[0] ?? "Customer";
  return prefix
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function formatClock(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

interface PaymentGatewayProps {
  amount: number;
  baseFare: number;
  fee: number;
  passengerCount: number;
  contact: { email: string; phone: string };
  onSuccess: (receipt: PaymentReceipt) => void;
  onBack: () => void;
}

export default function PaymentGateway({
  amount,
  baseFare,
  fee,
  passengerCount,
  contact,
  onSuccess,
  onBack,
}: PaymentGatewayProps) {
  const [method, setMethod] = useState<Method>("upi");
  const [stage, setStage] = useState<Stage>("form");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [upiId, setUpiId] = useState("");
  const [upiVerified, setUpiVerified] = useState(false);
  const [verifyingUpi, setVerifyingUpi] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [bank, setBank] = useState("");
  const [wallet, setWallet] = useState("");

  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [otpError, setOtpError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(30);
  const [otpNonce, setOtpNonce] = useState(0);

  const [processingStep, setProcessingStep] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(600);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const completedRef = useRef(false);

  const cardDigits = digitsOnly(cardNumber);
  const brand = cardBrand(cardDigits);

  const maskedContact = useMemo(() => {
    const phone = contact.phone ? maskPhone(contact.phone) : "your phone";
    const email = contact.email || "your email";
    return `${phone} and ${email}`;
  }, [contact.email, contact.phone]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (stage !== "otp") return;
    setResendIn(30);
    const timer = setInterval(() => {
      setResendIn((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [stage, otpNonce]);

  useEffect(() => {
    if (stage !== "otp") return;
    const timer = setTimeout(() => otpRefs.current[0]?.focus(), 60);
    return () => clearTimeout(timer);
  }, [stage]);

  useEffect(() => {
    if (stage !== "processing") return;
    completedRef.current = false;
    setProcessingStep(0);

    const timers = [
      setTimeout(() => setProcessingStep(1), 650),
      setTimeout(() => setProcessingStep(2), 1400),
      setTimeout(() => setProcessingStep(3), 2150),
      setTimeout(() => {
        if (completedRef.current) return;
        completedRef.current = true;
        onSuccess(buildReceipt());
      }, 2850),
    ];

    return () => timers.forEach((timer) => clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  function resetUpiVerification(value: string) {
    setUpiId(value);
    setUpiVerified(false);
    setErrors((previous) => ({ ...previous, upi: "" }));
  }

  function verifyUpi() {
    if (!upiIsValid(upiId)) {
      setErrors((previous) => ({ ...previous, upi: "Enter a valid UPI ID like name@bank." }));
      setUpiVerified(false);
      return;
    }
    setVerifyingUpi(true);
    setErrors((previous) => ({ ...previous, upi: "" }));
    setTimeout(() => {
      setVerifyingUpi(false);
      setUpiVerified(true);
    }, 700);
  }

  function validate(): Record<string, string> {
    const next: Record<string, string> = {};

    if (method === "upi") {
      if (!upiIsValid(upiId)) next.upi = "Enter a valid UPI ID like name@bank.";
    }

    if (method === "card") {
      if (cardDigits.length < 15 || !luhnCheck(cardDigits)) {
        next.cardNumber = "Enter a valid card number (try 4111 1111 1111 1111).";
      }
      if (!cardName.trim()) next.cardName = "Enter the name printed on the card.";
      if (!expiryIsValid(expiry)) next.expiry = "Use a valid future expiry, e.g. 12/30.";
      if (!/^\d{3,4}$/.test(cvv)) next.cvv = "Enter the 3-digit CVV.";
    }

    if (method === "netbanking" && !bank) next.bank = "Choose your bank.";
    if (method === "wallet" && !wallet) next.wallet = "Choose a wallet.";

    return next;
  }

  function handlePay() {
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    if (method === "upi" && !upiVerified) setUpiVerified(true);
    setOtp(Array(6).fill(""));
    setOtpError(null);
    setStage("otp");
  }

  function handleOtpChange(index: number, rawValue: string) {
    const digits = digitsOnly(rawValue);

    if (digits.length > 1) {
      const next = Array(6).fill("");
      digits
        .slice(0, 6)
        .split("")
        .forEach((digit, offset) => {
          next[index + offset] = digit;
        });
      setOtp(next);
      setOtpError(null);
      const focusIndex = Math.min(5, index + digits.length);
      otpRefs.current[focusIndex]?.focus();
      return;
    }

    const next = [...otp];
    next[index] = digits;
    setOtp(next);
    setOtpError(null);
    if (digits && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function verifyOtp() {
    const code = otp.join("");
    if (code.length !== 6) {
      setOtpError("Enter all six digits of the OTP.");
      return;
    }
    if (code !== "123456") {
      setOtpError("Incorrect OTP. This sandbox gateway accepts 123456.");
      return;
    }
    setOtpError(null);
    setStage("processing");
  }

  function buildReceipt(): PaymentReceipt {
    let methodLabel = "UPI";
    let detail = upiId || "UPI";

    if (method === "card") {
      methodLabel = "Card";
      detail = `${brand} ${maskCardNumber(cardDigits)}`;
    } else if (method === "netbanking") {
      methodLabel = "Net Banking";
      detail = bank;
    } else if (method === "wallet") {
      methodLabel = "Wallet";
      detail = wallet;
    }

    return {
      method,
      methodLabel,
      detail,
      txnId: makeTransactionId(),
      authCode: makeAuthCode(),
      paidAt: makeBookingTime(),
      amount,
    };
  }

  const payButton = (
    <button
      type="button"
      className="btn-primary flex items-center justify-center gap-2"
      style={{ padding: "13px 20px", fontSize: 15, width: "100%", marginTop: 16 }}
      onClick={handlePay}
    >
      <Lock size={15} />
      Pay {`₹${new Intl.NumberFormat("en-IN").format(amount)}`} securely
    </button>
  );

  return (
    <div style={{ maxWidth: 560, margin: "0 auto" }}>
      <button
        type="button"
        onClick={onBack}
        className="btn-ghost flex items-center gap-1 no-print"
        style={{ padding: "6px 10px", fontSize: 13, border: "none", marginBottom: 14 }}
      >
        <ChevronLeft size={16} /> Back to passenger details
      </button>

      <div className="card" style={{ overflow: "hidden" }}>
        {/* Gateway header */}
        <div style={{ background: BLUE_DARK, color: "#fff", padding: "14px 18px" }}>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  background: ORANGE,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Lock size={16} color="#fff" />
              </span>
              <div>
                <div style={{ fontFamily: FONT_MONO, fontWeight: 700, fontSize: 15, letterSpacing: 0.4 }}>
                  SetuPay
                </div>
                <div style={{ fontSize: 10, color: "#BFD3E6" }}>Secure Checkout</div>
              </div>
              <span
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  color: "#0B3C6B",
                  background: "#FFD8A8",
                  borderRadius: 3,
                  padding: "2px 5px",
                  letterSpacing: 0.5,
                }}
              >
                SANDBOX
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700 }}>
                ₹{new Intl.NumberFormat("en-IN").format(amount)}
              </div>
              <div className="flex items-center gap-1" style={{ fontSize: 10, color: "#BFD3E6", justifyContent: "flex-end" }}>
                <Timer size={10} /> Session {formatClock(secondsLeft)}
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "#F7FAFC", borderBottom: `1px solid ${LINE}`, padding: "8px 18px", fontSize: 11, color: MUTED }}>
          Paying for <strong style={{ color: TEXT }}>{passengerCount}</strong> passenger
          {passengerCount === 1 ? "" : "s"} · Fare ₹{new Intl.NumberFormat("en-IN").format(baseFare)} + fee ₹
          {new Intl.NumberFormat("en-IN").format(fee)}
        </div>

        <div style={{ padding: 18 }}>
          {stage === "form" && (
            <div style={{ animation: "riseIn .25s ease" }} className="anim">
              <div className="flex items-center justify-between gap-2" style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: MUTED, fontFamily: FONT_MONO }}>
                  CHOOSE PAYMENT METHOD
                </div>
                <div className="flex items-center gap-1" style={{ fontSize: 10, color: GREEN }}>
                  <ShieldCheck size={12} /> 256-bit SSL
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2" style={{ marginBottom: 18 }}>
                {METHODS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    className={`method-tab${method === id ? " active" : ""}`}
                    onClick={() => {
                      setMethod(id);
                      setErrors({});
                    }}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>

              {method === "upi" && (
                <div>
                  <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>
                    UPI ID (VPA)
                  </label>
                  <div className="flex gap-2">
                    <input
                      className="gateway-input"
                      value={upiId}
                      onChange={(event) => resetUpiVerification(event.target.value)}
                      placeholder="yourname@bank"
                      autoComplete="off"
                      spellCheck={false}
                      style={{ borderColor: errors.upi ? RED : upiVerified ? GREEN : undefined }}
                    />
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "0 14px", fontSize: 12, whiteSpace: "nowrap" }}
                      onClick={verifyUpi}
                      disabled={verifyingUpi}
                    >
                      {verifyingUpi ? "Checking…" : upiVerified ? "Verified" : "Verify"}
                    </button>
                  </div>
                  {errors.upi && <div style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.upi}</div>}
                  {upiVerified && (
                    <div className="flex items-center gap-1" style={{ color: GREEN, fontSize: 11, marginTop: 5 }}>
                      <BadgeCheck size={13} /> Verified · {vpaName(upiId)}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
                    {UPI_APPS.map((app) => (
                      <button
                        key={app}
                        type="button"
                        className="pill"
                        style={{ padding: "6px 10px", fontSize: 11 }}
                        onClick={() => {
                          const id = `${app.toLowerCase().replace(/\s/g, "")}.demo@okhdfcbank`;
                          setUpiId(id);
                          setUpiVerified(true);
                          setErrors((previous) => ({ ...previous, upi: "" }));
                        }}
                      >
                        {app}
                      </button>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: "#8A99A8", marginTop: 10 }}>
                    A collect request will appear in your UPI app. Approve it to complete the payment.
                  </div>
                </div>
              )}

              {method === "card" && (
                <div>
                  <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>
                    Card number
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      className="gateway-input"
                      value={cardNumber}
                      onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
                      placeholder="1234 5678 9012 3456"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      style={{ paddingRight: 84, borderColor: errors.cardNumber ? RED : undefined }}
                    />
                    <span
                      className="pay-badge"
                      style={{ position: "absolute", right: 8, top: 11, background: "#fff" }}
                    >
                      {brand}
                    </span>
                  </div>
                  {errors.cardNumber && <div style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.cardNumber}</div>}

                  <label style={{ fontSize: 12, color: MUTED, display: "block", margin: "12px 0 5px" }}>
                    Name on card
                  </label>
                  <input
                    className="gateway-input"
                    value={cardName}
                    onChange={(event) => setCardName(event.target.value.toUpperCase())}
                    placeholder="RAHUL SHARMA"
                    autoComplete="cc-name"
                    style={{ fontFamily: FONT_BODY, borderColor: errors.cardName ? RED : undefined }}
                  />
                  {errors.cardName && <div style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.cardName}</div>}

                  <div className="grid grid-cols-2 gap-3" style={{ marginTop: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>
                        Expiry (MM/YY)
                      </label>
                      <input
                        className="gateway-input"
                        value={expiry}
                        onChange={(event) => setExpiry(formatExpiry(event.target.value))}
                        placeholder="MM/YY"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        style={{ borderColor: errors.expiry ? RED : undefined }}
                      />
                      {errors.expiry && <div style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.expiry}</div>}
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: MUTED, display: "block", marginBottom: 5 }}>
                        CVV
                      </label>
                      <input
                        className="gateway-input"
                        value={cvv}
                        onChange={(event) => setCvv(digitsOnly(event.target.value).slice(0, 4))}
                        placeholder="•••"
                        type="password"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        style={{ borderColor: errors.cvv ? RED : undefined }}
                      />
                      {errors.cvv && <div style={{ color: RED, fontSize: 11, marginTop: 4 }}>{errors.cvv}</div>}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-ghost"
                    style={{ marginTop: 12, padding: "5px 9px", fontSize: 11 }}
                    onClick={() => {
                      setCardNumber("4111 1111 1111 1111");
                      setCardName("RAHUL SHARMA");
                      setExpiry("12/30");
                      setCvv("123");
                      setErrors({});
                    }}
                  >
                    Use test card
                  </button>
                </div>
              )}

              {method === "netbanking" && (
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Select your bank</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {BANKS.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setBank(name);
                          setErrors({});
                        }}
                        className="flex items-center gap-2"
                        style={{
                          border: `1px solid ${bank === name ? BLUE_DARK : LINE}`,
                          background: bank === name ? BLUE_LIGHT : "#fff",
                          padding: "10px 12px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          color: TEXT,
                          textAlign: "left",
                        }}
                      >
                        <Building2 size={15} color={BLUE_DARK} />
                        {name}
                        {bank === name && <Check size={14} color={GREEN} style={{ marginLeft: "auto" }} />}
                      </button>
                    ))}
                  </div>
                  {errors.bank && <div style={{ color: RED, fontSize: 11, marginTop: 6 }}>{errors.bank}</div>}
                  <div style={{ fontSize: 11, color: "#8A99A8", marginTop: 10 }}>
                    You will be redirected to your bank's secure page to authorise the payment.
                  </div>
                </div>
              )}

              {method === "wallet" && (
                <div>
                  <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>Select a wallet</div>
                  <div className="grid grid-cols-2 gap-2">
                    {WALLETS.map((name) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => {
                          setWallet(name);
                          setErrors({});
                        }}
                        style={{
                          border: `1px solid ${wallet === name ? BLUE_DARK : LINE}`,
                          background: wallet === name ? BLUE_LIGHT : "#fff",
                          padding: "12px",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontSize: 13,
                          color: TEXT,
                          fontWeight: wallet === name ? 600 : 400,
                        }}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                  {errors.wallet && <div style={{ color: RED, fontSize: 11, marginTop: 6 }}>{errors.wallet}</div>}
                  <div style={{ fontSize: 11, color: "#8A99A8", marginTop: 10 }}>
                    The amount will be debited from your wallet balance.
                  </div>
                </div>
              )}

              {payButton}

              <div className="flex flex-wrap items-center justify-center gap-2" style={{ marginTop: 12 }}>
                <span className="pay-badge">VISA</span>
                <span className="pay-badge">MASTERCARD</span>
                <span className="pay-badge">RUPAY</span>
                <span className="pay-badge">UPI</span>
                <span className="pay-badge">PCI-DSS</span>
              </div>
              <div style={{ textAlign: "center", fontSize: 10, color: "#9AAAB8", marginTop: 8 }}>
                Sandbox gateway · no real money is charged · OTP 123456
              </div>
            </div>
          )}

          {stage === "otp" && (
            <div style={{ animation: "riseIn .25s ease" }} className="anim">
              <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                <ShieldCheck size={18} color={BLUE_DARK} />
                <span style={{ fontWeight: 600, fontSize: 15 }}>Verify your payment</span>
              </div>
              <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                Enter the 6-digit OTP sent to {maskedContact}.
              </p>

              <div className="flex justify-center gap-2" style={{ margin: "18px 0 8px" }}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    className="otp-input"
                    value={digit}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKeyDown(index, event)}
                    inputMode="numeric"
                    maxLength={6}
                    aria-label={`OTP digit ${index + 1}`}
                    style={{ borderColor: otpError ? RED : undefined }}
                  />
                ))}
              </div>
              {otpError && (
                <div style={{ color: RED, fontSize: 12, textAlign: "center", marginBottom: 8 }}>{otpError}</div>
              )}

              <div
                style={{
                  border: `1px dashed ${LINE}`,
                  background: "#FBFCFD",
                  borderRadius: 6,
                  padding: "8px 10px",
                  fontSize: 11,
                  color: MUTED,
                  textAlign: "center",
                }}
              >
                Sandbox OTP: <strong style={{ fontFamily: FONT_MONO, color: TEXT }}>123456</strong>
              </div>

              <button
                type="button"
                className="btn-primary flex items-center justify-center gap-2"
                style={{ padding: "12px 20px", fontSize: 14, width: "100%", marginTop: 14 }}
                onClick={verifyOtp}
              >
                <Lock size={14} /> Verify &amp; pay ₹{new Intl.NumberFormat("en-IN").format(amount)}
              </button>

              <div className="flex items-center justify-between" style={{ marginTop: 12, fontSize: 11 }}>
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ padding: "4px 8px", fontSize: 11 }}
                  onClick={() => {
                    setStage("form");
                    setOtpError(null);
                  }}
                >
                  Change method
                </button>
                <span style={{ color: MUTED }}>
                  {resendIn > 0 ? (
                    `Resend OTP in ${resendIn}s`
                  ) : (
                    <button
                      type="button"
                      className="btn-ghost flex items-center gap-1"
                      style={{ padding: "4px 8px", fontSize: 11 }}
                      onClick={() => {
                        setOtpNonce((value) => value + 1);
                        setOtp(Array(6).fill(""));
                        setOtpError(null);
                      }}
                    >
                      <RefreshCw size={11} /> Resend OTP
                    </button>
                  )}
                </span>
              </div>

              <div
                className="flex items-center justify-center gap-1"
                style={{ fontSize: 10, color: "#9AAAB8", marginTop: 12 }}
              >
                <Lock size={9} /> Secured by SetuPay · 3-D Secure authentication
              </div>
            </div>
          )}

          {stage === "processing" && (
            <div style={{ padding: "18px 4px", textAlign: "center", animation: "riseIn .25s ease" }} className="anim">
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: "50%",
                  background: BLUE_LIGHT,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 12px",
                }}
              >
                <span className="spinner-dark" />
              </div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>Processing your payment</div>
              <div style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                Please don't close this window.
              </div>

              <div style={{ maxWidth: 300, margin: "18px auto 0", textAlign: "left" }}>
                {[
                  "Contacting issuing bank",
                  "Authenticating payment",
                  "Confirming your booking",
                ].map((label, index) => {
                  const done = processingStep > index;
                  const active = processingStep === index;
                  return (
                    <div
                      key={label}
                      className={`gateway-step${done ? " done" : ""}${active ? " active" : ""}`}
                    >
                      <span className="dot">
                        {done ? <Check size={12} /> : active ? <span className="spinner" style={{ width: 10, height: 10 }} /> : index + 1}
                      </span>
                      {label}
                    </div>
                  );
                })}
              </div>

              <div style={{ fontSize: 10, color: "#9AAAB8", marginTop: 16 }}>
                Amount ₹{new Intl.NumberFormat("en-IN").format(amount)} · {method.toUpperCase()} · Sandbox
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2" style={{ marginTop: 12, fontSize: 10, color: "#9AAAB8" }}>
        <ShieldCheck size={11} /> This is a demonstration gateway. No real payment is processed.
      </div>
    </div>
  );
}
