import "./layout.scss";
import Navbar from "../../components/navbar/Navbar"
import { Navigate, Outlet } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import Footer from "../../components/Footer/footer";

 function Layout(){
    return(
        <div className="layout">
            <div className="navbar">
                <Navbar/>
            </div>
            <div className="content">
                <Outlet/>
            </div>
        </div>
    );
 }

 function RequireAuth(){
    const {currentUser} = useContext(AuthContext)

    //useEffect(()=>{
    //    if(!currentUser){<Navigate to="/login"/>}
        //if(!user){return<Navigate to="/login"/>}
    //})
    return !currentUser ? (
         <Navigate to="/login"/> 
    ): (
        <div className="layout">
            <div className="navbar">
                <Navbar/>
            </div>
            <div className="content">
                <Outlet/>
            </div>
            
            
        </div>
        
    );
 }

 export  {Layout, RequireAuth}