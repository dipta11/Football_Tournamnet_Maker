import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./PublicTournaments.css";

function PublicTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPublicTournaments();
  }, []);

  const fetchPublicTournaments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournament")
        .select("*")
        .eq("ispublic", true) 
        ;

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error("Error fetching public tournaments:", error);
      alert("Error loading public tournaments: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const viewTournamentDetails = (tournamentId) => {
    navigate(`/public-tournament/${tournamentId}`);
  };

  if (loading) {
    return <div className="loading">Loading public tournaments...</div>;
  }

  return (
    <div className="public-tournaments-page">
      <div className="public-tournaments-container">
        <div className="header-section">
          <h1>Public Tournaments</h1>
          <button className="back-btn" onClick={() => navigate("/")}>
            ← Back to Home
          </button>
        </div>

        {tournaments.length === 0 ? (
          <div className="empty-state">
            <h2>No public tournaments available</h2>
            <p>
              There are currently no public tournaments to view. Check back later!
            </p>
          </div>
        ) : (
          <div className="tournaments-grid">
            {tournaments.map((tournament) => (
              <div key={tournament.t_id} className="tournament-card">
                <div className="tournament-header">
                  <h3>{tournament.t_name}</h3>
                </div>

                <div className="tournament-dates">
                  <p>
                    <strong>Start:</strong> {formatDate(tournament.start_date)}
                  </p>
                  <p>
                    <strong>End:</strong> {formatDate(tournament.end_date)}
                  </p>
                </div>
                
                <div className="tournament-meta">
                  <span className="public-badge">Public Tournament</span>
                </div>

                <div className="tournament-footer">
                  <button
                    className="btn-primary"
                    onClick={() => viewTournamentDetails(tournament.t_id)}
                  >
                    View Tournament
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

export default PublicTournaments;