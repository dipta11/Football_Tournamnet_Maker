import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import { useParams, useNavigate } from "react-router-dom";
import "./TournamentDetails.css";
// Add this component before the TournamentDetail component
const MatchCard = ({ match, showScores = false }) => {
  const [score, setScore] = useState({ team1: 0, team2: 0, tiebreak1: 0, tiebreak2: 0 });
  const [loadingScore, setLoadingScore] = useState(showScores);

  useEffect(() => {
    if (showScores && match.status === 'finished') {
      fetchMatchScore();
    }
  }, [match, showScores]);

  useEffect(() => {
    console.log('Match data:', match);
  }, [match]);

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
      
      console.log('All goals data:', goalsData);
      
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
      
      console.log('Final onfield score:', team1Goals, '-', team2Goals);
      console.log('Tiebreak score:', tiebreak1Goals, '-', tiebreak2Goals);
      
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

// Update the MatchCard component's return statement
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

function TournamentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  // basic data
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [groups, setGroups] = useState([]);
  const [groupTeams, setGroupTeams] = useState([]);
  const [venues, setVenues] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  // stage control
  const [activeTab, setActiveTab] = useState("setup");
  const [groupStageMatchCount, setGroupStageMatchCount] = useState(0);
  const [createdGroupMatches, setCreatedGroupMatches] = useState(0);
  const [knockoutMatchCount, setKnockoutMatchCount] = useState(0);
  const [createdKnockoutMatches, setCreatedKnockoutMatches] = useState(0);
  const [groupStageCompleted, setGroupStageCompleted] = useState(false);
  const [tournamentCompleted, setTournamentCompleted] = useState(false);
  const [champion, setChampion] = useState(null);

  // standings cache
  const [groupStandings, setGroupStandings] = useState({});

  // form states common
  const [matchType, setMatchType] = useState("group");
  const [selectedGroup, setSelectedGroup] = useState("");
  const [team1, setTeam1] = useState("");
  const [team2, setTeam2] = useState("");
  const [matchTime, setMatchTime] = useState("");
  const [selectedVenue, setSelectedVenue] = useState("");
  const [knockoutType, setKnockoutType] = useState("quarterfinal");

  // knockout source UI states (for each team we allow selecting source type)
  const [team1SourceKind, setTeam1SourceKind] = useState("group"); // 'group' or 'match'
  const [team2SourceKind, setTeam2SourceKind] = useState("group");

  // group source choices
  const [team1SourceGroup, setTeam1SourceGroup] = useState("");
  const [team1SourcePosition, setTeam1SourcePosition] = useState(1);
  const [team2SourceGroup, setTeam2SourceGroup] = useState("");
  const [team2SourcePosition, setTeam2SourcePosition] = useState(1);

  // match source choices
  const [pastKnockoutMatches, setPastKnockoutMatches] = useState([]); // {match_no, m_id, status}
  const [team1SourceMatchNo, setTeam1SourceMatchNo] = useState(null);
  const [team1SourceMatchSide, setTeam1SourceMatchSide] = useState("winner"); // winner|loser
  const [team2SourceMatchNo, setTeam2SourceMatchNo] = useState(null);
  const [team2SourceMatchSide, setTeam2SourceMatchSide] = useState("winner");

  // UI helpers
  const [positionsForGroup, setPositionsForGroup] = useState({}); // {groupName: numberOfTeams}
  const [knockoutSetupCompleted, setKnockoutSetupCompleted] = useState(false);
  

  useEffect(() => {
    fetchTournamentData();
  }, [id]);

  useEffect(() => {
    const pk = (matches || []).filter(m => m.match_type && m.match_type !== 'group')
      .map(m => ({ match_no: Number(m.match_no), m_id: m.m_id, status: m.status }));
    setPastKnockoutMatches(pk.sort((a,b)=>a.match_no-b.match_no));
    setCreatedKnockoutMatches(pk.length);
  }, [matches]);

  useEffect(() => {
    if (activeTab === 'group-matches') {
      setMatchType('group');
    } else if (activeTab === 'knockout-matches') {
      setMatchType('knockout');
    }
  }, [activeTab]);


  
useEffect(() => {
  // Check if knockout setup was completed in a previous session
  const savedKnockoutCount = localStorage.getItem(`tournament_${id}_knockout_count`);
  const savedKnockoutCompleted = localStorage.getItem(`tournament_${id}_knockout_setup_completed`);
  
  if (savedKnockoutCount) {
    setKnockoutMatchCount(parseInt(savedKnockoutCount));
  }
  
  if (savedKnockoutCompleted === 'true') {
    setKnockoutSetupCompleted(true);
  }
  
  fetchTournamentData();
}, [id]);

useEffect(() => {
  // Check if tournament is completed and determine champion
  if (matches.length > 0 && knockoutMatchCount > 0 && createdKnockoutMatches >= knockoutMatchCount) {
    const allMatchesFinished = matches.every(match => match.status === 'finished');
    if (allMatchesFinished) {
      setTournamentCompleted(true);
      
      // Find the final match
      const finalMatch = matches.find(m => m.match_type === 'final' && m.status === 'finished');
      if (finalMatch) {
        // Determine the winner based on actual match results
        determineChampion(finalMatch);
      }
    }
  }
}, [matches, knockoutMatchCount, createdKnockoutMatches, teams]);

const determineChampion = async (finalMatch) => {
  try {
    // Fetch all goals for the final match
    const { data: goalsData, error: goalsError } = await supabase
      .from('goal')
      .select('*')
      .eq('m_id', finalMatch.m_id);
    
    if (goalsError) throw goalsError;
    
    if (!goalsData || goalsData.length === 0) {
      // No goals, can't determine winner
      console.error('No goals found for final match');
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
      } else {
        // If still tied, it's a draw (shouldn't happen in a final)
        console.error('Final match ended in a draw');
      }
    }
    
    // Set the champion
    if (winnerId) {
      const winner = teams.find(t => t.id === winnerId);
      if (winner) setChampion(winner);
    }
  } catch (err) {
    console.error('Error determining champion:', err);
  }
};
const fetchTournamentData = async () => {
  try {
    setLoading(true);

    // tournament
    const { data: tournamentData, error: tournamentError } = await supabase
      .from('tournament')
      .select('*')
      .eq('t_id', id)
      .single();
    if (tournamentError) throw tournamentError;
    setTournament(tournamentData);

    // teams
    const { data: teamsData, error: teamsError } = await supabase
      .from('teams_in_tournament')
      .select(`team_id, team:team_id(team_name)`)
      .eq('t_id', id);
    if (teamsError) throw teamsError;
    setTeams((teamsData || []).map(item => ({ id: item.team_id, name: item.team.team_name })));

    // groups
    const { data: groupsData, error: groupsError } = await supabase
      .from('group')
      .select('group_name')
      .eq('t_id', id);
    if (groupsError) throw groupsError;
    const gnames = (groupsData || []).map(x => x.group_name);
    setGroups(gnames);

    // venues
    const { data: venuesData, error: venuesError } = await supabase
      .from('venue')
      .select('v_id, venue_name');
    if (venuesError) throw venuesError;
    setVenues(venuesData || []);

    // matches and standings
    await fetchMatches();
    await fetchGroupStandingsForAllGroups(gnames);

    // group stage completion flag (rpc)
    const { data: completedData, error: completedError } = await supabase
      .rpc('is_group_stage_completed', { tournament_uuid: id });
    if (!completedError) {
      setGroupStageCompleted(Boolean(completedData));
      
      // Determine which tab to show based on current state
      if (completedData) {
        // Check if knockout setup is already completed
        const isKnockoutSetupCompleted = localStorage.getItem(`tournament_${id}_knockout_setup_completed`) === 'true';
        
        if (isKnockoutSetupCompleted) {
          setActiveTab('knockout-matches');
        } else {
          setActiveTab('knockout-setup');
        }
      }
    }

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

      const groupMatches = (matchesData || []).filter(m => m.match_type === 'group');
      setCreatedGroupMatches(groupMatches.length);

    } catch (err) {
      console.error('fetchMatches error', err);
    }
  };

  const fetchGroupStandingsForAllGroups = async (groupNames) => {
    try {
      const standings = {};
      const positions = {};
      for (const g of groupNames) {
        const { data, error } = await supabase
          .from('group_standings')
          .select('position, team_id')
          .eq('t_id', id)
          .eq('group_name', g)
          .order('position', { ascending: true });
        if (!error && data) {
          standings[g] = data.map(row => ({ position: Number(row.position), team_id: row.team_id }));
          positions[g] = data.length;
        } else {
          standings[g] = [];
          // fallback: count TeamsInGroup
          const { data: teamCount } = await supabase
            .from('TeamsInGroup')
            .select('team_id', { count: 'exact' })
            .eq('t_id', id)
            .eq('group_name', g);
          positions[g] = teamCount ? teamCount.length : 0;
        }
      }
      setGroupStandings(standings);
      setPositionsForGroup(positions);
    } catch (err) {
      console.error('fetchGroupStandingsForAllGroups error', err);
    }
  };

  // ---------- Helpers to resolve sources via RPC ----------
  const resolveSourceToTeam = async (sourceString) => {
    if (!sourceString) return null;
    try {
      const { data, error } = await supabase.rpc('resolve_source_to_team', { tournament_uuid: id, source: sourceString });
      if (error) {
        console.error('resolveSourceToTeam rpc error', error);
        return null;
      }
      return data; // uuid or null
    } catch (err) {
      console.error('resolveSourceToTeam unexpected', err);
      return null;
    }
  };

  const getNextMatchNo = async () => {
    try {
      const { data, error } = await supabase.rpc('get_next_match_no', { tournament_uuid: id });
      if (error) throw error;
      return Number(data || 1);
    } catch (err) {
      console.error('getNextMatchNo error', err);
      return null;
    }
  };

  // ---------- Event handlers ----------
  const handleGroupChange = async (e) => {
    const g = e.target.value;
    setSelectedGroup(g);
    if (!g) {
      setGroupTeams([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('TeamsInGroup')
        .select('team_id, team:team_id(team_name)')
        .eq('t_id', id)
        .eq('group_name', g);
      if (error) throw error;
      setGroupTeams((data || []).map(it => ({ id: it.team_id, name: it.team.team_name })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMatch = async (e) => {
    e.preventDefault();

    if (matchType === 'group') {
      if (!selectedGroup || !team1 || !team2 || !matchTime) {
        alert('Please fill all fields');
        return;
      }
      if (team1 === team2) { alert('Team1 and Team2 cannot be same'); return; }

      try {
        const match_no = await getNextMatchNo();
        const { error } = await supabase.from('match').insert([{
          t_id: id,
          team1_id: team1,
          team2_id: team2,
          timestamp: matchTime || null,
          v_id: selectedVenue || null,
          status: 'notfinished',
          match_type: 'group',
          match_no
        }]);
        if (error) throw error;
        alert('Group match created');
        setTeam1(''); setTeam2(''); setMatchTime(''); setSelectedVenue(''); setSelectedGroup(''); setGroupTeams([]);
        await fetchMatches();
        
        // Check if all group matches are created
        if (createdGroupMatches + 1 >= groupStageMatchCount) {
          setActiveTab('knockout-setup');
        }
        
        return;
      } catch (err) {
        console.error(err);
        alert('Error creating group match: ' + err.message);
        return;
      }
    }

    if (matchType === 'knockout') {
      // Additional validation for knockout matches
      if (team1SourceKind === 'match' && team1SourceMatchNo === null) {
        alert('Please select a match for Team 1');
        return;
      }
      if (team2SourceKind === 'match' && team2SourceMatchNo === null) {
        alert('Please select a match for Team 2');
        return;
      }
      
      // Check if we've reached the maximum knockout matches
      if (createdKnockoutMatches >= knockoutMatchCount) {
        alert('You have created all scheduled knockout matches');
        return;
      }
      
      // Resolve team IDs first
      let team1Id = null, team2Id = null;

      if (team1SourceKind === 'group') {
        const t = getTeamByGroupPosition(team1SourceGroup, team1SourcePosition);
        if (!t?.team_id) { alert('Team 1 could not be resolved'); return; }
        team1Id = t.team_id;
      } else {
        team1Id = await resolveSourceToTeam(`match_${team1SourceMatchNo}_${team1SourceMatchSide}`);
        if (!team1Id) { alert('Team 1 could not be resolved from match'); return; }
      }

      if (team2SourceKind === 'group') {
        const t = getTeamByGroupPosition(team2SourceGroup, team2SourcePosition);
        if (!t?.team_id) { alert('Team 2 could not be resolved'); return; }
        team2Id = t.team_id;
      } else {
        team2Id = await resolveSourceToTeam(`match_${team2SourceMatchNo}_${team2SourceMatchSide}`);
        if (!team2Id) { alert('Team 2 could not be resolved from match'); return; }
      }

      if (!team1Id || !team2Id) { alert('Please select valid teams'); return; }
      if (team1Id === team2Id) { alert('Team 1 and Team 2 cannot be the same'); return; }
      if (!matchTime) { alert('Please fill match date/time'); return; }

      try {
        const match_no = await getNextMatchNo();
        const { error } = await supabase.from('match').insert([{
          t_id: id,
          team1_id: team1Id,
          team2_id: team2Id,
          timestamp: matchTime || null,
          v_id: selectedVenue || null,
          status: 'notfinished',
          match_type: knockoutType,
          match_no
        }]);
        if (error) throw error;
        alert('Knockout match created');

        // Reset fields
        setTeam1SourceKind('group'); setTeam2SourceKind('group');
        setTeam1SourceGroup(''); setTeam1SourcePosition(1);
        setTeam2SourceGroup(''); setTeam2SourcePosition(1);
        setTeam1SourceMatchNo(null); setTeam1SourceMatchSide('winner');
        setTeam2SourceMatchNo(null); setTeam2SourceMatchSide('winner');
        setMatchTime(''); setSelectedVenue('');
        await fetchMatches();
      } catch (err) {
        console.error(err);
        alert('Error creating knockout match: ' + err.message);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBD';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // ----------------- JSX -----------------
  if (loading) return <div className="loading">Loading tournament details...</div>;
  if (!tournament) return <div>Tournament not found</div>;

  // helpers for knockout UI
  const getPositionsFor = (g) => {
    const n = positionsForGroup[g] || (groupStandings[g] ? groupStandings[g].length : 0) || 0;
    return Array.from({length: Math.max(n,1)}, (_,i) => i+1);
  };

  const getTeamByGroupPosition = (group, position) => {
    if (!group || !position) return null;
    const gs = groupStandings[group] || [];
    const team = gs.find(t => t.position === position);
    if (!team) return null;
    const name = teams.find(t => t.id === team.team_id)?.name || "TBD";
    return { team_id: team.team_id, name };
  };

  return (
    <div className="tournament-detail-page">
      <div className="tournament-detail-container">
        <div className="header-section">
          <button className="back-btn" onClick={() => navigate('/my-tournaments')}>← Back to My Tournaments</button>
          <h1>{tournament.t_name}</h1>
          {tournamentCompleted && champion && (
            <div className="champion-banner">
              <h2>Tournament Champion: {champion.name}</h2>
            </div>
          )}
        </div>

       <div className="tabs">
  <button className={activeTab === 'setup' ? 'active' : ''} onClick={() => setActiveTab('setup')}>Tournament Setup</button>
  <button className={activeTab === 'group-matches' ? 'active' : ''} onClick={() => setActiveTab('group-matches')} disabled={groupStageMatchCount === 0}>Group Matches ({createdGroupMatches}/{groupStageMatchCount})</button>
  <button className={activeTab === 'knockout-setup' ? 'active' : ''} onClick={() => setActiveTab('knockout-setup')} disabled={!groupStageCompleted || knockoutSetupCompleted}>Knockout Setup</button>
  <button className={activeTab === 'knockout-matches' ? 'active' : ''} onClick={() => setActiveTab('knockout-matches')} disabled={!groupStageCompleted || !knockoutSetupCompleted}>Knockout Matches ({createdKnockoutMatches}/{knockoutMatchCount})</button>
  <button className={activeTab === 'fixture' ? 'active' : ''} onClick={() => setActiveTab('fixture')}>View Fixture</button>
</div>

        {activeTab === 'setup' && (
          <div className="tournament-setup">
            <h2>Tournament Setup</h2>
            <div className="form-group">
              <label>Number of Group Stage Matches:</label>
              <input type="number" min="0" value={groupStageMatchCount} onChange={(e)=>setGroupStageMatchCount(parseInt(e.target.value)||0)} />
              <p className="field-note">Based on your {groups.length} groups with {teams.length / (groups.length||1)} teams each, we recommend {groups.length * (teams.length / (groups.length||1)) * ((teams.length / (groups.length||1)) - 1) / 2} matches (round-robin).</p>
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('group-matches')} disabled={groupStageMatchCount<=0}>Proceed to Group Matches</button>
          </div>
        )}

        {activeTab === 'group-matches' && (
          <div className="fixture-creation">
            <h2>Create Group Stage Matches ({createdGroupMatches}/{groupStageMatchCount})</h2>
            {createdGroupMatches >= groupStageMatchCount ? (
              <div className="completion-message">
                <p>All group matches have been created. You can now proceed to knockout setup.</p>
                <button className="btn-primary" onClick={() => setActiveTab('knockout-setup')}>
                  Proceed to Knockout Setup
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateMatch}>
                <input type="hidden" value="group" onChange={()=>setMatchType('group')} />
                <div className="form-group">
                  <label>Group:</label>
                  <select value={selectedGroup} onChange={handleGroupChange} required>
                    <option value="">Select Group</option>
                    {groups.map(g=> <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Team 1:</label>
                    <select value={team1} onChange={(e)=>setTeam1(e.target.value)} disabled={!selectedGroup} required>
                      <option value="">Select Team 1</option>
                      {groupTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Team 2:</label>
                    <select value={team2} onChange={(e)=>setTeam2(e.target.value)} disabled={!selectedGroup} required>
                      <option value="">Select Team 2</option>
                      {groupTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group"><label>Match Date & Time:</label><input type="datetime-local" value={matchTime} onChange={(e)=>setMatchTime(e.target.value)} required /></div>
                  <div className="form-group"><label>Venue:</label><select value={selectedVenue} onChange={(e)=>setSelectedVenue(e.target.value)}><option value="">Select Venue (Optional)</option>{venues.map(v=> <option key={v.v_id} value={v.v_id}>{v.venue_name}</option>)}</select></div>
                </div>

                <button type="submit" className="btn-primary" disabled={!selectedGroup || !team1 || !team2 || !matchTime}>Create Match</button>
              </form>
            )}
          </div>
        )}
{activeTab === 'knockout-setup' && (
  <div className="knockout-setup">
    <h2>Knockout Stage Setup</h2>
    <div className="form-group">
      <label>Number of Knockout Matches:</label>
      <input 
        type="number" 
        min="0" 
        value={knockoutMatchCount} 
        onChange={(e) => setKnockoutMatchCount(parseInt(e.target.value) || 0)} 
      />
      <p className="field-note">You can create these matches over multiple sessions. The system will remember how many you've created.</p>
    </div>
    <button className="btn-primary" onClick={() => {
      // Save to localStorage
      localStorage.setItem(`tournament_${id}_knockout_count`, knockoutMatchCount.toString());
      localStorage.setItem(`tournament_${id}_knockout_setup_completed`, 'true');
      
      setKnockoutSetupCompleted(true);
      setActiveTab('knockout-matches');
    }} disabled={knockoutMatchCount <= 0}>
      Proceed to Knockout Matches
    </button>
  </div>
)}
        {activeTab === 'knockout-matches' && (
          <div className="knockout-creation">
            <h2>Create Knockout Matches ({createdKnockoutMatches}/{knockoutMatchCount})</h2>
            {createdKnockoutMatches >= knockoutMatchCount ? (
              <div className="completion-message">
                <p>All knockout matches have been created. The tournament can now proceed.</p>
                {tournamentCompleted && champion && (
                  <div className="champion-announcement">
                    <h3>Tournament Champion: {champion.name}</h3>
                  </div>
                )}
              </div>
            ) : (
              <form onSubmit={handleCreateMatch}>
                <div className="form-group">
                  <label>Knockout Type:</label>
                  <select value={knockoutType} onChange={(e) => setKnockoutType(e.target.value)}>
                    <option value="quarterfinal">Quarter Final</option>
                    <option value="semifinal">Semi Final</option>
                    <option value="final">Final</option>
                    <option value="thirdplace">Third Place</option>
                  </select>
                </div>

                <h3>Team 1 Source</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Source Kind:</label>
                    <select value={team1SourceKind} onChange={(e) => setTeam1SourceKind(e.target.value)}>
                      <option value="group">From Group Standing</option>
                      <option value="match">From Previous Knockout Match</option>
                    </select>
                  </div>

                  {team1SourceKind === 'group' && (
                    <>
                      <div className="form-group">
                        <label>Group:</label>
                        <select value={team1SourceGroup} onChange={(e) => setTeam1SourceGroup(e.target.value)}>
                          <option value="">Select Group</option>
                          {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Position:</label>
                        <select value={team1SourcePosition} onChange={(e) => setTeam1SourcePosition(Number(e.target.value))}>
                          {getPositionsFor(team1SourceGroup).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>

                      {team1SourceGroup && team1SourcePosition && (
                        <div className="selected-team-display">
                          Selected Team 1: {getTeamByGroupPosition(team1SourceGroup, team1SourcePosition)?.name || "TBD"}
                        </div>
                      )}
                    </>
                  )}

                  {team1SourceKind === 'match' && (
                    <>
                      <div className="form-group">
                        <label>Match No:</label>
                        <select value={team1SourceMatchNo || ''} onChange={(e) => {
                          const value = e.target.value;
                          setTeam1SourceMatchNo(value === '' ? null : Number(value));
                        }}>
                          <option value="">Select Previous Match</option>
                          {pastKnockoutMatches.map(m => <option key={m.match_no} value={m.match_no}>{m.match_no} ({m.status})</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Side:</label>
                        <select value={team1SourceMatchSide} onChange={(e) => setTeam1SourceMatchSide(e.target.value)}>
                          <option value="winner">Winner</option>
                          <option value="loser">Loser</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <hr />

                <h3>Team 2 Source</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label>Source Kind:</label>
                    <select value={team2SourceKind} onChange={(e) => setTeam2SourceKind(e.target.value)}>
                      <option value="group">From Group Standing</option>
                      <option value="match">From Previous Knockout Match</option>
                    </select>
                  </div>

                  {team2SourceKind === 'group' && (
                    <>
                      <div className="form-group">
                        <label>Group:</label>
                        <select value={team2SourceGroup} onChange={(e) => setTeam2SourceGroup(e.target.value)}>
                          <option value="">Select Group</option>
                          {groups.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Position:</label>
                        <select value={team2SourcePosition} onChange={(e) => setTeam2SourcePosition(Number(e.target.value))}>
                          {getPositionsFor(team2SourceGroup).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>

                      {team2SourceGroup && team2SourcePosition && (
                        <div className="selected-team-display">
                          Selected Team 2: {getTeamByGroupPosition(team2SourceGroup, team2SourcePosition)?.name || "TBD"}
                        </div>
                      )}
                    </>
                  )}

                  {team2SourceKind === 'match' && (
                    <>
                      <div className="form-group">
                        <label>Match No:</label>
                        <select value={team2SourceMatchNo || ''} onChange={(e) => {
                          const value = e.target.value;
                          setTeam2SourceMatchNo(value === '' ? null : Number(value));
                        }}>
                          <option value="">Select Previous Match</option>
                          {pastKnockoutMatches.map(m => <option key={m.match_no} value={m.match_no}>{m.match_no} ({m.status})</option>)}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Side:</label>
                        <select value={team2SourceMatchSide} onChange={(e) => setTeam2SourceMatchSide(e.target.value)}>
                          <option value="winner">Winner</option>
                          <option value="loser">Loser</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Match Date & Time:</label>
                    <input type="datetime-local" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} required />
                  </div>
                  <div className="form-group">
                    <label>Venue:</label>
                    <select value={selectedVenue} onChange={(e) => setSelectedVenue(e.target.value)}>
                      <option value="">Select Venue (Optional)</option>
                      {venues.map(v => <option key={v.v_id} value={v.v_id}>{v.venue_name}</option>)}
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-primary"
                  disabled={
                    !((team1SourceKind==='group'?(team1SourceGroup && team1SourcePosition):(team1SourceMatchNo !== null)) &&
                      (team2SourceKind==='group'?(team2SourceGroup && team2SourcePosition):(team2SourceMatchNo !== null)) &&
                      matchTime
                    ) || createdKnockoutMatches >= knockoutMatchCount
                  }
                >
                  Create Knockout Match
                </button>
              </form>
            )}
          </div>
        )}

{activeTab === 'fixture' && (
  <div className="fixture-view">
    <div className="fixture-header">
      <h2>Tournament Fixture</h2>
      <div className="legend">
        <div className="legend-item">
          <span className="status-indicator finished"></span>
          <span>Completed</span>
        </div>
        <div className="legend-item">
          <span className="status-indicator notfinished"></span>
          <span>Upcoming</span>
        </div>
      </div>
    </div>
    
    {matches.length === 0 ? (
      <div className="empty-state">
        <div className="empty-icon">📅</div>
        <h3>No Matches Scheduled</h3>
        <p>Create matches using the other tabs to build your tournament fixture.</p>
      </div>
    ) : (
      <div className="fixture-container">
        {["group", "quarterfinal", "semifinal", "final", "thirdplace"].map(type => {
          const typeMatches = matches.filter(m => m.match_type === type);
          if (typeMatches.length === 0) return null;
          
          return (
            <div key={type} className="match-type-section">
              <div className="section-header">
                <h3>
                  {type === 'group' ? 'Group Stage' : 
                   type === 'quarterfinal' ? 'Quarter Finals' :
                   type === 'semifinal' ? 'Semi Finals' :
                   type === 'final' ? 'Final Match' : 'Third Place Playoff'}
                </h3>
                <span className="match-count">{typeMatches.length} match{typeMatches.length !== 1 ? 'es' : ''}</span>
              </div>
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
)}

      </div>
    </div>
  );
}

export default TournamentDetail;