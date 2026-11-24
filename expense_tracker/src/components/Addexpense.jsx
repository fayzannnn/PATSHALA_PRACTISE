import { useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import { getLocalDateString } from "../utils/date";
import "./AddExpense.css";

function AddExpense({ onDone }) {
  const { dispatch } = useExpenses();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [date, setDate] = useState(getLocalDateString);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !category || Number(amount) <= 0) {
      setError("Enter an expense name, choose a category, and enter an amount greater than zero.");
      return;
    }

    setError("");
    try {
      await dispatch({
        type: "add_expense",
        payload: {
          id: Date.now(),
          title: title.trim(),
          amount: Number(amount),
          category,
          date,
        },
      });
      onDone();
    } catch (submitError) {
      setError(submitError.message);
    }
  };

  return (
      <div className="ae-card">
        <div className="ae-header">
          <h2 className="ae-title">Add Expense</h2>
          <button
            type="button"
            className="ae-close"
            onClick={onDone}
            aria-label="Close"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4L20 20M20 4L4 20"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <form className="ae-form" onSubmit={handleSubmit}>
          <label className="ae-label" htmlFor="expense-title">
            Expense Name<span className="ae-required">*</span>
          </label>
          <input
            id="expense-title"
            className="ae-input"
            placeholder="Expense Name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="ae-label" htmlFor="expense-category">
            Category<span className="ae-required">*</span>
          </label>
          <select
            id="expense-category"
            className={category ? "ae-input ae-select" : "ae-input ae-select ae-placeholder"}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="" disabled>
              Choose a Category
            </option>
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Shopping">Shopping</option>
            <option value="Bills">Bills</option>
            <option value="Others">Others</option>
          </select>

          <label className="ae-label" htmlFor="expense-amount">
            Amount<span className="ae-required">*</span>
          </label>
          <input
            id="expense-amount"
            className="ae-input"
            type="number"
            placeholder="Enter Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <label className="ae-label" htmlFor="expense-date">
            Date
          </label>
          <input
            id="expense-date"
            className="ae-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          {error && <p className="ae-form-error" role="alert">{error}</p>}

          <button type="submit" className="ae-submit">
            <span className="ae-plus">+</span> Add Expense
          </button>
        </form>
      </div>
  );
}

export default AddExpense;