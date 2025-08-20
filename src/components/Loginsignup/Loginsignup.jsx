import React, { useState } from "react";
import "./loginsignup.css";
import { supabase } from "../../supabaseClient";
import user_icon from "../assets/user.png";
import email_icon from "../assets/business.png";
import password_icon from "../assets/locked-computer.png";
import { useNavigate } from "react-router-dom";

const Loginsignup = () => {
  const [action, setAction] = useState("Login"); 
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const navigate = useNavigate(); 

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      alert("Password must be at least 6 characters");
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        emailRedirectTo: "http://localhost:3000", 
      },
    });

    if (error) {
      alert(error.message);
      return;
    }

    const user = data.user;

    if (user) {
      const { error: insertError } = await supabase
        .from("user")
        .insert([
          {
            id: user.id, 
            fullname: name,
            email: email,
          },
        ]);

      if (insertError) {
        alert(insertError.message);
        return;
      }
    }

    alert("Signup successful! Please confirm your email before logging in.");

    setName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAction("Login");
  };

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Enter both email and password");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert(`Login successful! Welcome ${data.user.email}`);
    setEmail("");
    setPassword("");

  
    navigate("/dashboard", { state: { user: data.user } });
  };

  return (
    <div className="container">
      <div className="title">Tournament Maker</div>
      <div className="header">
        <div
          className={`tab ${action === "Login" ? "active" : ""}`}
          onClick={() => setAction("Login")}
        >
          Login
        </div>
        <div
          className={`tab ${action === "Sign Up" ? "active" : ""}`}
          onClick={() => setAction("Sign Up")}
        >
          Create an account
        </div>
      </div>

      <div className="inputs">
        {action === "Sign Up" && (
          <div className="input">
            <img src={user_icon} alt="" />
            <input
              type="text"
              placeholder="Full Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        )}

        <div className="input">
          <img src={email_icon} alt="" />
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="input">
          <img src={password_icon} alt="" />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {action === "Sign Up" && (
          <div className="input">
            <img src={password_icon} alt="" />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        )}
      </div>

      {action === "Login" && (
        <div className="forgot-password">
          Lost Password? <span> Click Here </span>
        </div>
      )}

      <div className="submit-container">
        {action === "Sign Up" ? (
          <div className="submit" onClick={handleSignUp}>
            Sign Up
          </div>
        ) : (
          <div className="submit" onClick={handleLogin}>
            Login
          </div>
        )}
      </div>
    </div>
  );
};

export default Loginsignup;
