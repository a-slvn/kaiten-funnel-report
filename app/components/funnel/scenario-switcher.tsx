'use client';

import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import BugReportIcon from '@mui/icons-material/BugReport';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useScenario } from '@/lib/scenario-context';
import type { Scenario, ScenarioGroup } from '@/data/scenarios';

const GROUP_LABELS: Record<ScenarioGroup, string> = {
  smoke: 'Smoke',
  metric: 'Метрики',
  alerts: 'Alerts',
  edge: 'Edge-кейсы',
};

function groupScenarios(scenarios: Scenario[]) {
  return scenarios.reduce<Record<ScenarioGroup, Scenario[]>>(
    (acc, scenario) => {
      acc[scenario.group].push(scenario);
      return acc;
    },
    { smoke: [], metric: [], alerts: [], edge: [] },
  );
}

export function ScenarioSwitcher() {
  const [open, setOpen] = useState(false);
  const { scenario, setScenarioById, allScenarios } = useScenario();
  const scenariosByGroup = useMemo(() => groupScenarios(allScenarios), [allScenarios]);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 64,
        left: 16,
        zIndex: 1300,
      }}
    >
      {/* Toggle button */}
      {!open && (
        <IconButton
          onClick={() => setOpen(true)}
          sx={{
            bgcolor: '#1a1a2e',
            color: '#fff',
            width: 44,
            height: 44,
            '&:hover': { bgcolor: '#16213e' },
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          }}
        >
          <BugReportIcon fontSize="small" />
        </IconButton>
      )}

      {/* Panel */}
      <Collapse in={open}>
        <Paper
          elevation={8}
          sx={{
            width: 380,
            maxHeight: 'calc(100vh - 100px)',
            overflow: 'auto',
            borderRadius: 2,
            bgcolor: '#1a1a2e',
            color: '#e0e0e0',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: 2,
              py: 1.5,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BugReportIcon sx={{ fontSize: 18, color: '#7c4dff' }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.8125rem' }}>
                QA: Сценарии тест-кейсов
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#999' }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Scenario list */}
          <Box sx={{ p: 1 }}>
            {(Object.keys(GROUP_LABELS) as ScenarioGroup[]).map((group) => {
              const items = scenariosByGroup[group];
              if (items.length === 0) return null;

              return (
                <Box key={group} sx={{ mb: 1.25 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      px: 1,
                      py: 0.75,
                      color: '#8f8f9d',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                    }}
                  >
                    {GROUP_LABELS[group]}
                  </Typography>

                  {items.map((s) => {
                    const isActive = s.id === scenario.id;
                    return (
                      <Box
                        key={s.id}
                        onClick={() => setScenarioById(s.id)}
                        sx={{
                          p: 1.5,
                          borderRadius: 1.5,
                          cursor: 'pointer',
                          bgcolor: isActive ? 'rgba(124, 77, 255, 0.15)' : 'transparent',
                          border: isActive ? '1px solid rgba(124, 77, 255, 0.4)' : '1px solid transparent',
                          '&:hover': {
                            bgcolor: isActive ? 'rgba(124, 77, 255, 0.2)' : 'rgba(255,255,255,0.05)',
                          },
                          mb: 0.5,
                          transition: 'all 0.15s',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          {isActive && (
                            <CheckCircleOutlineIcon sx={{ fontSize: 14, color: '#7c4dff' }} />
                          )}
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: isActive ? 600 : 400,
                              fontSize: '0.8125rem',
                              color: isActive ? '#fff' : '#ccc',
                            }}
                          >
                            {s.name}
                          </Typography>
                        </Box>

                        <Typography
                          variant="caption"
                          sx={{ color: '#999', display: 'block', mb: 0.75, lineHeight: 1.35 }}
                        >
                          {s.description}
                        </Typography>

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: isActive ? 1 : 0 }}>
                          <Chip
                            label={s.testCaseRef}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.6875rem',
                              bgcolor: 'rgba(255,255,255,0.08)',
                              color: '#aaa',
                            }}
                          />
                          <Chip
                            label={`${s.expectedStagesCount} ${s.expectedStagesCount === 1 ? 'этап' : s.expectedStagesCount >= 2 && s.expectedStagesCount <= 4 ? 'этапа' : 'этапов'}`}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.6875rem',
                              bgcolor: s.expectedStagesCount === 0 ? 'rgba(198, 40, 40, 0.2)' : 'rgba(46, 125, 50, 0.2)',
                              color: s.expectedStagesCount === 0 ? '#ef9a9a' : '#a5d6a7',
                            }}
                          />
                          {s.expectedAlerts.map((alert) => (
                            <Chip
                              key={alert}
                              label={alert}
                              size="small"
                              sx={{
                                height: 20,
                                fontSize: '0.625rem',
                                bgcolor: 'rgba(255, 152, 0, 0.15)',
                                color: '#ffb74d',
                              }}
                            />
                          ))}
                        </Box>

                        {isActive && (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                            <Typography variant="caption" sx={{ color: '#d0d0d8', lineHeight: 1.35 }}>
                              <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>Предусловие:</Box> {s.precondition}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#d0d0d8', lineHeight: 1.35 }}>
                              <Box component="span" sx={{ color: '#fff', fontWeight: 600 }}>Действие:</Box> {s.action}
                            </Typography>
                            {s.expectedResult.map((item, index) => (
                              <Typography
                                key={item}
                                variant="caption"
                                sx={{ color: '#c2c2cc', lineHeight: 1.35 }}
                              >
                                {`${index + 1}. ${item}`}
                              </Typography>
                            ))}
                          </Box>
                        )}
                      </Box>
                    );
                  })}
                </Box>
              );
            })}
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
}
