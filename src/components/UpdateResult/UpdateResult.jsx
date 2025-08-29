import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { useNavigate, useParams } from "react-router-dom";
import "./UpdateResult.css";

// ---------------- MyTournaments ----------------
export function MyTournaments() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      fetchTournaments(user.id);
    };
    getUser();
  }, [navigate]);

  const fetchTournaments = async (userId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("tournament")
        .select("*")
        .eq("u_id", userId);
      if (error) throw error;
      setTournaments(data || []);
    } catch (err) {
      console.error(err);
      alert("Error loading tournaments: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const goToTournament = (tournamentId) => navigate(`/tournament/${tournamentId}`);
  const goToUpdateResult = (tournamentId) => navigate(`/tournament/${tournamentId}/update-result`);

  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) return <div className="loading">Loading tournaments...</div>;

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
            <p>You haven't created any tournaments yet. Create your first tournament to get started!</p>
            <button className="btn-primary" onClick={() => navigate("/create-tournament")}>
              Create Tournament
            </button>
          </div>
        ) : (
          <div className="tournaments-grid">
            {tournaments.map((tournament) => (
              <div key={tournament.t_id} className="tournament-card">
                <div className="tournament-header">
                  <h3>{tournament.t_name}</h3>
                  <span className={`status-badge ${tournament.status}`}>{tournament.status}</span>
                </div>
                <div className="tournament-dates">
                  <p><strong>Start:</strong> {formatDate(tournament.start_date)}</p>
                  <p><strong>End:</strong> {formatDate(tournament.end_date)}</p>
                </div>
                <div className="tournament-footer">
                  <button className="btn-primary" onClick={() => goToTournament(tournament.t_id)}>
                    Add Matches
                  </button>
                  <button className="btn-secondary" onClick={() => goToUpdateResult(tournament.t_id)}>
                    Update Match Result
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

export function UpdateMatchResult() {
  const { id } = useParams(); // tournament id
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);
  const [team1Players, setTeam1Players] = useState([]);
  const [team2Players, setTeam2Players] = useState([]);

  const [goals, setGoals] = useState([{ p_id: "", minute: "", goal_type: "onfield" }]);
  const [cards, setCards] = useState([{ p_id: "", card_type: "yellow", minute: "" }]);
  const [showTiebreaker, setShowTiebreaker] = useState(false);
  const [tiebreakerGoals, setTiebreakerGoals] = useState([{ p_id: "", minute: 120, goal_type: "tiebreak" }]);

  useEffect(() => {
    const fetchNextUnfinishedMatch = async () => {
      try {
        setLoading(true);
        const { data: [nextMatch], error } = await supabase
          .from("match")
          .select("m_id, match_no, team1_id, team2_id, team1:team1_id(team_name), team2:team2_id(team_name)")
          .eq("t_id", id)
          .neq("status", "finished")
          .order("match_no", { ascending: true })
          .limit(1);

        if (error) throw error;
        if (!nextMatch) { setMatch(null); return; }

        setMatch(nextMatch);

        const teamIds = [nextMatch.team1_id, nextMatch.team2_id].filter(Boolean);
        if (teamIds.length > 0) {
          const { data: playersData, error: pErr } = await supabase
            .from("players_in_team")
            .select("p_id, player:p_id(fullname), team_id")
            .in("team_id", teamIds);
          if (pErr) throw pErr;

          setTeam1Players(playersData.filter(p => p.team_id === nextMatch.team1_id)
            .map(p => ({ p_id: p.p_id, fullname: p.player.fullname })));

          setTeam2Players(playersData.filter(p => p.team_id === nextMatch.team2_id)
            .map(p => ({ p_id: p.p_id, fullname: p.player.fullname })));
        }
      } catch (err) {
        console.error("fetchNextUnfinishedMatch error", err);
        alert("Error fetching match: " + (err.message || String(err)));
      } finally {
        setLoading(false);
      }
    };
    fetchNextUnfinishedMatch();
  }, [id]);

  const handleGoalChange = (i, key, val) => {
    const arr = [...goals];
    arr[i][key] = val;
    setGoals(arr);
  };

  const addGoalRow = () => setGoals(prev => [...prev, { p_id: "", minute: "", goal_type: "onfield" }]);
  const removeGoalRow = (i) => setGoals(prev => prev.filter((_, idx) => idx !== i));

  const handleCardChange = (i, key, val) => {
    const arr = [...cards];
    arr[i][key] = val;
    setCards(arr);
  };

  const addCardRow = () => setCards(prev => [...prev, { p_id: "", card_type: "yellow", minute: "" }]);
  const removeCardRow = (i) => setCards(prev => prev.filter((_, idx) => idx !== i));

  const handleTiebreakerGoalChange = (i, key, val) => {
    const arr = [...tiebreakerGoals];
    arr[i][key] = val;
    setTiebreakerGoals(arr);
  };

  const addTiebreakerGoalRow = () => setTiebreakerGoals(prev => [...prev, { p_id: "", minute: 120, goal_type: "tiebreak" }]);
  const removeTiebreakerGoalRow = (i) => setTiebreakerGoals(prev => prev.filter((_, idx) => idx !== i));

  const submitResult = async (e) => {
    e.preventDefault();
    if (!match) return alert("No match to update");

    const onfieldGoalsPayload = goals.filter(g => g.p_id && g.minute)
      .map(g => ({ p_id: g.p_id, minute: Number(g.minute) || 0, goal_type: "onfield" }));

    const tiebreakerGoalsPayload = showTiebreaker ? tiebreakerGoals.filter(g => g.p_id && g.minute)
      .map(g => ({ p_id: g.p_id, minute: Number(g.minute) || 0, goal_type: "tiebreak" })) : [];

    const allGoalsPayload = [...onfieldGoalsPayload, ...tiebreakerGoalsPayload];

    const cardsPayload = cards.filter(c => c.p_id && c.minute)
      .map(c => ({ p_id: c.p_id, card_type: c.card_type, minute: Number(c.minute) || 0 }));
    
    try {
      const { error } = await supabase.rpc("create_match_result", {
        p_match_uuid: match.m_id,
        p_goals: allGoalsPayload,
        p_cards: cardsPayload
      });
      if (error) throw error;

      alert(`Result saved: ${match.team1?.team_name} vs ${match.team2?.team_name}`);
      navigate("/my-tournaments");
    } catch (err) {
      console.error("submitResult error", err);
      alert("Error recording match result: " + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  if (!match) {
    return (
      <div className="update-result-page">
        <div className="container">
          <h2>No unfinished matches</h2>
          <p>There are no unfinished matches for this tournament.</p>
          <button className="btn-primary" onClick={() => navigate(-1)}>Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="update-result-page">
      <div className="container">
        <h2>Update Result — Match {match.match_no}</h2>
        <p><strong>{match.team1?.team_name}</strong> vs <strong>{match.team2?.team_name}</strong></p>

        <form onSubmit={submitResult}>
          {/* Goals */}
          <section>
            <h3>Goals</h3>
            {goals.map((g, idx) => (
              <div key={idx} className="form-row small">
                <select value={g.p_id} onChange={e => handleGoalChange(idx, "p_id", e.target.value)}>
                  <option value="">Select Scorer</option>
                  {team1Players.map(p => <option key={p.p_id} value={p.p_id}>{p.fullname} ({match.team1?.team_name})</option>)}
                  {team2Players.map(p => <option key={p.p_id} value={p.p_id}>{p.fullname} ({match.team2?.team_name})</option>)}
                </select>
                <input 
                  type="number" 
                  placeholder="Minute" 
                  value={g.minute} 
                  onChange={e => handleGoalChange(idx, "minute", e.target.value)} 
                />
                <button type="button" onClick={() => removeGoalRow(idx)}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={addGoalRow}>Add Goal</button>
          </section>

          {/* Cards */}
          <section>
            <h3>Cards</h3>
            {cards.map((c, idx) => (
              <div key={idx} className="form-row small">
                <select value={c.p_id} onChange={e => handleCardChange(idx, "p_id", e.target.value)}>
                  <option value="">Select Player</option>
                  {team1Players.map(p => <option key={p.p_id} value={p.p_id}>{p.fullname} ({match.team1?.team_name})</option>)}
                  {team2Players.map(p => <option key={p.p_id} value={p.p_id}>{p.fullname} ({match.team2?.team_name})</option>)}
                </select>
                <select value={c.card_type} onChange={e => handleCardChange(idx, "card_type", e.target.value)}>
                  <option value="yellow">Yellow</option>
                  <option value="red">Red</option>
                </select>
                <input 
                  type="number" 
                  placeholder="Minute" 
                  value={c.minute} 
                  onChange={e => handleCardChange(idx, "minute", e.target.value)} 
                />
                <button type="button" onClick={() => removeCardRow(idx)}>Remove</button>
              </div>
            ))}
            <button type="button" onClick={addCardRow}>Add Card</button>
          </section>
          
          <div className="tiebreaker-btn-container">
            <button type="button" className="btn-secondary" onClick={() => setShowTiebreaker(!showTiebreaker)}>
              {showTiebreaker ? "Remove Tiebreaker" : "Add Tiebreaker?"}
            </button>
          </div>
          
          {showTiebreaker && (
            <section className="tiebreaker-section">
              <h3>Tiebreaker Goals</h3>
              {tiebreakerGoals.map((g, idx) => (
                <div key={idx} className="form-row small">
                  <select value={g.p_id} onChange={e => handleTiebreakerGoalChange(idx, "p_id", e.target.value)}>
                    <option value="">Select Scorer</option>
                    {team1Players.map(p => <option key={p.p_id} value={p.p_id}>{p.fullname} ({match.team1?.team_name})</option>)}
                    {team2Players.map(p => <option key={p.p_id} value={p.p_id}>{p.fullname} ({match.team2?.team_name})</option>)}
                  </select>
                  <input
                    type="number"
                    placeholder="Minute (e.g., 120)"
                    value={g.minute}
                    onChange={e => handleTiebreakerGoalChange(idx, "minute", e.target.value)}
                  />
                  <button type="button" onClick={() => removeTiebreakerGoalRow(idx)}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={addTiebreakerGoalRow}>Add Tiebreaker Goal</button>
            </section>
          )}
<div>
  <button 
    type="button" 
    onClick={() => navigate(-1)} 
    className="btn-primary" 
    style={{ marginRight: "10px" }} // gap between buttons
  >
    Cancel
  </button>

  <button className="btn-primary" type="submit">
    Submit Result & Finish Match
  </button>
</div>

        </form>
      </div>
    </div>
  );
} 