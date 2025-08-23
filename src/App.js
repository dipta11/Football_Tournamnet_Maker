import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Loginsignup from "./components/Loginsignup/Loginsignup";
import Dashboard from "./components/dashboard/dashboard";
import CreateTournament from "./components/createtournament/CreateTournament";
import AddPlayer from "./components/AddPlayer/AddPlayer";
import MyTournaments from "./components/MyTournament/MyTournament";
import TournamentDetail from "./components/TournamentDetail/TournamentDetails";
import AddVenue from "./components/Add Venue/AddVenue";
import { UpdateMatchResult } from "./components/UpdateResult/UpdateResult";

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {}
          <Route path="/" element={<Loginsignup />} />

          {}
          <Route path="/dashboard" element={<Dashboard />} />
          {}
          <Route path="/create-tournament" element={<CreateTournament />} />
          {}
          <Route path ="/add-player" element={<AddPlayer/>} />
          {}
          <Route path ="/my-tournaments" element={<MyTournaments/>} />
          {}
          <Route path = "/tournament/${tournamentId}" element={<TournamentDetail/>}  />
           {}
           <Route path="/tournament/:id" element={<TournamentDetail />} />
           {}
           <Route path= "/add-venue" element = {<AddVenue/>}/>
           {}
          <Route
          path="/tournament/:id/update-result"
          element={<UpdateMatchResult />}
        />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
