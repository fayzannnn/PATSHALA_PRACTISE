import { createContext, useContext, useReducer, useEffect } from "react";

const ExpenseContext = createContext(null)

const STORAGE_KEY = "expense-tracker-state";

function recentDate(dayOffset) {
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    return date.toISOString().slice(0, 10);
}

const demoState = {
    budget: 50000,
    expenses: [
        { id: 1, title: "Monthly rent", amount: 18000, category: "Bills", date: recentDate(2) },
        { id: 2, title: "Grocery shopping", amount: 3200, category: "Food", date: recentDate(4) },
        { id: 3, title: "Metro pass", amount: 1450, category: "Travel", date: recentDate(7) },
        { id: 4, title: "Internet bill", amount: 999, category: "Bills", date: recentDate(9) },
        { id: 5, title: "Dinner with friends", amount: 2400, category: "Food", date: recentDate(12) },
        { id: 6, title: "New headphones", amount: 4800, category: "Shopping", date: recentDate(15) },
        { id: 7, title: "Fuel", amount: 2200, category: "Travel", date: recentDate(18) },
        { id: 8, title: "Movie night", amount: 1050, category: "Others", date: recentDate(21) },
    ],
};

function loadState() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : demoState;
    } catch {
        return demoState;
    }
}

const initialState = loadState();

function reducer (state ,action){
    switch(action.type){
        case "set_budget":
            return{...state,budget: action.payload}

         case "add_expense":
            return{...state,expenses: [...state.expenses,action.payload]}
            
         case "edit_expense":
            return{
                ...state,expenses: state.expenses.map((e)=> e.id === action.payload.id ? action.payload :e)
            }   

         case "delete_expense":
            return{...state , expenses:state.expenses.filter((e)=>e.id !== action.payload)
            } 
            default:
                return state
    }
}


export function ExpenseProvider({children}){

   const [state,dispatch] = useReducer(reducer,initialState)

   useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
   }, [state]);

   const totalSpent = state.expenses.reduce(
  (sum, expense) => sum + Number(expense.amount || 0),
  0
);
   const remaining = state.budget - totalSpent;


   const value = {
    budget:state.budget,
    expenses :state.expenses,
    totalSpent,
    remaining,
    dispatch,
   }

   return(
    <ExpenseContext.Provider value={value}>{children}</ExpenseContext.Provider>
   )
}

export function useExpenses(){
    const ctx = useContext(ExpenseContext)
    if(!ctx) throw new Error("useExpense must be used inside ExpenseProvidr")
        return ctx
}