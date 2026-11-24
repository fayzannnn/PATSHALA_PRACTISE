import { useState } from "react";
import { useExpenses } from "../context/ExpenseContext";
import "./Addbudget.css";

function Addbudget({ onDone }) {
  const { budget, dispatch } = useExpenses();
  const [value, setValue] = useState(budget || "");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || Number(value) <= 0) return;
    setError("");
    try {
      await dispatch({ type: "set_budget", payload: Number(value) });
      onDone();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <div className="modal-card">
        <div className="modal-header">
          <h2 className="modal-title">Add Budget</h2>
          <button
            type="button"
            className="modal-close"
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

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="form-label" htmlFor="budget-amount">
            Budget Amount<span className="required">*</span>
          </label>
          <input
            id="budget-amount"
            className="form-input"
            type="number"
            placeholder="Enter Budget Amount"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />

          {error && <p className="budget-form-error" role="alert">{error}</p>}

          <button type="submit" className="submit-btn">
            <span className="plus">+</span> Add Budget
          </button>
        </form>
    </div>
  );
}

export default Addbudget;