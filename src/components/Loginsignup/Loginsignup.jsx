import React, {useState} from 'react'
import './loginsignup.css';
import user_icon from '../assets/user.png';
import email_icon from '../assets/business.png';
import password_icon from '../assets/locked-computer.png';

const Loginsignup = () => {
    const [action,setAction] = useState("Login");
    return (
        <div className='container'>
            <div className="header">
                <div className="text"> {action} </div>
                <div className="underline" > </div>
            </div>
            <div className="inputs">
                {action=="Login"?<div></div> :
                 <div className="input">
                    <img src={user_icon} alt="" />
                    <input type="text"  placeholder = "Name"/>
                </div> }
               
                <div className="input">
                    <input type = "text" placeholder = "fullname">
                    </input>
                </div>    

                <div className="input">
                    <img src={email_icon} alt="" />
                    <input type="email" placeholder = "Email id" />
                </div>

                <div className="input">
                    <img src={password_icon} alt="" />
                    <input type="password" placeholder = "Password" />
                </div>
            </div>
            {action=="Sign Up"? <div></div>:  <div className="forgot-password">Lost Password? <span> Click Here </span></div> }
          
              <div className = "submit-container">
                <div className={action == "Login"?"submit gray":"submit"} onClick={()=>setAction("Sign Up")}> SignUp </div>
                <div className={action=="Sign Up"?"submit gray":"submit"} onClick={()=>setAction("Login")}> Login </div>
              </div>
        </div>

    )
}
export default Loginsignup