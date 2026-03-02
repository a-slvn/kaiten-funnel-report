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
  '#d8d2ce',
  '#d7dee8',
  '#d6e4de',
  '#e1d7ea',
  '#e8ddd4',
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
  const closedDeals = useMemo(
    () => manager.deals.filter((deal) => deal.outcome === 'won' || deal.outcome === 'lost'),
    [manager.deals],
  );

  return (
    <Box>
      {/* Manager summary row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 2.5,
          py: 2.5,
          px: 0,
          flexWrap: 'wrap',
        }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            bgcolor: avatarColor,
            color: '#2f2a27',
            fontSize: '1rem',
            fontWeight: 700,
            flexShrink: 0,
          }}
        >
          {initials}
        </Avatar>

        <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontWeight: 500, fontSize: '1rem', lineHeight: 1.25 }}>
            {manager.full_name}
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: { xs: 2, md: 5 },
            flexWrap: 'wrap',
            color: '#444',
          }}
        >
          <Typography sx={{ fontSize: '0.9375rem' }}>
            сделок: <Box component="span" sx={{ fontWeight: 700 }}>{manager.total}</Box>
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem' }}>
            оплачено: <Box component="span" sx={{ fontWeight: 700 }}>{manager.won}</Box>
          </Typography>
          <Typography sx={{ fontSize: '0.9375rem' }}>
            потеряно: <Box component="span" sx={{ fontWeight: 700 }}>{manager.lost}</Box>
          </Typography>
        </Box>

        {closedDeals.length > 0 && (
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
              color: '#444',
              fontSize: '0.9375rem',
              fontWeight: 400,
              p: 0,
              ml: 'auto',
              '&:hover': { color: '#1f1f1f' },
            }}
          >
            Подробнее:
            {expanded ? (
              <ExpandLessIcon sx={{ fontSize: 18 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 18 }} />
            )}
          </Box>
        )}
      </Box>

      {/* Expanded deal list */}
      <Collapse in={expanded && closedDeals.length > 0}>
        <Box sx={{ pb: 1 }}>
          {closedDeals.map((deal) => {
            const isWon = deal.outcome === 'won';
            return (
              <Box
                key={`${deal.card_id}-${deal.entered_at}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  minWidth: 0,
                  py: 2,
                  pl: { xs: 0, md: 6.5 },
                  borderTop: '1px solid rgba(0,0,0,0.08)',
                  flexWrap: 'wrap',
                }}
              >
                <Typography
                  sx={{
                    flex: '1 1 240px',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: '#444',
                    fontSize: '0.9375rem',
                  }}
                >
                  {deal.card_title}
                </Typography>

                {metricMode === 'amount' && deal.deal_amount != null && (
                  <Chip
                    label={formatCurrencyShort(deal.deal_amount)}
                    sx={{
                      bgcolor: '#b06ccc',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      height: 40,
                      borderRadius: '10px',
                      flexShrink: 0,
                      '& .MuiChip-label': {
                        px: 2,
                      },
                    }}
                  />
                )}

                <Chip
                  label={isWon ? 'оплачено' : 'потеряно'}
                  sx={{
                    ml: 'auto',
                    bgcolor: isWon ? '#68b357' : '#e4573d',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.8125rem',
                    height: 40,
                    borderRadius: '999px',
                    flexShrink: 0,
                    textTransform: 'lowercase',
                    '& .MuiChip-label': {
                      px: 2,
                    },
                  }}
                />
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
      <Typography sx={{ fontWeight: 500, fontSize: '1.875rem', lineHeight: 1.15, mb: 2.5 }}>
        По сотрудникам
      </Typography>

      {managers.map((manager) => (
        <ManagerRow key={manager.id} manager={manager} metricMode={metricMode} />
      ))}
    </Box>
  );
}
