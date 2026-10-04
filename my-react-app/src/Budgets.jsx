
import { useEffect, useState } from "react";
import axios from "axios";
import { Plus, Trash2, Wallet } from "lucide-react";

const API = "http://localhost:5000/api";
const categories = [
  "Food", "Travel", "Shopping", "Bills", "Health",
  "Education", "Entertainment", "Other"
];

const currentMonth = new Date().toISOString().slice(0, 7);

const money = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value || 0);

export default function Budgets() {
  const [month, setMonth] = useState(currentMonth);
  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [category, setCategory] = useState("Food");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [budgetResponse, transactionResponse] = await Promise.all([
        axios.get(`${API}/budgets`, { params: { month } }),
        axios.get(`${API}/transactions`),
      ]);

      setBudgets(budgetResponse.data);
      setTransactions(transactionResponse.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not load budget data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [month]);

  function spentFor(categoryName) {
    return transactions
      .filter((item) => {
        const date = new Date(item.date);
        return item.type === "expense" &&
          item.category === categoryName &&
          date.getFullYear() === Number(month.slice(0, 4)) &&
          date.getMonth() + 1 === Number(month.slice(5, 7));
      })
      .reduce((total, item) => total + item.amount, 0);
  }

  async function saveBudget(event) {
    event.preventDefault();
    setError("");

    try {
      await axios.post(`${API}/budgets`, {
        category,
        amount: Number(amount),
        month,
      });
      setAmount("");
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save budget.");
    }
  }

  async function deleteBudget(id) {
    if (!window.confirm("Delete this budget?")) return;

    try {
      await axios.delete(`${API}/budgets/${id}`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete budget.");
    }
  }

  const totalBudget = budgets.reduce((sum, item) => sum + item.amount, 0);
  const totalSpent = budgets.reduce(
    (sum, item) => sum + spentFor(item.category), 0
  );

  return (
    <main className="budgets-page">
      <header className="budgets-header">
        <div>
          <p className="eyebrow">PLAN YOUR SPENDING</p>
          <h1>Budget Management</h1>
          <p className="muted">Set limits and keep your finances on track.</p>
        </div>
        <input
          aria-label="Budget month"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </header>

      {error && <div className="error-banner">{error}</div>}

      <section className="budget-summary">
        <div className="panel">
          <Wallet size={22} />
          <p className="muted">Total Budget</p>
          <h2>{money(totalBudget)}</h2>
        </div>
        <div className="panel">
          <p className="muted">Spent in Budgeted Categories</p>
          <h2>{money(totalSpent)}</h2>
        </div>
        <div className="panel">
          <p className="muted">Remaining</p>
          <h2>{money(totalBudget - totalSpent)}</h2>
        </div>
      </section>

      <section className="panel budget-create">
        <h2>Create or Update a Category Budget</h2>
        <p className="muted">Saving an existing category updates its monthly limit.</p>
        <form onSubmit={saveBudget} className="budget-form">
          <label>
            Category
            <select value={category}
              onChange={(event) => setCategory(event.target.value)}>
              {categories.map((item) =>
                <option key={item} value={item}>{item}</option>
              )}
            </select>
          </label>
          <label>
            Monthly limit (₹)
            <input type="number" min="0.01" step="0.01" required
              value={amount} onChange={(event) => setAmount(event.target.value)}
              placeholder="e.g. 5000" />
          </label>
          <button className="primary-btn" type="submit">
            <Plus size={17} /> Save Budget
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Category Budgets</h2>
            <p className="muted">Spending progress for {month}</p>
          </div>
        </div>

        {loading ? <p className="empty-state">Loading budgets...</p> :
          budgets.length === 0 ?
            <p className="empty-state">No budgets for this month yet. Create one above.</p> :
            <div className="budget-list">
              {budgets.map((budget) => {
                const spent = spentFor(budget.category);
                const percent = spent / budget.amount * 100;
                const progress = Math.min(percent, 100);

                return (
                  <article className="budget-item" key={budget._id}>
                    <div className="budget-item-heading">
                      <div>
                        <strong>{budget.category}</strong>
                        <p className="muted">
                          {money(spent)} spent of {money(budget.amount)}
                        </p>
                      </div>
                      <div className="budget-item-actions">
                        <strong className={percent > 100 ? "over-budget" : ""}>
                          {Math.round(percent)}%
                        </strong>
                        <button className="delete-btn"
                          onClick={() => deleteBudget(budget._id)}
                          aria-label={`Delete ${budget.category} budget`}>
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                    <div className="progress-track">
                      <div
                        className={`progress-fill ${percent > 100 ? "over" : ""}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className={`budget-remaining ${percent > 100 ? "over-budget" : ""}`}>
                      {percent > 100
                        ? `${money(spent - budget.amount)} over budget`
                        : `${money(budget.amount - spent)} remaining`}
                    </p>
                  </article>
                );
              })}
            </div>
        }
      </section>
    </main>
  );
}
