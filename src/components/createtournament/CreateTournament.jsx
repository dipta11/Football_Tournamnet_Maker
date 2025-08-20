import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import "./CreateTournament.css";

function CreateTournament() {
  const [step, setStep] = useState(1);
  const [tournamentName, setTournamentName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [numGroups, setNumGroups] = useState(1);
  const [groupNames, setGroupNames] = useState([]);
  const [teamsPerGroup, setTeamsPerGroup] = useState(1);
  const [groupTeams, setGroupTeams] = useState({});
  
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

  const handleConfirm = async () => {
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
          u_id: user.id
        }])
        .select()
        .single();
      if (tError) throw tError;

      const t_id = tournament.t_id;

      for (let gName of groupNames) {
        const { error: gError } = await supabase
          .from("group")
          .insert([{ group_name: gName, t_id }]);
        if (gError) throw gError;
      }

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

          await supabase
            .from("teams_in_tournament")
            .insert([{ team_id, t_id, win: 0, loss: 0, draw: 0 }]);

          await supabase
            .from("TeamsInGroup")
            .insert([{ team_id, group_name: gName, t_id }]);
        }
      }

      alert("Tournament, groups, and teams created successfully!");
      setStep(1);
      setTournamentName("");
      setStartDate("");
      setEndDate("");
      setNumGroups(1);
      setGroupNames([]);
      setTeamsPerGroup(1);
      setGroupTeams({});

    } catch (err) {
      alert(err.message);
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
              <button className="btn-primary" onClick={handleConfirm}>Confirm and Create Tournament</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreateTournament;