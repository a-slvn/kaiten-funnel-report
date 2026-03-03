'use client';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Box from '@mui/material/Box';
import CloseIcon from '@mui/icons-material/Close';
import type { BestGuessAlert } from '@/lib/types';

interface AlertBannerProps {
  alerts: BestGuessAlert[];
  onOpenSettings: () => void;
  onDismiss?: (alertCode: string) => void;
}

export function AlertBanner({ alerts, onOpenSettings, onDismiss }: AlertBannerProps) {
  if (alerts.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {alerts.map((alert) => (
        <Alert
          key={alert.code}
          severity={alert.type === 'warning' ? 'warning' : 'info'}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {alert.action_label && (
                alert.action_target === 'link' && alert.action_href ? (
                  <Button
                    color="inherit"
                    size="small"
                    component="a"
                    href={alert.action_href}
                    target="_blank"
                    rel="noreferrer"
                    sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
                  >
                    {alert.action_label}
                  </Button>
                ) : (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={onOpenSettings}
                    sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}
                  >
                    {alert.action_label}
                  </Button>
                )
              )}
              {onDismiss && (
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => onDismiss(alert.code)}
                  aria-label="Закрыть уведомление"
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          }
          sx={{ alignItems: 'center' }}
        >
          {alert.message}
        </Alert>
      ))}
    </Box>
  );
}
