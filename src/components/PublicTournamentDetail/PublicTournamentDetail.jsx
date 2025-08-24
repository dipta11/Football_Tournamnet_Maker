import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useParams, useNavigate } from "react-router-dom";
import "./PublicTournamentDetail.css";

// Reuse the MatchCard component from TournamentDetail
const MatchCard = ({ match, showScores = false }) => {
  const [score, setScore] = useState({ team1: 0, team2: 0, tiebreak1: 0, tiebreak2: 0 });
  const [loadingScore, setLoadingScore] = useState(showScores);

  useEffect(() => {
    if (showScores && match.status === 'finished') {
      fetchMatchScore();
    }
  }, [match, showScores]);

  const fetchMatchScore = async () => {
    try {
      setLoadingScore(true);
      
      // Fetch all goals for this match, including goal_type
      const { data: goalsData, error: goalsError } = await supabase
        .from('goal')
        .select('*')
        .eq('m_id', match.m_id);
      
      if (goalsError) {
        console.error('Goals error:', goalsError);
        throw goalsError;
      }
      
      if (!goalsData || goalsData.length === 0) {
        setScore({ team1: 0, team2: 0, tiebreak1: 0, tiebreak2: 0 });
        setLoadingScore(false);
        return;
      }
      
      // Get all player IDs from all goals
      const allPlayerIds = goalsData.map(goal => goal.p_id);
      
      // Fetch team information for all players in this tournament
      const { data: playersInTeamData, error: playersError } = await supabase
        .from('players_in_team')
        .select('p_id, team_id')
        .eq('t_id', match.t_id)
        .in('p_id', allPlayerIds);
      
      if (playersError) {
        console.error('Players in team error:', playersError);
        throw playersError;
      }
      
      // Create a mapping of player ID to team ID
      const playerTeamMap = {};
      playersInTeamData.forEach(item => {
        playerTeamMap[item.p_id] = item.team_id;
      });
      
      // Count onfield goals for each team
      let team1Goals = 0;
      let team2Goals = 0;
      
      // Count tiebreak goals for each team
      let tiebreak1Goals = 0;
      let tiebreak2Goals = 0;
      
      goalsData.forEach(goal => {
        const teamId = playerTeamMap[goal.p_id];
        
        if (goal.goal_type === 'onfield') {
          if (teamId === match.team1_id) {
            team1Goals++;
          } else if (teamId === match.team2_id) {
            team2Goals++;
          }
        } else if (goal.goal_type === 'tiebreak') {
          if (teamId === match.team1_id) {
            tiebreak1Goals++;
          } else if (teamId === match.team2_id) {
            tiebreak2Goals++;
          }
        }
      });
      
      setScore({ 
        team1: team1Goals, 
        team2: team2Goals, 
        tiebreak1: tiebreak1Goals, 
        tiebreak2: tiebreak2Goals 
      });
    } catch (err) {
      console.error('Error fetching match score:', err);
      setScore({ team1: 0, team2: 0, tiebreak1: 0, tiebreak2: 0 });
    } finally {
      setLoadingScore(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className={`match-card ${match.match_type !== 'group' ? 'knockout' : ''} ${match.match_type === 'final' ? 'final' : ''}`}>
      <div className="match-header">
        <span className="match-number">Match #{match.match_no}</span>
        <span className={`match-status ${match.status}`}>{match.status}</span>
      </div>
      <div className="match-teams">
        <span className="team-name">{match.team1?.team_name || 'TBD'}</span>
        {match.status === 'finished' ? (
          loadingScore ? (
            <span className="vs">Loading...</span>
          ) : (
            <div className="score-container">
              <span className="score">{score.team1} - {score.team2}</span>
              {/* Show tiebreak scores only if they exist */}
              {(score.tiebreak1 > 0 || score.tiebreak2 > 0) && (
                <span className="tiebreak-score">
                  (Penalties: {score.tiebreak1}-{score.tiebreak2})
                </span>
              )}
            </div>
          )
        ) : (
          <span className="vs">vs</span>
        )}
        <span className="team-name">{match.team2?.team_name || 'TBD'}</span>
      </div>
      <div className="match-details">
        <div className="match-time">{formatDate(match.timestamp)}</div>
        {match.venue && <div className="match-venue">{match.venue.venue_name}</div>}
      </div>
    </div>
  );
};

function PublicTournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [champion, setChampion] = useState(null);
  const [tournamentCompleted, setTournamentCompleted] = useState(false);

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  const fetchTournamentData = async () => {
    try {
      setLoading(true);

      // Fetch tournament details (only if public)
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournament')
        .select('*')
        .eq('t_id', id)
        .eq('ispublic', true)
        .single();
      
      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Fetch matches
      await fetchMatches();
      
      // Check if tournament is completed and determine champion
      await checkTournamentCompletion();
    } catch (err) {
      console.error('fetchTournamentData error', err);
      alert('Error loading tournament: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data: matchesData, error: matchesError } = await supabase
        .from('match')
        .select(`*, team1:team1_id(team_name), team2:team2_id(team_name), venue:v_id(venue_name)`)
        .eq('t_id', id)
        .order('match_no', { ascending: true });
      
      if (matchesError) throw matchesError;
      setMatches(matchesData || []);
    } catch (err) {
      console.error('fetchMatches error', err);
    }
  };

  const checkTournamentCompletion = async () => {
    try {
      // Check if all matches are finished
      const { data: unfinishedMatches, error } = await supabase
        .from('match')
        .select('m_id')
        .eq('t_id', id)
        .neq('status', 'finished');
      
      if (error) throw error;
      
      if (unfinishedMatches.length === 0) {
        setTournamentCompleted(true);
        // Find the final match to determine champion
        const finalMatch = matches.find(m => m.match_type === 'final');
        if (finalMatch) {
          await determineChampion(finalMatch);
        }
      }
    } catch (err) {
      console.error('Error checking tournament completion:', err);
    }
  };

  const determineChampion = async (finalMatch) => {
    try {
      // Fetch all goals for the final match
      const { data: goalsData, error: goalsError } = await supabase
        .from('goal')
        .select('*')
        .eq('m_id', finalMatch.m_id);
      
      if (goalsError) throw goalsError;
      
      if (!goalsData || goalsData.length === 0) {
        return;
      }
      
      // Get all player IDs from all goals
      const allPlayerIds = goalsData.map(goal => goal.p_id);
      
      // Fetch team information for all players in this tournament
      const { data: playersInTeamData, error: playersError } = await supabase
        .from('players_in_team')
        .select('p_id, team_id')
        .eq('t_id', finalMatch.t_id)
        .in('p_id', allPlayerIds);
      
      if (playersError) throw playersError;
      
      // Create a mapping of player ID to team ID
      const playerTeamMap = {};
      playersInTeamData.forEach(item => {
        playerTeamMap[item.p_id] = item.team_id;
      });
      
      // Count onfield goals for each team
      let team1Goals = 0;
      let team2Goals = 0;
      
      // Count tiebreak goals for each team
      let tiebreak1Goals = 0;
      let tiebreak2Goals = 0;
      
      goalsData.forEach(goal => {
        const teamId = playerTeamMap[goal.p_id];
        
        if (goal.goal_type === 'onfield') {
          if (teamId === finalMatch.team1_id) {
            team1Goals++;
          } else if (teamId === finalMatch.team2_id) {
            team2Goals++;
          }
        } else if (goal.goal_type === 'tiebreak') {
          if (teamId === finalMatch.team1_id) {
            tiebreak1Goals++;
          } else if (teamId === finalMatch.team2_id) {
            tiebreak2Goals++;
          }
        }
      });
      
      // Determine the winner
      let winnerId = null;
      
      // First check onfield goals
      if (team1Goals > team2Goals) {
        winnerId = finalMatch.team1_id;
      } else if (team2Goals > team1Goals) {
        winnerId = finalMatch.team2_id;
      } else {
        // If onfield goals are tied, check tiebreak goals
        if (tiebreak1Goals > tiebreak2Goals) {
          winnerId = finalMatch.team1_id;
        } else if (tiebreak2Goals > tiebreak1Goals) {
          winnerId = finalMatch.team2_id;
        }
      }
      
      // Set the champion if we found a winner
      if (winnerId) {
        // Fetch the winning team's name
        const { data: winnerTeam, error: teamError } = await supabase
          .from('team')
          .select('team_name')
          .eq('team_id', winnerId)
          .single();
        
        if (!teamError && winnerTeam) {
          setChampion({ id: winnerId, name: winnerTeam.team_name });
        }
      }
    } catch (err) {
      console.error('Error determining champion:', err);
    }
  };

  if (loading) return <div className="loading">Loading tournament details...</div>;
  if (!tournament) return <div>Tournament not found or not public</div>;

  return (
    <div className="public-tournament-detail-page">
      <div className="public-tournament-detail-container">
        <div className="header-section">
          <button className="back-btn" onClick={() => navigate('/public-tournaments')}>← Back to Public Tournaments</button>
          <h1>{tournament.t_name}</h1>
          {tournamentCompleted && champion && (
            <div className="champion-banner">
              <h2>Tournament Champion: {champion.name}</h2>
            </div>
          )}
        </div>

        <div className="tournament-info">
          <div className="info-item">
           
           
          </div>
          <div className="info-item">
            <span className="label">Start Date:</span>
            <span className="value">{new Date(tournament.start_date).toLocaleDateString()}</span>
          </div>
          <div className="info-item">
            <span className="label">End Date:</span>
            <span className="value">{new Date(tournament.end_date).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="fixture-section">
          <h2>Tournament Fixture</h2>
          {matches.length === 0 ? (
            <div className="empty-state">
              <p>No matches scheduled yet for this tournament.</p>
            </div>
          ) : (
            <div className="matches-list">
              {["group", "quarterfinal", "semifinal", "final", "thirdplace"].map(type => {
                const typeMatches = matches.filter(m => m.match_type === type);
                if (typeMatches.length === 0) return null;
                
                return (
                  <div key={type} className="match-type-section">
                    <h3>
                      {type === 'group' ? 'Group Stage' : 
                       type === 'quarterfinal' ? 'Quarter Finals' :
                       type === 'semifinal' ? 'Semi Finals' :
                       type === 'final' ? 'Final Match' : 'Third Place Playoff'}
                    </h3>
                    <div className="matches-grid">
                      {typeMatches.map(match => (
                        <MatchCard 
                          key={match.m_id} 
                          match={match} 
                          showScores={true}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PublicTournamentDetail;