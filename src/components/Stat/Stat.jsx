import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate } from "react-router-dom";
import "./Stat.css";

function Stat() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/login");
        return;
      }
      setUser(user);
      fetchStats();
    };

    getUser();
  }, [navigate]);

  const fetchStats = async () => {
    try {
      // Fetch goals
      const { data: goalsData, error: goalsError } = await supabase
        .from("goal")
        .select("player(fullname), g_id");

      if (goalsError) throw goalsError;

      const goalsCount = goalsData.reduce((acc, row) => {
        const name = row.player.fullname;
        acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {});

      // Sort goals descending
      const sortedGoals = Object.entries(goalsCount).sort((a, b) => b[1] - a[1]);
      setGoals(sortedGoals);

      // Fetch tournaments per player
      const { data: tData, error: tError } = await supabase
        .from("players_in_team")
        .select("player(fullname), t_id");

      if (tError) throw tError;

      const tCount = tData.reduce((acc, row) => {
        const name = row.player.fullname;
        acc[name] = (acc[name] || new Set()).add(row.t_id);
        return acc;
      }, {});

      // Convert Set to count and sort descending
      const tournamentsPerPlayer = Object.entries(tCount)
        .map(([name, set]) => [name, set.size])
        .sort((a, b) => b[1] - a[1]);

      setTournaments(tournamentsPerPlayer);

    } catch (err) {
      console.error("Error fetching stats:", err);
      alert("Error fetching stats: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading stats...</div>;
  }

  return (
    <div className="my-tournaments-page">
      <div className="my-tournaments-container">
        <div className="header-section">
          <h1>Player Stats</h1>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>
            ← Back to Dashboard
          </button>
        </div>

        <h2>Goals per Player</h2>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Player Name</th>
              <th>Goals</th>
            </tr>
          </thead>
          <tbody>
            {goals.map(([name, count]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2>Tournaments per Player</h2>
        <table className="stats-table">
          <thead>
            <tr>
              <th>Player Name</th>
              <th>Tournaments Played</th>
            </tr>
          </thead>
          <tbody>
            {tournaments.map(([name, count]) => (
              <tr key={name}>
                <td>{name}</td>
                <td>{count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Stat;
