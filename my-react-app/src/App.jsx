import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  LogOut,
  LayoutDashboard,
  Receipt,
  PiggyBank,
  FileBarChart,
  RefreshCw,
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

import Auth from "./auth.jsx";
import Budgets from "./Budgets.jsx";
import "./App.css";

const API = "http://localhost:5000/api/transactions";

const COLORS = [
  "#635bff",
  "#12b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#a855f7",
  "#ec4899",
];

function money(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("spendwise_user")) || null;
  } catch {
    return null;
  }
}

function getStoredToken() {
  return localStorage.getItem("spendwise_token");
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(getStoredUser);
  const [page, setPage] = useState("overview");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "expense",
    category: "Food",
    description: "",
  });

  const [submitting, setSubmitting] = useState(false);

  const loadTransactions = useCallback(async () => {
    if (!getStoredToken()) {
      setTransactions([]);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await axios.get(API, {
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      });

      const data = response.data;
      setTransactions(Array.isArray(data) ? data : data.transactions || []);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load transactions. Check your backend."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadTransactions();
    } else {
      setTransactions([]);
      setLoading(false);
    }
  }, [currentUser, loadTransactions]);

  function handleLogin(data) {
    if (!data?.token || !data?.user) {
      setError("Login response is missing user or token information.");
      return;
    }

    localStorage.setItem("spendwise_token", data.token);
    localStorage.setItem("spendwise_user", JSON.stringify(data.user));
    setCurrentUser(data.user);
    setPage("overview");
    setError("");
  }

  function handleLogout() {
    localStorage.removeItem("spendwise_token");
    localStorage.removeItem("spendwise_user");
    setCurrentUser(null);
    setTransactions([]);
    setPage("overview");
    setError("");
    setSuccess("");
  }

  function updateForm(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleAddTransaction(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const amount = Number(form.amount);

    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter a title and an amount greater than zero.");
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(
        API,
        {
          title: form.title.trim(),
          amount,
          type: form.type,
          category: form.category,
          description: form.description.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${getStoredToken()}`,
          },
        }
      );

      setForm({
        title: "",
        amount: "",
        type: "expense",
        category: "Food",
        description: "",
      });

      setSuccess("Transaction added successfully.");
      await loadTransactions();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not add transaction. Check your backend route."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTransaction(id) {
    if (!window.confirm("Delete this transaction?")) return;

    setError("");
    setSuccess("");

    try {
      await axios.delete(`${API}/${id}`, {
        headers: {
          Authorization: `Bearer ${getStoredToken()}`,
        },
      });

      setTransactions((previous) =>
        previous.filter((item) => item._id !== id && item.id !== id)
      );

      setSuccess("Transaction deleted.");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not delete transaction. Check your backend route."
      );
    }
  }

  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = income - expenses;

  const categoryTotals = Object.values(
    transactions
      .filter((item) => item.type === "expense")
      .reduce((result, item) => {
        const category = item.category || "Other";

        if (!result[category]) {
          result[category] = { name: category, value: 0 };
        }

        result[category].value += Number(item.amount || 0);
        return result;
      }, {})
  );

  function exportCSV() {
    const headings = [
      "Title",
      "Amount",
      "Type",
      "Category",
      "Description",
      "Date",
    ];

    const escapeCSV = (value) =>
      `"${String(value ?? "").replace(/"/g, '""')}"`;

    const rows = transactions.map((item) => [
      item.title,
      item.amount,
      item.type,
      item.category,
      item.description,
      item.createdAt || item.date || "",
    ]);

    const csv = [headings, ...rows]
      .map((row) => row.map(escapeCSV).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "spendwise-transactions.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!currentUser) {
    return <Auth onLogin={handleLogin} />;
  }

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "transactions", label: "Transactions", icon: Receipt },
    { id: "budgets", label: "Budgets", icon: PiggyBank },
    { id: "reports", label: "Reports", icon: FileBarChart },
  ];

  const styles = {
    app: {
      minHeight: "100vh",
      background: "#f5f7fb",
      color: "#182230",
      fontFamily: "Inter, Arial, sans-serif",
    },
    sidebar: {
      width: "230px",
      background: "#fff",
      borderRight: "1px solid #e8ebf2",
      padding: "24px 16px",
      display: "flex",
      flexDirection: "column",
      gap: "24px",
      flexShrink: 0,
    },
    button: {
      border: 0,
      borderRadius: "9px",
      padding: "11px 14px",
      cursor: "pointer",
      fontWeight: 600,
    },
    panel: {
      background: "#fff",
      border: "1px solid #e8ebf2",
      borderRadius: "14px",
      padding: "20px",
      minWidth: 0,
    },
    input: {
      width: "100%",
      boxSizing: "border-box",
      padding: "11px 12px",
      border: "1px solid #dce1ea",
      borderRadius: "8px",
      marginTop: "6px",
      background: "#fff",
      font: "inherit",
    },
    muted: { color: "#737d90", fontSize: "13px" },
  };

  const cardData = [
    {
      title: "Total Balance",
      value: money(balance),
      icon: Wallet,
      color: "#635bff",
    },
    {
      title: "Total Income",
      value: money(income),
      icon: TrendingUp,
      color: "#12a875",
    },
    {
      title: "Total Expenses",
      value: money(expenses),
      icon: TrendingDown,
      color: "#ef4444",
    },
  ];

  return (
    <div
      style={{
        ...styles.app,
        display: "flex",
        minHeight: "100vh",
      }}
    >
      <aside style={styles.sidebar}>
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            color: "#635bff",
          }}
        >
          <Wallet size={29} />
          <strong style={{ fontSize: "21px", color: "#182230" }}>
            SpendWise
          </strong>
        </div>

        <div style={{ ...styles.muted, padding: "0 10px" }}>
          MAIN MENU
        </div>

        <nav style={{ display: "grid", gap: "7px" }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setError("");
                  setSuccess("");
                }}
                style={{
                  ...styles.button,
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  textAlign: "left",
                  background: active ? "#eeedff" : "transparent",
                  color: active ? "#635bff" : "#596579",
                }}
              >
                <Icon size={19} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto" }}>
          <div
            style={{
              padding: "13px",
              background: "#f5f7fb",
              borderRadius: "10px",
              marginBottom: "12px",
              overflowWrap: "anywhere",
            }}
          >
            <strong>{currentUser.name || "My Account"}</strong>
            <p style={styles.muted}>{currentUser.email || ""}</p>
          </div>

          <button
            onClick={handleLogout}
            style={{
              ...styles.button,
              width: "100%",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              background: "#fff0f0",
              color: "#d92d20",
            }}
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, padding: "28px" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "16px",
            flexWrap: "wrap",
            marginBottom: "26px",
          }}
        >
          <div>
            <h1 style={{ margin: "0 0 6px", fontSize: "27px" }}>
              {navItems.find((item) => item.id === page)?.label}
            </h1>
            <p style={{ ...styles.muted, margin: 0 }}>
              Welcome back, {currentUser.name || "there"}!
            </p>
          </div>

          <button
            onClick={loadTransactions}
            style={{
              ...styles.button,
              background: "#fff",
              border: "1px solid #e0e5ee",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              padding: "12px 15px",
              borderRadius: "9px",
              background: "#fff0f0",
              color: "#b42318",
              marginBottom: "18px",
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              padding: "12px 15px",
              borderRadius: "9px",
              background: "#eafaf2",
              color: "#087443",
              marginBottom: "18px",
            }}
          >
            {success}
          </div>
        )}

        {page === "overview" && (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                gap: "18px",
                marginBottom: "22px",
              }}
            >
              {cardData.map((card) => {
                const Icon = card.icon;

                return (
                  <section key={card.title} style={styles.panel}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={styles.muted}>{card.title}</span>
                      <span
                        style={{
                          background: `${card.color}18`,
                          color: card.color,
                          padding: "9px",
                          borderRadius: "10px",
                        }}
                      >
                        <Icon size={20} />
                      </span>
                    </div>
                    <h2 style={{ margin: "18px 0 0", fontSize: "25px" }}>
                      {card.value}
                    </h2>
                  </section>
                );
              })}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "20px",
              }}
            >
              <section style={styles.panel}>
                <h3 style={{ marginTop: 0 }}>Expenses by Category</h3>

                {categoryTotals.length ? (
                  <div style={{ width: "100%", height: "280px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryTotals}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label
                        >
                          {categoryTotals.map((item, index) => (
                            <Cell
                              key={item.name}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => money(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p style={styles.muted}>
                    Add an expense to see your category chart.
                  </p>
                )}
              </section>

              <section style={styles.panel}>
                <h3 style={{ marginTop: 0 }}>Recent Transactions</h3>

                {transactions.length === 0 ? (
                  <p style={styles.muted}>No transactions yet.</p>
                ) : (
                  transactions.slice(0, 5).map((item) => (
                    <div
                      key={item._id || item.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "12px",
                        padding: "13px 0",
                        borderBottom: "1px solid #edf0f5",
                      }}
                    >
                      <div>
                        <strong>{item.title}</strong>
                        <div style={styles.muted}>
                          {item.category || "Other"}
                        </div>
                      </div>
                      <strong
                        style={{
                          color:
                            item.type === "income" ? "#12a875" : "#e5484d",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.type === "income" ? "+" : "-"}
                        {money(item.amount)}
                      </strong>
                    </div>
                  ))
                )}
              </section>
            </div>
          </>
        )}

        {page === "transactions" && (
          <>
            <section style={{ ...styles.panel, marginBottom: "20px" }}>
              <h3 style={{ marginTop: 0 }}>Add Transaction</h3>

              <form
                onSubmit={handleAddTransaction}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "15px",
                }}
              >
                <label>
                  Title
                  <input
                    style={styles.input}
                    name="title"
                    value={form.title}
                    onChange={updateForm}
                    placeholder="e.g. Grocery shopping"
                    required
                  />
                </label>

                <label>
                  Amount (₹)
                  <input
                    style={styles.input}
                    name="amount"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  Type
                  <select
                    style={styles.input}
                    name="type"
                    value={form.type}
                    onChange={updateForm}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>

                <label>
                  Category
                  <select
                    style={styles.input}
                    name="category"
                    value={form.category}
                    onChange={updateForm}
                  >
                    <option>Food</option>
                    <option>Transport</option>
                    <option>Shopping</option>
                    <option>Bills</option>
                    <option>Entertainment</option>
                    <option>Health</option>
                    <option>Salary</option>
                    <option>Education</option>
                    <option>Other</option>
                  </select>
                </label>

                <label style={{ gridColumn: "1 / -1" }}>
                  Description (optional)
                  <input
                    style={styles.input}
                    name="description"
                    value={form.description}
                    onChange={updateForm}
                    placeholder="Add a note"
                  />
                </label>

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    ...styles.button,
                    background: "#635bff",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Plus size={17} />
                  {submitting ? "Saving..." : "Add Transaction"}
                </button>
              </form>
            </section>

            <section style={styles.panel}>
              <h3 style={{ marginTop: 0 }}>All Transactions</h3>

              {loading ? (
                <p style={styles.muted}>Loading transactions...</p>
              ) : transactions.length === 0 ? (
                <p style={styles.muted}>No transactions found.</p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      textAlign: "left",
                    }}
                  >
                    <thead>
                      <tr>
                        {["Title", "Category", "Type", "Amount", "Action"].map(
                          (heading) => (
                            <th
                              key={heading}
                              style={{
                                padding: "12px 10px",
                                borderBottom: "1px solid #e8ebf2",
                                color: "#737d90",
                                fontSize: "13px",
                              }}
                            >
                              {heading}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((item) => (
                        <tr key={item._id || item.id}>
                          <td style={{ padding: "14px 10px" }}>
                            <strong>{item.title}</strong>
                            {item.description && (
                              <div style={styles.muted}>
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "14px 10px" }}>
                            {item.category || "Other"}
                          </td>
                          <td style={{ padding: "14px 10px" }}>
                            {item.type}
                          </td>
                          <td
                            style={{
                              padding: "14px 10px",
                              whiteSpace: "nowrap",
                              color:
                                item.type === "income" ? "#12a875" : "#e5484d",
                            }}
                          >
                            {money(item.amount)}
                          </td>
                          <td style={{ padding: "14px 10px" }}>
                            <button
                              onClick={() =>
                                handleDeleteTransaction(item._id || item.id)
                              }
                              aria-label={`Delete ${item.title}`}
                              style={{
                                ...styles.button,
                                padding: "8px",
                                background: "#fff0f0",
                                color: "#d92d20",
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}

        {page === "budgets" && <Budgets />}

        {page === "reports" && (
          <section style={styles.panel}>
            <h3 style={{ marginTop: 0 }}>Expense Report</h3>
            <p style={styles.muted}>
              Review your income, expenses, and category totals.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "15px",
                margin: "20px 0",
              }}
            >
              <div>
                <p style={styles.muted}>Income</p>
                <h2 style={{ color: "#12a875" }}>{money(income)}</h2>
              </div>
              <div>
                <p style={styles.muted}>Expenses</p>
                <h2 style={{ color: "#e5484d" }}>{money(expenses)}</h2>
              </div>
              <div>
                <p style={styles.muted}>Balance</p>
                <h2>{money(balance)}</h2>
              </div>
            </div>

            <h4>Category Breakdown</h4>

            {categoryTotals.length === 0 ? (
              <p style={styles.muted}>No expense data available yet.</p>
            ) : (
              categoryTotals.map((item) => (
                <div
                  key={item.name}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "12px 0",
                    borderBottom: "1px solid #edf0f5",
                  }}
                >
                  <span>{item.name}</span>
                  <strong>{money(item.value)}</strong>
                </div>
              ))
            )}

            <button
              onClick={exportCSV}
              style={{
                ...styles.button,
                background: "#635bff",
                color: "#fff",
                marginTop: "22px",
              }}
            >
              Export Transactions to CSV
            </button>
          </section>
        )}

        {loading && page !== "transactions" && (
          <p style={styles.muted}>Refreshing transaction data...</p>
        )}
      </main>
    </div>
  );
}