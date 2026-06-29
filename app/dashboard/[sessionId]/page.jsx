import DashboardShell from './DashboardShell'

export default function DashboardPage({ params }) {
  return <DashboardShell sessionId={params.sessionId} />
}
