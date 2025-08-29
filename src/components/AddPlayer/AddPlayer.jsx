import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./AddPlayer.css";

function AddPlayer() {
  const [fullname, setFullname] = useState("");
  const [position, setPosition] = useState("");
  const [age, setAge] = useState("");
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [addedPlayerName, setAddedPlayerName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!fullname || !position || !age) {
      alert("Please fill all fields");
      return;
    }

    try {
    
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not logged in");

      const { error } = await supabase
        .from("player")
        .insert([
          { 
            fullname, 
            position, 
            age: parseInt(age),
          
          }
        ]);

      if (error) throw error;

      
      setAddedPlayerName(fullname);
      setShowSnackbar(true);
      
    
      setFullname("");
      setPosition("");
      setAge("");
      
    
      setTimeout(() => setShowSnackbar(false), 3000);
    } catch (error) {
      console.error("Error adding player:", error);
      alert("Error adding player: " + error.message);
    }
  };

  return (
    <div className="add-player-page">
      <div className="add-player-container">
        <div className="header-section">
          <h1>Add New Player</h1>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleSubmit} className="player-form">
          <div className="form-group">
            <label htmlFor="fullname">Full Name:</label>
            <input
              type="text"
              id="fullname"
              value={fullname}
              onChange={(e) => setFullname(e.target.value)}
              placeholder="Enter player's full name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="position">Position:</label>
            <input
              type="text"
              id="position"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              placeholder="Enter player's position"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="age">Age:</label>
            <input
              type="number"
              id="age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter player's age"
              min="16"
              max="50"
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate("/dashboard")}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Player
            </button>
          </div>
        </form>

        {}
        {showSnackbar && (
          <div className="snackbar">
            <span>{addedPlayerName} was added successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddPlayer;