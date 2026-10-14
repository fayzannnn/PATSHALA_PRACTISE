
import Dashboard from "./component/Dashboard"
import Login from "./component/Login"
import Profile from "./component/Profile"
import UserContextprovider from "./context/UserContextprovider"


function App() {
 

  return (
    <UserContextprovider>
   <h1>fayzan with context api</h1>
   <Login/>
   <Profile/>
   <Dashboard/>
    </UserContextprovider>
  )
}

export default App
