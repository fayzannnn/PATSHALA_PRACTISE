import {useContext} from 'react'
import UserContext from '../context/UserContext'

const Dashboard = () => {
   const {user}= useContext(UserContext)

   if(!user) return <div> waiting for user to login...!!!</div>
   
   return <div>welcome Dashboard {user.username}</div>
}

export default Dashboard
