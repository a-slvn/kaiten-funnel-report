'use client';

import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import Pagination from '@mui/material/Pagination';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import { DrilldownDealList } from './drilldown-deal-list';
import type { FunnelStageData, FunnelDealItem, SortOrder, MetricMode } from '@/lib/types';
import { formatNumber, formatCurrencyShort } from '@/lib/format';

interface StageDrilldownProps {
  isOpen: boolean;
  stage: FunnelStageData | null;
  deals: FunnelDealItem[];
  totalDeals: number;
  sortBy: string;
  sortOrder: SortOrder;
  page: number;
  totalPages: number;
  metricMode: MetricMode;
  onClose: () => void;
  onSort: (field: string) => void;
  onPageChange: (page: number) => void;
}

export function StageDrilldown({
  isOpen,
  stage,
  deals,
  totalDeals,
  sortBy,
  sortOrder,
  page,
  totalPages,
  metricMode,
  onClose,
  onSort,
  onPageChange,
}: StageDrilldownProps) {
  if (!stage) return null;
  const isAmount = metricMode === 'amount';

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 540 },
          p: 0,
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          px: 3,
          pt: 3,
          pb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            {stage.stage_name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatNumber(totalDeals)} сделок
            {isAmount && <> · {formatCurrencyShort(stage.total_amount)}</>}
            {stage.board_name && (
              <Box component="span" sx={{ ml: 1, opacity: 0.7 }}>
                · {stage.board_name}
              </Box>
            )}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Divider />

      {/* Deal list */}
      <Box sx={{ px: 3, py: 2, flex: 1, overflowY: 'auto' }}>
        <DrilldownDealList
          deals={deals}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
          metricMode={metricMode}
        />
      </Box>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid rgba(0,0,0,0.08)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Pagination
            count={totalPages}
            page={page}
            onChange={(_e, p) => onPageChange(p)}
            size="small"
            shape="rounded"
            color="primary"
          />
        </Box>
      )}
    </Drawer>
  );
}
