import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import SystemHealth from './pages/SystemHealth'
import Inventory from './pages/Inventory'
import ListingDetail from './pages/ListingDetail'
import ListingEdit from './pages/ListingEdit'
import ListingReports from './pages/ListingReports'
import ConversationReports from './pages/ConversationReports'
import Users from './pages/Users'
import UserWorkspace from './pages/UserWorkspace'
import IdVerification from './pages/IdVerification'
import PricingPlans, { PlanAssignments } from './pages/Pricing'
import Categories from './pages/Categories'
import AuditLog, { EmailOutbox, PushOutbox } from './pages/Ops'
import Notifications, {
  MobileSessions,
  FeatureRequests,
  SafetyReports,
  Feedback,
} from './pages/TrustExtras'
import SuperTools from './pages/SuperTools'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="system-health" element={<SystemHealth />} />
          <Route path="audit" element={<AuditLog />} />
          <Route path="tools" element={<SuperTools />} />

          <Route path="listings" element={<Inventory />} />
          <Route path="listings/:id" element={<ListingDetail />} />
          <Route path="listings/:id/edit" element={<ListingEdit />} />
          <Route path="categories" element={<Categories />} />

          <Route path="reports/listings" element={<ListingReports />} />
          <Route path="reports/conversations" element={<ConversationReports />} />
          <Route path="reports/safety" element={<SafetyReports />} />
          <Route path="feedback" element={<Feedback />} />
          <Route path="id-verification" element={<IdVerification />} />

          <Route path="users" element={<Users />} />
          <Route path="users/:id" element={<UserWorkspace />} />
          <Route path="sessions" element={<MobileSessions />} />

          <Route path="pricing/plans" element={<PricingPlans />} />
          <Route path="pricing/assignments" element={<PlanAssignments />} />

          <Route path="outbox/email" element={<EmailOutbox />} />
          <Route path="outbox/push" element={<PushOutbox />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="feature-requests" element={<FeatureRequests />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
