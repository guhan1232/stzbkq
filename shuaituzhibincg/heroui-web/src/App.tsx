import { HashRouter, Routes, Route } from 'react-router-dom'
import Login from './pages/Login'
import MainLayout from './layouts/MainLayout'
import Index from './pages/Index'
import TeamUser from './pages/TeamUser'
import LandRecords from './pages/LandRecords'
import Task from './pages/Task'
import Database from './pages/Database'
import Users from './pages/Users'
import Password from './pages/Password'
import MemberHistory from './pages/MemberHistory'
import GroupWu from './pages/GroupWu'
import Leaderboard from './pages/Leaderboard'
import PacketCapture from './pages/PacketCapture'
import ChatMessage from './pages/ChatMessage'
import Manifesto from './pages/Manifesto'
import ApiTest from './pages/ApiTest'
import IPWhitelist from './pages/IPWhitelist'
import HostCheck from './pages/HostCheck'
import AiKeyManager from './pages/AiKeyManager'
import TeamQuery from './pages/TeamQuery'
import BattlefieldStats from './pages/BattlefieldStats'
import BattlefieldRealtimeMonitor from './pages/BattlefieldRealtimeMonitor'

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Index />} />
          <Route path="password" element={<Password />} />
          <Route path="teamuser" element={<TeamUser />} />
          <Route path="memberhistory" element={<MemberHistory />} />
          <Route path="landrecords" element={<LandRecords />} />
          <Route path="task" element={<Task />} />
          <Route path="groupWu" element={<GroupWu />} />
          <Route path="database" element={<Database />} />
          <Route path="api" element={<ApiTest />} />
          <Route path="users" element={<Users />} />
          <Route path="leaderboard" element={<Leaderboard />} />
          <Route path="packet-capture" element={<PacketCapture />} />
          <Route path="chat-messages" element={<ChatMessage />} />
          <Route path="manifesto" element={<Manifesto />} />
          <Route path="ip-whitelist" element={<IPWhitelist />} />
          <Route path="host-check" element={<HostCheck />} />
          <Route path="ai-key-manager" element={<AiKeyManager />} />
          <Route path="team-query" element={<TeamQuery />} />
          <Route path="battlefield-stats" element={<BattlefieldStats />} />
          <Route path="battlefield-realtime-monitor" element={<BattlefieldRealtimeMonitor />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}

export default App