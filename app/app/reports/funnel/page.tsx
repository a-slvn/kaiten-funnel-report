import { ScenarioProvider } from '@/lib/scenario-context';
import { FunnelReport } from '@/components/funnel/funnel-report';

export default function FunnelReportPage() {
  return (
    <ScenarioProvider>
      <FunnelReport />
    </ScenarioProvider>
  );
}
