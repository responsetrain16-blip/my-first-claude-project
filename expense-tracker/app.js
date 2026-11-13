// ============================================================
// Expense & Income Tracker
// Everything is saved in your browser (localStorage), so your
// data stays on your computer and is still there after a refresh.
// ============================================================

// ---------- Settings you can change ----------

// The currency used to display amounts (e.g. "USD", "EUR", "GBP", "INR")
const CURRENCY = "USD";

// The categories shown in the form for each type of transaction
const CATEGORIES = {
  income: ["Salary", "Freelance", "Gift", "Other"],
  expense: ["Food", "Rent", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Other"],
};

// The name used to store data in the browser
const STORAGE_KEY = "expense-tracker-transactions";

// ---------- Finding the parts of the page we need ----------

const form = document.getElementById("transaction-form");
const descriptionInput = document.getElementById("description");
const amountInput = document.getElementById("amount");
const categorySelect = document.getElementById("category");
const dateInput = document.getElementById("date");
const typeRadios = document.querySelectorAll('input[name="type"]');

const filterType = document.getElementById("filter-type");
const filterMonth = document.getElementById("filter-month");
const clearMonthButton = document.getElementById("clear-month");

const list = document.getElementById("transaction-list");
const emptyMessage = document.getElementById("empty-message");
const balanceEl = document.getElementById("balance");
const incomeEl = document.getElementById("total-income");
const expenseEl = document.getElementById("total-expense");

// ---------- Saving and loading ----------

function loadTransactions() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return []; // If anything goes wrong, start with an empty list
  }
}

function saveTransactions() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  } catch {
    alert("Sorry, your data could not be saved in this browser.");
  }
}

// The list of all transactions. Each one looks like:
// { id, type: "income" | "expense", description, amount, category, date: "YYYY-MM-DD" }
let transactions = loadTransactions();

// ---------- Small helper functions ----------

// Turns a number like 1234.5 into "$1,234.50"
function formatMoney(amount) {
  return amount.toLocaleString(undefined, { style: "currency", currency: CURRENCY });
}

// Turns "2026-11-13" into a friendly date like "Nov 13, 2026"
function formatDate(dateString) {
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

// Today's date as "YYYY-MM-DD" in your local time zone
function today() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

// Makes a unique id so each transaction can be found and deleted
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Which type ("income" or "expense") is selected in the form
function selectedType() {
  return document.querySelector('input[name="type"]:checked').value;
}

// Fills the category dropdown with the right options for the chosen type
function fillCategories(type) {
  categorySelect.innerHTML = "";
  for (const name of CATEGORIES[type]) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    categorySelect.appendChild(option);
  }
}

// ---------- Showing everything on the page ----------

function render() {
  const month = filterMonth.value; // e.g. "2026-11", or "" for all months
  const type = filterType.value;   // "all", "income" or "expense"

  // 1. Keep only transactions in the chosen month
  const inMonth = transactions.filter((t) => !month || t.date.startsWith(month));

  // 2. Work out the totals for that month
  let income = 0;
  let expense = 0;
  for (const t of inMonth) {
    if (t.type === "income") income += t.amount;
    else expense += t.amount;
  }
  const balance = income - expense;

  incomeEl.textContent = formatMoney(income);
  expenseEl.textContent = formatMoney(expense);
  balanceEl.textContent = formatMoney(balance);
  balanceEl.className = "value " + (balance < 0 ? "expense" : "");

  // 3. Apply the type filter and sort newest first
  const visible = inMonth
    .filter((t) => type === "all" || t.type === type)
    .sort((a, b) => b.date.localeCompare(a.date));

  // 4. Draw the list
  list.innerHTML = "";
  for (const t of visible) {
    list.appendChild(createListItem(t));
  }

  emptyMessage.hidden = visible.length > 0;
  emptyMessage.textContent = transactions.length === 0
    ? "No transactions yet. Add one above!"
    : "No transactions match these filters.";
}

// Builds one row in the transaction list
function createListItem(t) {
  const item = document.createElement("li");
  item.className = "transaction";

  const details = document.createElement("div");
  details.className = "details";

  const description = document.createElement("div");
  description.className = "description";
  description.textContent = t.description;

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${t.category} · ${formatDate(t.date)}`;

  details.append(description, meta);

  const amount = document.createElement("span");
  amount.className = "amount " + t.type;
  amount.textContent = (t.type === "income" ? "+" : "−") + formatMoney(t.amount);

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.title = "Delete";
  deleteButton.setAttribute("aria-label", `Delete ${t.description}`);
  deleteButton.textContent = "✕";
  deleteButton.dataset.id = t.id;

  item.append(details, amount, deleteButton);
  return item;
}

// ---------- Reacting to what the user does ----------

// Adding a new transaction
form.addEventListener("submit", (event) => {
  event.preventDefault(); // Stop the page from reloading

  const description = descriptionInput.value.trim();
  const amount = parseFloat(amountInput.value);

  if (!description || !(amount > 0) || !dateInput.value) {
    alert("Please enter a description, an amount above 0, and a date.");
    return;
  }

  transactions.push({
    id: makeId(),
    type: selectedType(),
    description,
    amount: Math.round(amount * 100) / 100, // keep 2 decimal places
    category: categorySelect.value,
    date: dateInput.value,
  });

  saveTransactions();
  render();

  // Clear the form for the next entry (but keep the type and date)
  descriptionInput.value = "";
  amountInput.value = "";
  descriptionInput.focus();
});

// Deleting a transaction
list.addEventListener("click", (event) => {
  const button = event.target.closest(".delete-button");
  if (!button) return;

  if (confirm("Delete this transaction?")) {
    transactions = transactions.filter((t) => t.id !== button.dataset.id);
    saveTransactions();
    render();
  }
});

// Switching between Expense and Income updates the categories
typeRadios.forEach((radio) => {
  radio.addEventListener("change", () => fillCategories(selectedType()));
});

// Changing the filters redraws the list
filterType.addEventListener("change", render);
filterMonth.addEventListener("change", render);
clearMonthButton.addEventListener("click", () => {
  filterMonth.value = "";
  render();
});

// ---------- Start the app ----------

fillCategories(selectedType());
dateInput.value = today();
filterMonth.value = today().slice(0, 7); // Show the current month by default
render();
