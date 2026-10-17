import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { MasterLayout } from './components/layout/MasterLayout'
import { LoginPage } from './pages/LoginPage'
import { PortalDashboard } from './pages/PortalDashboard'
import { GlobalSettingsPage } from './pages/GlobalSettingsPage'

import { PmsQueryProvider } from './Systems/PMS/queryClient'

// H3MS System Pages
import { PmsDashboardPage } from './Systems/PMS/pages/PmsDashboardPage'
import { PmsBookingsPage } from './Systems/PMS/pages/PmsBookingsPage'
import { PmsMenuFinalizePage } from './Systems/PMS/pages/PmsMenuFinalizePage'
import { PmsMenuChatbotPage } from './Systems/PMS/pages/PmsMenuChatbotPage'
import { PmsWhatsappPage } from './Systems/PMS/pages/PmsWhatsappPage'
import { PmsKitchenPrepPage } from './Systems/PMS/pages/PmsKitchenPrepPage'
import { PmsTagPrintPage } from './Systems/PMS/pages/PmsTagPrintPage'
import { PmsDressPage } from './Systems/PMS/pages/PmsDressPage'
import { PmsDecorPage } from './Systems/PMS/pages/PmsDecorPage'
import { PmsCrockeryListPage } from './Systems/PMS/pages/PmsCrockeryListPage'
import { PmsKitchenRawMtlPage } from './Systems/PMS/pages/PmsKitchenRawMtlPage'
import { PmsVegetablesPage } from './Systems/PMS/pages/PmsVegetablesPage'
import { PmsCheeseDairyPage } from './Systems/PMS/pages/PmsCheeseDairyPage'
import { PmsVendorCoordinationPage } from './Systems/PMS/pages/PmsVendorCoordinationPage'
import { PmsBakeryPage } from './Systems/PMS/pages/PmsBakeryPage'
import { PmsIceWaterPage } from './Systems/PMS/pages/PmsIceWaterPage'
import { PmsLoadingBoysPage } from './Systems/PMS/pages/PmsLoadingBoysPage'
import { PmsVehiclePage } from './Systems/PMS/pages/PmsVehiclePage'
import { PmsGasCylinderPage } from './Systems/PMS/pages/PmsGasCylinderPage'
import { PmsFreshFlowersPage } from './Systems/PMS/pages/PmsFreshFlowersPage'
import { PmsWaitersPage } from './Systems/PMS/pages/PmsWaitersPage'
import { PmsOutsourcingPage } from './Systems/PMS/pages/PmsOutsourcingPage'
import { PmsMastersPage } from './Systems/PMS/pages/PmsMastersPage'
import { PmsNotificationsPage } from './Systems/PMS/pages/PmsNotificationsPage'

// Crockery & Cutlery (IMS) Pages
import { CrockeryDashboardPage } from './Systems/Crockery/pages/CrockeryDashboardPage'
import { CrockeryStockPage } from './Systems/Crockery/pages/CrockeryStockPage'
import { CrockeryInventoryPage } from './Systems/Crockery/pages/CrockeryInventoryPage'
import { CrockeryMasterPage } from './Systems/Crockery/pages/CrockeryMasterPage'

// HRMS System Pages
import { HrmsAttendancePage } from './Systems/HRMS/pages/HrmsAttendancePage'
import { HrmsDirectoryPage } from './Systems/HRMS/pages/HrmsDirectoryPage'
import { HrmsPerformancePage } from './Systems/HRMS/pages/HrmsPerformancePage'
import { HrmsAdvancesPage } from './Systems/HRMS/pages/HrmsAdvancesPage'
import { HrmsApprovalPage } from './Systems/HRMS/pages/HrmsApprovalPage'
import { HrmsOvertimePage } from './Systems/HRMS/pages/HrmsOvertimePage'
import { HrmsPayrollPage } from './Systems/HRMS/pages/HrmsPayrollPage'

// Root index redirect based on auth status
function IndexRedirect() {
  const { currentUser } = useAuth()
  if (currentUser) {
    return <Navigate to="/dashboard" replace />
  }
  return <Navigate to="/login" replace />
}

export function App() {
  return (
    <PmsQueryProvider>
      <AuthProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Root redirect */}
          <Route path="/" element={<IndexRedirect />} />

          {/* Authenticated Layout Routes */}
          <Route
            element={
              <ProtectedRoute>
                <MasterLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<PortalDashboard />} />
            
            {/* Admin Only Route */}
            <Route
              path="/global-settings"
              element={
                <ProtectedRoute adminOnly>
                  <GlobalSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* H3MS System Routes */}
            <Route path="/pms" element={<Navigate to="/pms/dashboard" replace />} />
            <Route
              path="/pms/dashboard"
              element={
                <ProtectedRoute system="pms" page="dashboard">
                  <PmsDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/bookings"
              element={
                <ProtectedRoute system="pms" page="bookings">
                  <PmsBookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/menu-finalize"
              element={
                <ProtectedRoute system="pms" page="menuFinalize">
                  <PmsMenuFinalizePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/menu-chatbot"
              element={
                <ProtectedRoute system="pms" page="menuChatbot">
                  <PmsMenuChatbotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/whatsapp"
              element={
                <ProtectedRoute system="pms" page="whatsapp">
                  <PmsWhatsappPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/kitchen-preparation"
              element={
                <ProtectedRoute system="pms" page="chef">
                  <PmsKitchenPrepPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/chef" element={<Navigate to="/pms/kitchen-preparation" replace />} />
            <Route path="/pms/inform-to-chef" element={<Navigate to="/pms/kitchen-preparation" replace />} />
            <Route
              path="/pms/tag-print"
              element={
                <ProtectedRoute system="pms" page="tagPrints">
                  <PmsTagPrintPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/tag-prints" element={<Navigate to="/pms/tag-print" replace />} />
            <Route
              path="/pms/dress"
              element={
                <ProtectedRoute system="pms" page="dress">
                  <PmsDressPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/decor-list"
              element={
                <ProtectedRoute system="pms" page="decor">
                  <PmsDecorPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/decor" element={<Navigate to="/pms/decor-list" replace />} />
            <Route
              path="/pms/crockery-list"
              element={
                <ProtectedRoute system="pms" page="crockery">
                  <PmsCrockeryListPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/crockery" element={<Navigate to="/pms/crockery-list" replace />} />
            <Route
              path="/pms/menu-kitchen-requirement"
              element={
                <ProtectedRoute system="pms" page="kitchenRawMaterial">
                  <PmsKitchenRawMtlPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/kitchen-raw-material" element={<Navigate to="/pms/menu-kitchen-requirement" replace />} />
            <Route path="/pms/kitchen-raw-mtl" element={<Navigate to="/pms/menu-kitchen-requirement" replace />} />
            <Route
              path="/pms/vegetables"
              element={
                <ProtectedRoute system="pms" page="vegetables">
                  <PmsVegetablesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/cheese-dairy-products"
              element={
                <ProtectedRoute system="pms" page="cheeseDairy">
                  <PmsCheeseDairyPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/cheese-dairy" element={<Navigate to="/pms/cheese-dairy-products" replace />} />
            <Route
              path="/pms/vendor-coordination"
              element={
                <ProtectedRoute system="pms" page="vendorOrders">
                  <PmsVendorCoordinationPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/vendor-orders" element={<Navigate to="/pms/vendor-coordination" replace />} />
            <Route
              path="/pms/bakery"
              element={
                <ProtectedRoute system="pms" page="bakery">
                  <PmsBakeryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/ice-water-requirement"
              element={
                <ProtectedRoute system="pms" page="iceWaterRequirement">
                  <PmsIceWaterPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/ice-water" element={<Navigate to="/pms/ice-water-requirement" replace />} />
            <Route
              path="/pms/loading-boys-aunties"
              element={
                <ProtectedRoute system="pms" page="loadingBoysAunties">
                  <PmsLoadingBoysPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/loading-boys" element={<Navigate to="/pms/loading-boys-aunties" replace />} />
            <Route
              path="/pms/vehicle-requirement"
              element={
                <ProtectedRoute system="pms" page="vehicleRequirement">
                  <PmsVehiclePage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/vehicle" element={<Navigate to="/pms/vehicle-requirement" replace />} />
            <Route
              path="/pms/gas-cylinder"
              element={
                <ProtectedRoute system="pms" page="gasCylinder">
                  <PmsGasCylinderPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/fresh-flowers"
              element={
                <ProtectedRoute system="pms" page="freshFlowers">
                  <PmsFreshFlowersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/waiters"
              element={
                <ProtectedRoute system="pms" page="waiters">
                  <PmsWaitersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/outsourcing-team"
              element={
                <ProtectedRoute system="pms" page="outsourcingTeam">
                  <PmsOutsourcingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/outsourcing" element={<Navigate to="/pms/outsourcing-team" replace />} />
            <Route
              path="/pms/masters"
              element={
                <ProtectedRoute system="pms" page="masters">
                  <PmsMastersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/pms/notifications"
              element={
                <ProtectedRoute system="pms" page="notifications">
                  <PmsNotificationsPage />
                </ProtectedRoute>
              }
            />
            <Route path="/pms/delay-logs" element={<Navigate to="/pms/notifications" replace />} />
            <Route path="/pms/settings" element={<Navigate to="/pms/notifications" replace />} />

            {/* Crockery & Cutlery (IMS) Routes */}
            <Route path="/crockery" element={<Navigate to="/crockery/dashboard" replace />} />
            <Route
              path="/crockery/dashboard"
              element={
                <ProtectedRoute system="ims" page="dashboard">
                  <CrockeryDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crockery/stock"
              element={
                <ProtectedRoute system="ims" page="stock">
                  <CrockeryStockPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crockery/inventory"
              element={
                <ProtectedRoute system="ims" page="inventory">
                  <CrockeryInventoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/crockery/master"
              element={
                <ProtectedRoute system="ims" page="master">
                  <CrockeryMasterPage />
                </ProtectedRoute>
              }
            />

            {/* HRMS System Routes */}
            <Route path="/hrms" element={<Navigate to="/hrms/attendance" replace />} />
            <Route
              path="/hrms/attendance"
              element={
                <ProtectedRoute system="hrms" page="attendance">
                  <HrmsAttendancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hrms/directory"
              element={
                <ProtectedRoute system="hrms" page="directory">
                  <HrmsDirectoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hrms/performance"
              element={
                <ProtectedRoute system="hrms" page="performance">
                  <HrmsPerformancePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hrms/advances"
              element={
                <ProtectedRoute system="hrms" page="advances">
                  <HrmsAdvancesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hrms/approval"
              element={
                <ProtectedRoute system="hrms" page="approval">
                  <HrmsApprovalPage />
                </ProtectedRoute>
              }
            />
            <Route path="/hrms/approvals" element={<Navigate to="/hrms/approval" replace />} />
            <Route
              path="/hrms/overtime"
              element={
                <ProtectedRoute system="hrms" page="overtime">
                  <HrmsOvertimePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hrms/payroll"
              element={
                <ProtectedRoute system="hrms" page="payroll">
                  <HrmsPayrollPage />
                </ProtectedRoute>
              }
            />

            {/* Backwards compatibility redirects for old Crockery routes */}
            <Route path="/dashboard/admin" element={<Navigate to="/crockery/dashboard" replace />} />
            <Route path="/dashboard/stock" element={<Navigate to="/crockery/stock" replace />} />
            <Route path="/dashboard/inventory" element={<Navigate to="/crockery/inventory" replace />} />
            <Route path="/dashboard/master" element={<Navigate to="/crockery/master" replace />} />
          </Route>

          {/* Fallback Catch-all Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster position="top-right" richColors />
      </Router>
    </AuthProvider>
  </PmsQueryProvider>
)
}

export default App
