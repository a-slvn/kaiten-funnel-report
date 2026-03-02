'use client';

import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Collapse from '@mui/material/Collapse';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { FunnelDealItem, MetricMode } from '@/lib/types';
import { formatCurrencyShort } from '@/lib/format';

interface EmployeeSectionProps {
  deals: FunnelDealItem[];
  metricMode: MetricMode;
}

interface ManagerStats {
  id: number;
  full_name: string;
  total: number;
  won: number;
  lost: number;
  deals: FunnelDealItem[];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#5c6bc0',
  '#42a5f5',
  '#26a69a',
  '#66bb6a',
  '#ab47bc',
];

function getAvatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

interface ManagerRowProps {
  manager: ManagerStats;
  metricMode: MetricMode;
}

function ManagerRow({ manager, metricMode }: ManagerRowProps) {
  const [expanded, setExpanded] = useState(false);
  const initials = getInitials(manager.full_name);
  const avatarColor = getAvatarColor(manager.id);

  return (
    <Box>
      {/* Manager summary row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          py: 1.5,
          px: 0,
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            bgcolor: avatarColor,
            fontSize: '0.8125rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </Avatar>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>
            {manager.full_name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            сделок: {manager.total}&nbsp;&nbsp;
            оплачено: {manager.won}&nbsp;&nbsp;
            потеряно: {manager.lost}
          </Typography>
        </Box>

        <Box
          component="button"
          onClick={() => setExpanded(!expanded)}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'text.secondary',
            fontSize: '0.75rem',
            fontWeight: 500,
            p: 0,
            '&:hover': { color: 'text.primary' },
          }}
        >
          Подробнее:
          {expanded ? (
            <ExpandLessIcon sx={{ fontSize: 16 }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 16 }} />
          )}
        </Box>
      </Box>

      {/* Expanded deal list */}
      <Collapse in={expanded}>
        <Box sx={{ pl: 7, pb: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          {manager.deals.map((deal) => {
            const isWon = deal.outcome === 'won';
            const isLost = deal.outcome === 'lost';
            return (
              <Box
                key={`${deal.card_id}-${deal.entered_at}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  minWidth: 0,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'text.primary',
                    fontSize: '0.8125rem',
                  }}
                >
                  {deal.card_title}
                </Typography>

                {metricMode === 'amount' && deal.deal_amount != null && (
                  <Chip
                    label={formatCurrencyShort(deal.deal_amount)}
                    size="small"
                    sx={{
                      bgcolor: '#ede7f6',
                      color: '#4527a0',
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      height: 20,
                      borderRadius: '10px',
                      flexShrink: 0,
                    }}
                  />
                )}

                {(isWon || isLost) && (
                  <Chip
                    label={isWon ? 'оплачено' : 'потеряно'}
                    size="small"
                    sx={{
                      bgcolor: isWon ? '#e8f5e9' : '#fce4ec',
                      color: isWon ? '#2e7d32' : '#c62828',
                      fontWeight: 600,
                      fontSize: '0.6875rem',
                      height: 20,
                      borderRadius: '10px',
                      flexShrink: 0,
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      </Collapse>

      <Divider sx={{ opacity: 0.5 }} />
    </Box>
  );
}

export function EmployeeSection({ deals, metricMode }: EmployeeSectionProps) {
  const managers = useMemo<ManagerStats[]>(() => {
    const map = new Map<number, ManagerStats>();

    for (const deal of deals) {
      if (!deal.responsible) continue;
      const { id, full_name } = deal.responsible;

      if (!map.has(id)) {
        map.set(id, { id, full_name, total: 0, won: 0, lost: 0, deals: [] });
      }
      const m = map.get(id)!;
      m.total++;
      if (deal.outcome === 'won') m.won++;
      if (deal.outcome === 'lost') m.lost++;
      m.deals.push(deal);
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [deals]);

  if (managers.length === 0) return null;

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9375rem' }}>
          По сотрудникам
        </Typography>
        <Box sx={{ display: 'flex', gap: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
            сделок
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
            оплачено
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ minWidth: 60, textAlign: 'right' }}>
            потеряно
          </Typography>
          <Box sx={{ minWidth: 80 }} />
        </Box>
      </Box>

      <Divider sx={{ opacity: 0.5 }} />

      {managers.map((manager) => (
        <ManagerRow key={manager.id} manager={manager} metricMode={metricMode} />
      ))}
    </Box>
  );
}
