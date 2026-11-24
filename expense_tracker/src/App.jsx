import { useState } from 'react'
import Dashboard from './components/Dashboard'
import Addbudget from './components/Addbudget'
import AddExpense from './components/Addexpense'
import Editexpense from './components/Editexpense'
import Auth from './components/Auth'
import { useExpenses } from './context/ExpenseContext'


function App() {
  const { user, loading } = useExpenses()
  const [view,setView]= useState("dashboard")
  const [editID,setEditID]= useState(null)

  const goHome = ()=> setView("dashboard")
  const handleEdit = (id)=>{
    setEditID(id);
    setView("edit");
  }

  if (loading) return null
  if (!user) return <Auth />

  return (
    <>
     {view === "dashboard" && (
      <Dashboard onNavigate={setView} onEdit={handleEdit}/>
     )}
     {view === "budget" && <Addbudget onDone={goHome}/>}
     {view === "add" && <AddExpense onDone={goHome}/>}
     {view === "edit"&& <Editexpense id={editID} onDone={goHome}/>}
    </>
  )
}

export default App
