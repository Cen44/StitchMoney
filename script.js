// This object stores the payment method assumptions used by the calculator.
const paymentMethods = {
  // Bank payments use a low fixed fee in this concept model.
  bank: { label: "Pay by bank", fixedFee: 2.9, rate: 0, rewardRate: 0.004, speed: "Instant confirmation" },
  // Card payments use a percentage fee but may still be convenient for some shoppers.
  card: { label: "Card", fixedFee: 0, rate: 0.015, rewardRate: 0.01, speed: "Instant approval" },
  // Pay Later splits repayment and uses an estimated monthly instalment.
  later: { label: "Pay Later", fixedFee: 0, rate: 0.1, rewardRate: 0.006, speed: "Three monthly payments" }
};

// This helper formats numbers as South African rand for all visible amounts.
const formatRand = (value) => new Intl.NumberFormat("en-ZA", {
  style: "currency",
  currency: "ZAR",
  maximumFractionDigits: 2
}).format(value);

// This helper safely renders user-entered mock text inside generated HTML.
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  "\"": "&quot;",
  "'": "&#039;"
}[character]));

// This query collects the sticky header so scroll state can be applied.
const header = document.querySelector("[data-header]");
// This query collects the navigation toggle button for mobile screens.
const navToggle = document.querySelector("[data-nav-toggle]");
// This query collects the mobile navigation panel.
const nav = document.querySelector("[data-nav]");
// This query collects the purchase amount range input.
const amountRange = document.querySelector("[data-amount-range]");
// This query collects the visible purchase amount output.
const amountOutput = document.querySelector("[data-amount-output]");
// This query collects the method buttons as an array for easier iteration.
const methodButtons = [...document.querySelectorAll("[data-method]")];
// This query collects the recommendation panel that explains the current best choice.
const recommendation = document.querySelector("[data-recommendation]");
// This query collects the bank fee display.
const bankFee = document.querySelector("[data-fee-bank]");
// This query collects the card fee display.
const cardFee = document.querySelector("[data-fee-card]");
// This query collects the Pay Later instalment display.
const laterFee = document.querySelector("[data-fee-later]");
// This query collects the route title in the phone mockup.
const routeTitle = document.querySelector("[data-route-title]");
// This query collects the route status in the phone mockup.
const routeStatus = document.querySelector("[data-route-status]");
// This query collects the privacy toggle in the phone mockup.
const privacyToggle = document.querySelector("[data-privacy-toggle]");
// This query collects the visible app balance.
const balance = document.querySelector("[data-balance]");
// This query collects the waitlist form.
const signupForm = document.querySelector("[data-signup-form]");
// This query collects the waitlist form confirmation message.
const formMessage = document.querySelector("[data-form-message]");
// This query collects the merchant name for mock transaction creation.
const merchantName = document.querySelector("[data-merchant-name]");
// This query collects the button that opens the mock payment modal.
const openPaymentButton = document.querySelector("[data-open-payment]");
// This query collects the mock payment modal dialog.
const paymentModal = document.querySelector("[data-payment-modal]");
// This query collects the button that closes the payment modal.
const closePaymentButton = document.querySelector("[data-close-payment]");
// This query collects the mock payment details form.
const paymentForm = document.querySelector("[data-payment-form]");
// This query collects the mock bank details form.
const bankForm = document.querySelector("[data-bank-form]");
// This query collects the message shown after mock bank details are saved.
const bankMessage = document.querySelector("[data-bank-message]");
// This query collects the payment status heading.
const paymentStatus = document.querySelector("[data-payment-status]");
// This query collects the fake progress bar.
const progressBar = document.querySelector("[data-progress-bar]");
// This query collects the status steps list.
const statusSteps = document.querySelector("[data-status-steps]");
// This query collects the fake payment processing button.
const processPaymentButton = document.querySelector("[data-process-payment]");
// This query collects the demo balance shown on the demo page.
const demoBalance = document.querySelector("[data-demo-balance]");
// This query collects the current plan label shown in the summary card.
const planLabel = document.querySelector("[data-plan-label]");
// This query collects all consumer plan buttons.
const planButtons = [...document.querySelectorAll("[data-plan-button]")];
// This query collects the plan selection confirmation message.
const planMessage = document.querySelector("[data-plan-message]");
// This query collects the transaction history table body.
const transactionBody = document.querySelector("[data-transaction-body]");
const resetDemoButton = document.querySelector("[data-reset-demo]");

// This variable tracks the selected payment method.
let selectedMethod = "bank";
// This variable stores the original balance text for privacy-mode restoration when a balance exists.
let visibleBalance = balance ? balance.textContent : "";
// This variable tracks whether a mock payment method has been saved.
const DEMO_STORAGE_KEY = "stitch-money-demo-v1";
const savedDemoState = (() => {
  try { return JSON.parse(localStorage.getItem(DEMO_STORAGE_KEY) || "{}"); }
  catch { return {}; }
})();
let hasMockPaymentMethod = Boolean(savedDemoState.hasMockPaymentMethod);
// This variable tracks whether mock bank details have been saved.
let hasMockBank = Boolean(savedDemoState.hasMockBank);
// This variable tracks the numeric demo balance for fake transaction updates.
let demoBalanceValue = Number.isFinite(savedDemoState.balance) ? savedDemoState.balance : 8420.55;
let mockTransactions = Array.isArray(savedDemoState.transactions) ? savedDemoState.transactions : [];

// Store demo-only state. Never save card numbers, CVV, account numbers, or names.
function saveDemoState() {
  try {
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify({
      balance: demoBalanceValue,
      plan: savedDemoState.plan || "Free",
      hasMockPaymentMethod,
      hasMockBank,
      transactions: mockTransactions
    }));
  } catch (error) {
    console.warn("Demo state could not be saved in this browser.", error);
  }
}

// This function marks the active navigation link on multi-page views.
function markCurrentPage() {
  // This guard prevents errors if the navigation is missing.
  if (!nav) {
    return;
  }
  // This value reads the current file name and falls back to the home page.
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  // This loop checks every navigation link in the header.
  nav.querySelectorAll("a").forEach((link) => {
    // This value extracts only the linked file name and ignores any hash.
    const linkedPage = link.getAttribute("href").split("#")[0];
    // This branch marks the matching link for styling and accessibility.
    if (linkedPage === currentPage) {
      link.setAttribute("aria-current", "page");
    }
  });
}

// This function calculates the estimated fee for a method and amount.
function calculateFee(methodKey, amount) {
  // This lookup grabs the fee assumptions for the selected method.
  const method = paymentMethods[methodKey];
  // This branch handles Pay Later as a repayment product instead of a normal fee.
  if (methodKey === "later") {
    return (amount * (1 + method.rate)) / 3;
  }
  // This return combines fixed and percentage-based fees.
  return method.fixedFee + amount * method.rate;
}

// This function calculates the estimated reward value for a method and amount.
function calculateReward(methodKey, amount) {
  // This return multiplies amount by the method's concept reward rate.
  return amount * paymentMethods[methodKey].rewardRate;
}

// This function chooses the method with the best net value for the current amount.
function findBestMethod(amount) {
  // This array converts the method object into sortable result rows.
  const ranked = Object.keys(paymentMethods).map((methodKey) => {
    // This value stores the estimated fee or instalment for the method.
    const fee = calculateFee(methodKey, amount);
    // This value stores the estimated reward.
    const reward = calculateReward(methodKey, amount);
    // This return produces the score used for recommendation ranking.
    return { methodKey, score: reward - fee, fee, reward };
  });
  // This sort places the strongest net value first.
  ranked.sort((a, b) => b.score - a.score);
  // This return gives the best method row to the caller.
  return ranked[0];
}

// This function updates the calculator and phone preview after any user change.
function updateCalculator() {
  // This guard prevents calculator code from running on pages without the calculator.
  if (!amountRange || !amountOutput || !recommendation || !bankFee || !cardFee || !laterFee) {
    return;
  }
  // This value reads the current purchase amount from the slider.
  const amount = Number(amountRange.value);
  // This value calculates the best method for the current amount.
  const best = findBestMethod(amount);
  // This line updates the visible slider output.
  amountOutput.textContent = formatRand(amount);
  // This line updates the bank method fee display.
  bankFee.textContent = `${formatRand(calculateFee("bank", amount))} fee`;
  // This line updates the card method fee display.
  cardFee.textContent = `${formatRand(calculateFee("card", amount))} fee`;
  // This line updates the Pay Later monthly repayment display.
  laterFee.textContent = `${formatRand(calculateFee("later", amount))}/month`;
  // This value grabs the assumptions for the currently selected method.
  const current = paymentMethods[selectedMethod];
  // This value calculates the selected method reward.
  const currentReward = calculateReward(selectedMethod, amount);
  // This value calculates the selected method cost or instalment.
  const currentFee = calculateFee(selectedMethod, amount);
  // This line updates the route title inside the phone mockup.
  if (routeTitle) {
    // This line updates the route title inside the phone mockup.
    routeTitle.textContent = paymentMethods[best.methodKey].label;
  }
  if (routeStatus) {
    // This line updates the route status inside the phone mockup.
    routeStatus.textContent = best.methodKey === selectedMethod ? "Best choice" : "Better route";
  }
  // This line explains the current selected method and the best alternative.
  recommendation.textContent = `${current.label}: ${formatRand(currentFee)} cost, about ${formatRand(currentReward)} in reward value, ${current.speed.toLowerCase()}. Best net value now: ${paymentMethods[best.methodKey].label}.`;
}

// This function updates the status steps in the fake payment panel.
function setStatusSteps(items) {
  // This guard prevents errors on pages without the payment status list.
  if (!statusSteps) {
    return;
  }
  // This line renders each status message as a list item.
  statusSteps.innerHTML = items.map((item) => `<li>${item}</li>`).join("");
}

// This function inserts a new fake transaction at the top of the history table.
function addMockTransaction(merchant, methodLabel, amount) {
  // This guard prevents errors when the transaction table is not present.
  if (!transactionBody) {
    return;
  }
  // This row represents the newly processed fake transaction.
  const row = document.createElement("tr");
  // This line fills the row with transaction fields.
  row.innerHTML = `<td>Now</td><td>${escapeHtml(merchant)}</td><td>${escapeHtml(methodLabel)}</td><td><span class="status-pill complete">Complete</span></td><td>-${formatRand(amount)}</td>`;
  // This line inserts the new transaction above older rows.
  transactionBody.prepend(row);
  mockTransactions.unshift({ merchant, method: methodLabel, amount, date: new Date().toISOString() });
  saveDemoState();
}

// This function updates the demo balance after a fake transaction.
function updateDemoBalance(amount) {
  // This guard prevents errors on pages without the demo balance.
  if (!demoBalance) {
    return;
  }
  // This line subtracts the fake payment amount.
  demoBalanceValue = Math.max(0, demoBalanceValue - amount);
  // This line renders the updated mock balance.
  demoBalance.textContent = formatRand(demoBalanceValue);
  saveDemoState();
}

// This function runs a fake payment-processing sequence for the dashboard.
function processMockPayment() {
  // This guard prevents errors when the payment controls are missing.
  if (!paymentStatus || !progressBar || !processPaymentButton || !amountRange) {
    return;
  }
  // This value reads the amount from the checkout slider.
  const amount = Number(amountRange.value);
  // This value reads the merchant name or falls back to a default.
  const merchant = merchantName && merchantName.value.trim() ? merchantName.value.trim() : "Demo merchant";
  // This value reads the selected payment label for history.
  const methodLabel = paymentMethods[selectedMethod].label;
  if (amount > demoBalanceValue) {
    paymentStatus.textContent = "Insufficient demo balance";
    setStatusSteps(["Payment not started", `Available: ${formatRand(demoBalanceValue)}`, "Lower the amount or reset demo data"]);
    return;
  }
  // This branch asks the user to add payment details before processing.
  if (!hasMockPaymentMethod) {
    paymentStatus.textContent = "Add mock payment details first";
    setStatusSteps(["Payment method missing", "Open the payment form", "No real data is needed"]);
    return;
  }
  // This branch asks the user to link a bank for bank payments.
  if (selectedMethod === "bank" && !hasMockBank) {
    paymentStatus.textContent = "Link a mock bank first";
    setStatusSteps(["Bank details missing", "Save a mock bank account", "Then retry the payment"]);
    return;
  }
  // This line disables the button during fake processing.
  processPaymentButton.disabled = true;
  // This line resets the progress bar to the beginning.
  progressBar.style.width = "12%";
  // This line shows the first processing state.
  paymentStatus.textContent = "Authorising payment";
  // This line updates the visible processing steps.
  setStatusSteps(["Payment details accepted", "Routing through best available rail", "Waiting for merchant confirmation"]);
  // This timer simulates routing progress.
  window.setTimeout(() => {
    // This line moves the progress bar halfway.
    progressBar.style.width = "58%";
    // This line updates the status heading.
    paymentStatus.textContent = "Confirming with merchant";
  }, 550);
  // This timer completes the fake payment.
  window.setTimeout(() => {
    // This line fills the progress bar.
    progressBar.style.width = "100%";
    // This line shows final success.
    paymentStatus.textContent = "Payment complete";
    // This line updates the status list with completed steps.
    setStatusSteps(["Authorised successfully", `${methodLabel} confirmed`, "Receipt added to transaction history"]);
    // This line adds the fake transaction to history.
    addMockTransaction(merchant, methodLabel, amount);
    // This line updates the visible demo balance.
    updateDemoBalance(amount);
    // This line allows another fake payment.
    processPaymentButton.disabled = false;
  }, 1300);
}

// This function updates plan-related labels after the user chooses a tier.
function choosePlan(planName) {
  // This guard prevents errors when plan text is missing.
  if (!planMessage) {
    return;
  }
  // This map stores the user-facing benefit summary for each tier.
  const planBenefits = {
    Free: "Free plan selected. You get core payments, basic rewards, and 30-day history.",
    Plus: "Plus selected. You unlocked budget alerts, 2x rewards, 12-month history, and priority chat.",
    Premium: "Premium selected. You unlocked family wallets, advanced fraud alerts, instant disputes, and coaching recaps."
  };
  // This line updates the plan confirmation message.
  planMessage.textContent = planBenefits[planName];
  // This branch updates the account summary label when present.
  if (planLabel) {
    planLabel.textContent = `Current plan: ${planName}`;
  }
  savedDemoState.plan = planName;
  saveDemoState();
  // This loop resets visual state for every plan button.
  planButtons.forEach((button) => button.classList.remove("selected-plan"));
  // This line marks the chosen plan button.
  const selectedButton = planButtons.find((button) => button.dataset.plan === planName);
  // This guard applies the selected state when the button exists.
  if (selectedButton) {
    selectedButton.classList.add("selected-plan");
  }
}

// This function closes the payment modal with a fallback for older browsers.
function closePaymentModal() {
  // This guard prevents errors when the modal is missing.
  if (!paymentModal) {
    return;
  }
  // This branch uses the native dialog close method when available.
  if (typeof paymentModal.close === "function") {
    paymentModal.close();
  } else {
    // This fallback hides the modal by removing the open attribute.
    paymentModal.removeAttribute("open");
  }
}

// This listener toggles the mobile navigation menu.
if (navToggle && nav) {
  // This listener toggles the mobile navigation menu.
  navToggle.addEventListener("click", () => {
    // This value checks whether the menu is already open.
    const isOpen = nav.classList.toggle("is-open");
    // This line keeps the ARIA state synchronized with the visual menu.
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

// This listener closes the mobile menu after a navigation link is clicked.
if (nav && navToggle) {
  // This listener closes the mobile menu after a navigation link is clicked.
  nav.addEventListener("click", (event) => {
    // This guard only responds when the user clicked a link.
    if (event.target.matches("a")) {
      // This line closes the menu panel.
      nav.classList.remove("is-open");
      // This line resets the ARIA expanded state.
      navToggle.setAttribute("aria-expanded", "false");
    }
  });
}

// This listener adds a shadow to the sticky header after scrolling.
window.addEventListener("scroll", () => {
  if (header) {
    // This line toggles the class based on vertical scroll position.
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  }
});

// This listener updates all fee calculations as the slider moves.
if (amountRange) {
  // This listener updates all fee calculations as the slider moves.
  amountRange.addEventListener("input", updateCalculator);
}

// This loop wires each payment method button to the calculator state.
methodButtons.forEach((button) => {
  // This listener marks the clicked payment method as selected.
  button.addEventListener("click", () => {
    // This line stores the selected method key from the button attribute.
    selectedMethod = button.dataset.method;
    // This loop removes active styling from all method buttons.
    methodButtons.forEach((item) => item.classList.remove("active"));
    // This line applies active styling to the clicked method button.
    button.classList.add("active");
    // This line recalculates the recommendation for the new method.
    updateCalculator();
  });
});

// This listener hides or reveals the balance in the phone preview.
if (privacyToggle && balance) {
  // This listener hides or reveals the balance in the phone preview.
  privacyToggle.addEventListener("click", () => {
    // This value checks whether the toggle is currently active.
    const isPressed = privacyToggle.getAttribute("aria-pressed") === "true";
    // This value flips the pressed state.
    const nextPressed = !isPressed;
    // This line updates the accessible pressed state.
    privacyToggle.setAttribute("aria-pressed", String(nextPressed));
    // This line swaps the visible button label.
    privacyToggle.textContent = nextPressed ? "Privacy off" : "Privacy on";
    // This line hides or restores the balance amount.
    balance.textContent = nextPressed ? "R ******" : visibleBalance;
  });
}

// This listener handles the waitlist form without sending data anywhere.
if (signupForm && formMessage) {
  // This listener handles the waitlist form without sending data anywhere.
  signupForm.addEventListener("submit", (event) => {
    // This line prevents a page reload because this is a static demo.
    event.preventDefault();
    // This object reads form values from the submitted form.
    const formData = new FormData(signupForm);
    // This value reads the email address for a personalized confirmation.
    const email = formData.get("email");
    // This line confirms the signup locally.
    formMessage.textContent = `Thanks, ${email}. This concept saved your spot locally.`;
    // This line clears the form for a tidy finished state.
    signupForm.reset();
  });
}

// This listener opens the mock payment details modal.
if (openPaymentButton && paymentModal) {
  // This listener opens the mock payment details modal.
  openPaymentButton.addEventListener("click", () => {
    // This branch uses the native dialog API when available.
    if (typeof paymentModal.showModal === "function") {
      paymentModal.showModal();
    } else {
      // This fallback displays the modal for older browsers.
      paymentModal.setAttribute("open", "");
    }
  });
}

// This listener closes the mock payment details modal.
if (closePaymentButton && paymentModal) {
  // This listener closes the mock payment details modal.
  closePaymentButton.addEventListener("click", () => {
    // This line closes the dialog.
    closePaymentModal();
  });
}

// This listener saves mock payment information without sending it anywhere.
if (paymentForm && paymentModal && paymentStatus) {
  // This listener handles fake payment method saving.
  paymentForm.addEventListener("submit", (event) => {
    // This line prevents the dialog form from closing before custom handling.
    event.preventDefault();
    // This line marks the fake payment method as saved.
    hasMockPaymentMethod = true;
    saveDemoState();
    // This line updates the payment status heading.
    paymentStatus.textContent = "Mock payment method saved";
    // This line updates the processing checklist.
    setStatusSteps(["Card token simulated", "Ready for route selection", "No real payment data stored"]);
    // This line closes the modal after saving.
    closePaymentModal();
  });
}

// This listener saves mock bank details without contacting a bank.
if (bankForm && bankMessage) {
  // This listener handles fake bank linking.
  bankForm.addEventListener("submit", (event) => {
    // This line prevents the static page from reloading.
    event.preventDefault();
    // This value reads the selected fake bank name.
    const bankName = new FormData(bankForm).get("bankName");
    // This line marks a fake bank account as linked.
    hasMockBank = true;
    saveDemoState();
    // This line confirms the fake bank link to the user.
    bankMessage.textContent = `${bankName} linked in demo mode.`;
    // This line updates the status panel when it exists.
    if (paymentStatus) {
      paymentStatus.textContent = "Mock bank linked";
    }
    // This line updates the fake processing checklist.
    setStatusSteps(["Bank account simulated", "Account verification mocked", "Ready for payment"]);
  });
}

// This listener starts the fake payment-processing sequence.
if (processPaymentButton) {
  // This listener starts the fake payment-processing sequence.
  processPaymentButton.addEventListener("click", processMockPayment);
}

// Restore the demo's non-sensitive state across page reloads.
if (demoBalance) demoBalance.textContent = formatRand(demoBalanceValue);
if (planLabel && savedDemoState.plan) planLabel.textContent = `Current plan: ${savedDemoState.plan}`;
if (transactionBody && mockTransactions.length) {
  mockTransactions.slice().reverse().forEach((transaction) => {
    const row = document.createElement("tr");
    const date = new Date(transaction.date);
    const cells = [date.toLocaleDateString("en-ZA"), transaction.merchant, transaction.method, "Complete", `-${formatRand(transaction.amount)}`];
    cells.forEach((value, index) => {
      const cell = document.createElement("td");
      if (index === 3) {
        const pill = document.createElement("span");
        pill.className = "status-pill complete";
        pill.textContent = value;
        cell.append(pill);
      } else cell.textContent = value;
      row.append(cell);
    });
    transactionBody.prepend(row);
  });
}
if (bankMessage && hasMockBank) bankMessage.textContent = "A mock bank is linked in this browser.";
if (paymentStatus && hasMockPaymentMethod) paymentStatus.textContent = "Mock payment method ready";
if (resetDemoButton) resetDemoButton.addEventListener("click", () => {
  localStorage.removeItem(DEMO_STORAGE_KEY);
  window.location.reload();
});

// This loop wires consumer plan buttons to the selection state.
planButtons.forEach((button) => {
  // This listener chooses the clicked plan.
  button.addEventListener("click", () => {
    // This line updates the current plan based on the button data attribute.
    choosePlan(button.dataset.plan);
  });
});

// This call initializes the calculator with the default amount and method.
updateCalculator();

// This call initializes the active navigation state.
markCurrentPage();
