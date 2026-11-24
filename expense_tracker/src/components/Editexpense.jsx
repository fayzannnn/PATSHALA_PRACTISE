import { useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import { getLocalDateString } from "../utils/date";
import "./Editexpense.css";

function Editexpense({ id, onDone }) {
  const { expenses, dispatch } = useExpenses();
  const expense = expenses.find((e) => e.id === id);

  const [title, setTitle] = useState(expense?.title ?? "");
  const [amount, setAmount] = useState(expense?.amount ?? "");
  const [category, setCategory] = useState(expense?.category ?? "Food");
  const [date, setDate] = useState(expense?.date ?? getLocalDateString());

  if (!expense) return <p>Expense not Found </p>;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || Number(amount) <= 0) return;

    dispatch({
      type: "edit_expense",
      payload: { id, title: title.trim(), amount: Number(amount), category, date },
    });
    onDone();
  };

  return (
    <div className="ee-overlay">
      <div className="ee-card">
        <div className="ee-header">
          <h2 className="ee-title">Edit Expense</h2>
          <button
            type="button"
            className="ee-close"
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

        <form className="ee-form" onSubmit={handleSubmit}>
          <label className="ee-label" htmlFor="edit-title">
            Expense Name<span className="ee-required">*</span>
          </label>
          <input
            id="edit-title"
            className="ee-input"
            placeholder="Expense Name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="ee-label" htmlFor="edit-category">
            Category<span className="ee-required">*</span>
          </label>
          <select
            id="edit-category"
            className="ee-input ee-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="Food">Food</option>
            <option value="Travel">Travel</option>
            <option value="Shopping">Shopping</option>
            <option value="Bills">Bills</option>
            <option value="Others">Others</option>
          </select>

          <label className="ee-label" htmlFor="edit-amount">
            Amount<span className="ee-required">*</span>
          </label>
          <input
            id="edit-amount"
            className="ee-input"
            type="number"
            placeholder="Enter Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <label className="ee-label" htmlFor="edit-date">
            Date
          </label>
          <input
            id="edit-date"
            className="ee-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <button type="submit" className="ee-submit">
            Update Expense
          </button>
        </form>
      </div>
    </div>
  );
}

export default Editexpense;