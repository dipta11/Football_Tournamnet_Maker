import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./AddVenue.css";

function AddVenue() {
  const [venue_name, setvenue_name] = useState("");
  const [location, setlocation] = useState("");
  const [capacity, setcapacity] = useState("");
  const [showSnackbar, setShowSnackbar] = useState(false);
  const [addedVenueName, setAddedVenueName] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!venue_name|| !location || !capacity) {
      alert("Please fill all fields");
      return;
    }

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not logged in");

      // Insert player into database - Supabase will automatically generate UUID
      const { error } = await supabase
        .from("venue")
        .insert([
          { 
            venue_name, 
            location, 
            capacity: parseInt(capacity),
          
          }
        ]);

      if (error) throw error;

      // Show success notification
      setAddedVenueName(venue_name);
      setShowSnackbar(true);
      
      // Reset form
      setvenue_name("");
      setlocation("");
      setcapacity("");
      
      // Hide snackbar after 3 seconds
      setTimeout(() => setShowSnackbar(false), 3000);
    } catch (error) {
      console.error("Error adding player:", error);
      alert("Error adding player: " + error.message);
    }
  };

  return (
    <div className="add-venue-page">
      <div className="add-venue-container">
        <div className="header-section">
          <h1>Add New Venue</h1>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>

        <form onSubmit={handleSubmit} className="venue-form">
          <div className="form-group">
            <label htmlFor="venue_name">Venue Name:</label>
            <input
              type="text"
              id="venue_name"
              value={venue_name}
              onChange={(e) => setvenue_name(e.target.value)}
              placeholder="Enter venue name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">location:</label>
            <input
              type="text"
              id="location"
              value={location}
              onChange={(e) => setlocation(e.target.value)}
              placeholder= "Enter location"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="capacity">capacity:</label>
            <input
              type="number"
              id="capacity"
              value={capacity}
              onChange={(e) => setcapacity(e.target.value)}
              placeholder="Enter capacity"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => navigate("/dashboard")}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Venue
            </button>
          </div>
        </form>

        {/* Snackbar Notification */}
        {showSnackbar && (
          <div className="snackbar">
            <span>{addedVenueName} was added successfully!</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default AddVenue;