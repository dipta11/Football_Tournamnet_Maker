import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./MyTournament.css";

function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      fetchTournaments(user.id);
    };

    getUser();
  }, [navigate]);

  const fetchTournaments = async (userId) => {
    try {
      const { data, error } = await supabase
        .from("tournament")
        .select("*")
        .eq("u_id", userId);

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
      alert("Error loading tournaments: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return <div className="loading">Loading tournaments...</div>;
  }

  return (
    <div className="my-tournaments-page">
      <div className="my-tournaments-container">
        <div className="header-section">
          <h1>My Tournaments</h1>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>

        {tournaments.length === 0 ? (
          <div className="empty-state">
            <h2>No tournaments yet</h2>
            <p>
              You haven't created any tournaments yet. Create your first
              tournament to get started!
            </p>
            <button
              className="btn-primary"
              onClick={() => navigate("/create-tournament")}
            >
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="tournaments-grid">
            {tournaments.map((tournament) => (
              <div key={tournament.t_id} className="tournament-card">
                <div className="tournament-header">
                  <h3>{tournament.t_name}</h3>
                  <span className={`status-badge ${tournament.status}`}>
                    {tournament.status}
                  </span>
                </div>

                <div className="tournament-dates">
                  <p>
                    <strong>Start:</strong> {formatDate(tournament.start_date)}
                  </p>
                  <p>
                    <strong>End:</strong> {formatDate(tournament.end_date)}
                  </p>
                </div>

                <div className="tournament-footer">
                  {/* Button 1: Add Matches → Tournament detail page */}
                  <button
                    className="btn-primary"
                    onClick={() => navigate(`/tournament/${tournament.t_id}`)}
                  >
                    Add Matches
                  </button>

                  {/* Button 2: Update Results → New page */}
                  <button
                    className="btn-secondary"
                    onClick={() =>
                      navigate(`/tournament/${tournament.t_id}/update-result`)
                    }
                  >
                    Update Match Results
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyTournaments;
