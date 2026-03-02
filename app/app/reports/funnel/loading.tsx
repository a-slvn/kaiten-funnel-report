import Skeleton from '@mui/material/Skeleton';
import Box from '@mui/material/Box';

export default function FunnelReportLoading() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box>
          <Skeleton variant="text" width={192} height={32} />
          <Skeleton variant="text" width={256} height={20} sx={{ mt: 0.5 }} />
        </Box>
        <Skeleton variant="rounded" width={128} height={36} />
      </Box>
      <Skeleton variant="rounded" width="100%" height={36} sx={{ maxWidth: 448 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' }, gap: 2 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rounded" height={112} />
        ))}
      </Box>
      <Skeleton variant="rounded" height={400} />
    </Box>
  );
}
