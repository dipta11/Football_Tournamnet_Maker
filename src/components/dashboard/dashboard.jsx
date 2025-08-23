import React, { useEffect, useState } from "react";
import "./dashboard.css";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [totalTournaments, setTotalTournaments] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [ongoingTournaments, setOngoingTournaments] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      
      const { data: profile, error } = await supabase
        .from("user")
        .select("fullname, email")
        .eq("id", user.id)
        .single();
        
      if (!error) {
        setUserProfile(profile);
      }
    };

    getUser();
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    const fetchStats = async () => {
      try {
        // Total tournaments for this user
        const { count: tournamentsCount, error: tournamentsError } = await supabase
          .from("tournament")
          .select("*", { count: "exact", head: true })
          .eq("u_id", user.id);

        if (!tournamentsError) {
          setTotalTournaments(tournamentsCount || 0);
        } else {
          console.error("Error fetching tournaments:", tournamentsError);
        }

        // Total players (count players in tournaments created by this user)
        const { count: playersCount, error: playersError } = await supabase
          .from("player")
          .select("*", { count: "exact", head: true })
          .eq("created_by", user.id);

        if (!playersError) {
          setTotalPlayers(playersCount || 0);
        } else {
          console.error("Error fetching players:", playersError);
        }

        // Ongoing tournaments for this user
        const { count: ongoingCount, error: ongoingError } = await supabase
          .from("tournament")
          .select("*", { count: "exact", head: true })
          .eq("u_id", user.id)
          .eq("status", "ongoing");

        if (!ongoingError) {
          setOngoingTournaments(ongoingCount || 0);
        } else {
          console.error("Error fetching ongoing tournaments:", ongoingError);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
      }
    };

    fetchStats();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  if (!user || !userProfile) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Tournament Maker</h1>
        <div className="user-info">
          <span>Welcome, {userProfile.fullname}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </header>

      <nav className="navbar">
        <div className="nav-content">
          <button className="menu-toggle" onClick={toggleMenu}>
            ☰ Menu
          </button>
          <ul className={`nav-links ${menuOpen ? 'nav-open' : ''}`}>
            <li><a href="/create-tournament">Create Tournament</a></li>
            <li><a href="/my-tournaments">My Tournaments</a></li>
            <li><a href="/add-player">Add Player</a></li>
            <li> <a href ="/add-venue"> Add Venues</a></li>
            <li><a href="/dashboard">Dashboard</a></li>
          </ul>
        </div>
      </nav>

      <div className="dashboard-content">
        <div className="user-profile-section">
          <div className="profile-header">
            <h2>Your Profile</h2>
            <div className="profile-actions">
              <button className="edit-profile-btn">Edit Profile</button>
            </div>
          </div>
          
          <div className="profile-card">
            <div className="profile-info">
              <div className="info-item">
                <span className="label">Full Name:</span>
                <span className="value">{userProfile.fullname}</span>
              </div>
              <div className="info-item">
                <span className="label">Email:</span>
                <span className="value">{userProfile.email}</span>
              </div>
              <div className="info-item">
                <span className="label">User ID:</span>
                <span className="value">{user.id.substring(0, 8)}...</span>
              </div>
              <div className="info-item">
                <span className="label">Member Since:</span>
                <span className="value">{new Date(user.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="profile-stats">
              <div className="profile-stat">
                <span className="stat-number">{totalTournaments}</span>
                <span className="stat-label">Tournaments</span>
              </div>
              <div className="profile-stat">
                <span className="stat-number">{totalPlayers}</span>
                <span className="stat-label">Players</span>
              </div>
              <div className="profile-stat">
                <span className="stat-number">{ongoingTournaments}</span>
                <span className="stat-label">Active</span>
              </div>
            </div>
          </div>
        </div>

        <h2>Your Tournament Overview</h2>
        <p className="welcome-message">Here's a summary of your tournament activity.</p>

        <div className="stats">
          <div className="stat-card">
            <h3>Your Tournaments</h3>
            <p className="stat-number">{totalTournaments}</p>
            <p className="stat-label">Total created</p>
          </div>
          <div className="stat-card">
            <h3>Your Players</h3>
            <p className="stat-number">{totalPlayers}</p>
            <p className="stat-label">Players added</p>
          </div>
          <div className="stat-card">
            <h3>Ongoing Tournaments</h3>
            <p className="stat-number">{ongoingTournaments}</p>
            <p className="stat-label">Currently active</p>
          </div>
        </div>

        <div className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-buttons">
            <a href="/create-tournament" className="action-btn">
              <span className="icon">+</span>
              <span>Create Tournament</span>
            </a>
            <a href="/add-player" className="action-btn">
              <span className="icon">+</span>
              <span>Add Player</span>
            </a>
            <a href="/my-tournaments" className="action-btn">
              <span className="icon">→</span>
              <span>View Tournaments</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;