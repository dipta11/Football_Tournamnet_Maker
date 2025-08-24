import React, { useState, useEffect } from "react";
import { supabase } from "../../supabaseClient";
import "./CreateTournament.css";

function CreateTournament() {
  const [step, setStep] = useState(1);
  const [tournamentName, setTournamentName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [numGroups, setNumGroups] = useState(1);
  const [groupNames, setGroupNames] = useState([]);
  const [teamsPerGroup, setTeamsPerGroup] = useState(1);
  const [groupTeams, setGroupTeams] = useState({});
  const [playersPerTeam, setPlayersPerTeam] = useState(1);
  const [teamPlayers, setTeamPlayers] = useState({});
  const [allPlayers, setAllPlayers] = useState([]);
  const [tournamentId, setTournamentId] = useState(null);
  const [createdTeams, setCreatedTeams] = useState({});

  // Fetch all players from the database
  useEffect(() => {
    const fetchPlayers = async () => {
      const { data, error } = await supabase
        .from("player")
        .select("p_id, fullname")
        .order("fullname");
      
      if (error) {
        console.error("Error fetching players:", error);
      } else {
        setAllPlayers(data);
      }
    };
    
    if (step === 5) {
      fetchPlayers();
    }
  }, [step]);

  const handleGroupNameChange = (idx, value) => {
    const updated = [...groupNames];
    updated[idx] = value;
    setGroupNames(updated);
  };

  const handleTeamChange = (group, idx, value) => {
    const updated = {...groupTeams};
    if (!updated[group]) updated[group] = [];
    updated[group][idx] = value;
    setGroupTeams(updated);
  };

  const handlePlayerChange = (teamId, idx, playerId) => {
    const updated = {...teamPlayers};
    if (!updated[teamId]) updated[teamId] = [];
    updated[teamId][idx] = playerId;
    setTeamPlayers(updated);
  };

  const createTournamentStructure = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("User not logged in");

      const { data: tournament, error: tError } = await supabase
        .from("tournament")
        .insert([{
          t_name: tournamentName,
          start_date: startDate,
          end_date: endDate,
          status: "upcoming",
          u_id: user.id,
          ispublic: isPublic
        }])
        .select()
        .single();
      if (tError) throw tError;

      const t_id = tournament.t_id;
      setTournamentId(t_id);

      for (let gName of groupNames) {
        const { error: gError } = await supabase
          .from("group")
          .insert([{ group_name: gName, t_id }]);
        if (gError) throw gError;
      }

      const teamsMap = {};
      
      for (let gName of groupNames) {
        const teams = groupTeams[gName];
        if (!teams || teams.length !== Number(teamsPerGroup)) {
          throw new Error(`Please add exactly ${teamsPerGroup} teams for group ${gName}`);
        }

        for (let teamName of teams) {
          const { data: teamData, error: teamError } = await supabase
            .from("team")
            .insert([{ team_name: teamName }])
            .select()
            .single();
          if (teamError) throw teamError;

          const team_id = teamData.team_id;
          teamsMap[teamName] = team_id;

          await supabase
            .from("teams_in_tournament")
            .insert([{ 
              t_id,
              team_id, 
              wins: 0, 
              loss: 0, 
              draw: 0, 
              matches_played: 0, 
              goals_for: 0, 
              goals_against: 0, 
              points: 0 
            }]);

          await supabase
            .from("TeamsInGroup")
            .insert([{ team_id, group_name: gName, t_id }]);
        }
      }
      
      setCreatedTeams(teamsMap);
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  };

  const assignPlayersToTeams = async () => {
    try {
      for (const [teamName, teamId] of Object.entries(createdTeams)) {
        const players = teamPlayers[teamId];

        if (!players || players.length !== Number(playersPerTeam)) {
          throw new Error(`Please assign exactly ${playersPerTeam} players for team ${teamName}`);
        }

        for (let playerId of players) {
          const { error } = await supabase
            .from("players_in_team")
            .insert([{ p_id: playerId, team_id: teamId, t_id: tournamentId }]);

          if (error) {
            throw error;
          }
        }
      }

      alert("Tournament, teams, and players created successfully!");
      return true;
    } catch (err) {
      alert(err.message);
      return false;
    }
  };

  const handleConfirmTournament = async () => {
    const success = await createTournamentStructure();
    if (success) {
      setStep(5); // Move to player assignment step
    }
  };

  const handleFinalConfirm = async () => {
    const success = await assignPlayersToTeams();
    if (success) {
      // Reset form
      setStep(1);
      setTournamentName("");
      setStartDate("");
      setEndDate("");
      setIsPublic(false);
      setNumGroups(1);
      setGroupNames([]);
      setTeamsPerGroup(1);
      setGroupTeams({});
      setPlayersPerTeam(1);
      setTeamPlayers({});
      setTournamentId(null);
      setCreatedTeams({});
    }
  };

  return (
    <div className="create-tournament-page">
      <div className="create-tournament-container">
        <h2>Create New Tournament</h2>
        
        <div className="progress-indicator">
          <div className={`progress-step ${step >= 1 ? 'active' : ''}`}>
            <span>1</span>
            <p>Basic Info</p>
          </div>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <span>2</span>
            <p>Groups</p>
          </div>
          <div className={`progress-step ${step >= 3 ? 'active' : ''}`}>
            <span>3</span>
            <p>Teams</p>
          </div>
          <div className={`progress-step ${step >= 4 ? 'active' : ''}`}>
            <span>4</span>
            <p>Review</p>
          </div>
          <div className={`progress-step ${step >= 5 ? 'active' : ''}`}>
            <span>5</span>
            <p>Players</p>
          </div>
        </div>

        {step === 1 && (
          <div className="form-step">
            <div className="form-group">
              <label>Tournament Name:</label>
              <input type="text" value={tournamentName} onChange={e => setTournamentName(e.target.value)} />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Start Date:</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="form-group">
                <label>End Date:</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="form-group">
              <label>Number of Groups:</label>
              <input type="number" min="1" value={numGroups} onChange={e => setNumGroups(e.target.value)} />
            </div>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input 
                  type="checkbox" 
                  checked={isPublic} 
                  onChange={e => setIsPublic(e.target.checked)} 
                />
                <span className="checkmark"></span>
                Make this tournament public
              </label>
              <p className="field-note">Public tournaments are visible to all users, while private tournaments are only visible to you.</p>
            </div>
            <div className="button-group">
              <button className="btn-primary" onClick={() => {
                if (!tournamentName || !startDate || !endDate) {
                  alert("Please fill all fields");
                  return;
                }
                setGroupNames(Array(Number(numGroups)).fill(""));
                setStep(2);
              }}>Next: Add Group Names</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="form-step">
            <h3>Enter Group Names:</h3>
            <div className="group-inputs">
              {groupNames.map((g, idx) => (
                <div className="form-group" key={idx}>
                  <label>Group {idx + 1}:</label>
                  <input
                    type="text"
                    placeholder={`Group ${idx + 1}`}
                    value={g}
                    onChange={e => handleGroupNameChange(idx, e.target.value)}
                  />
                </div>
              ))}
            </div>
            <div className="button-group">
              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
              <button className="btn-primary" onClick={() => {
                if (groupNames.some(g => !g.trim())) {
                  alert("Please fill all group names");
                  return;
                }
                setStep(3);
              }}>Next: Teams Per Group</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="form-step">
            <div className="form-group">
              <label>Number of Teams per Group:</label>
              <input type="number" min="1" value={teamsPerGroup} onChange={e => setTeamsPerGroup(e.target.value)} />
            </div>
            <div className="button-group">
              <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
              <button className="btn-primary" onClick={() => setStep(4)}>Next: Add Teams</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="form-step">
            <h3>Add Teams for Each Group:</h3>
            <div className="groups-container">
              {groupNames.map((gName, gIdx) => (
                <div key={gIdx} className="group-card">
                  <h4>{gName}</h4>
                  <div className="team-inputs">
                    {Array.from({length: Number(teamsPerGroup)}, (_, tIdx) => (
                      <div className="form-group" key={tIdx}>
                        <label>Team {tIdx + 1}:</label>
                        <input
                          type="text"
                          placeholder={`Team ${tIdx + 1}`}
                          value={groupTeams[gName]?.[tIdx] || ""}
                          onChange={e => handleTeamChange(gName, tIdx, e.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="button-group">
              <button className="btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn-primary" onClick={handleConfirmTournament}>Create Tournament & Add Players</button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="form-step">
            <div className="form-group">
              <label>Number of Players per Team:</label>
              <input 
                type="number" 
                min="1" 
                value={playersPerTeam} 
                onChange={e => setPlayersPerTeam(e.target.value)} 
              />
            </div>
            
            <h3>Assign Players to Teams:</h3>
            <div className="teams-container">
              {Object.entries(createdTeams).map(([teamName, teamId]) => (
                <div key={teamId} className="team-card">
                  <h4>{teamName}</h4>
                  <div className="player-inputs">
                    {Array.from({length: Number(playersPerTeam)}, (_, pIdx) => (
                      <div className="form-group" key={pIdx}>
                        <label>Player {pIdx + 1}:</label>
                        <select
                          value={teamPlayers[teamId]?.[pIdx] || ""}
                          onChange={e => handlePlayerChange(teamId, pIdx, e.target.value)}
                        >
                          <option value="">Select a player</option>
                          {allPlayers.map(player => (
                            <option key={player.p_id} value={player.p_id}>
                              {player.fullname}
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="button-group">
              <button className="btn-secondary" onClick={() => setStep(4)}>Back</button>
              <button className="btn-primary" onClick={handleFinalConfirm}>Complete Tournament Creation</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateTournament;