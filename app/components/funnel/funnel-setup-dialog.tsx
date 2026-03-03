'use client';

import { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Typography from '@mui/material/Typography';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Divider from '@mui/material/Divider';
import type {
  SpaceBoard,
  AutoFunnelConfig,
  FunnelOverrides,
  ColumnOverride,
  ColumnRole,
  CustomFieldDef,
} from '@/lib/types';
import { buildColumnOverridesFromBestGuess } from '@/lib/funnel-columns';

interface FunnelSetupDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (overrides: FunnelOverrides) => void;
  boards: SpaceBoard[];
  bestGuessConfig: AutoFunnelConfig;
  currentOverrides: FunnelOverrides | null;
}

const ROLE_OPTIONS: { value: ColumnRole; label: string; color: string }[] = [
  { value: 'stage', label: 'Этап', color: '#bdbdbd' },
  { value: 'won', label: 'Выиграно', color: '#4caf50' },
  { value: 'lost', label: 'Проиграно', color: '#ef5350' },
];

const SWITCH_SX = {
  '& .MuiSwitch-switchBase.Mui-checked': { color: '#7b1fa2' },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#ce93d8' },
};

function RoleDot({ color }: { color: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: color,
        flexShrink: 0,
        mr: 1,
      }}
    />
  );
}

/** Collect all number fields across boards (deduplicated by name) */
function collectNumberFields(boards: SpaceBoard[]): CustomFieldDef[] {
  const seen = new Set<string>();
  const fields: CustomFieldDef[] = [];
  for (const board of boards) {
    for (const f of board.custom_fields ?? []) {
      if (f.field_type === 'number' && !seen.has(f.name)) {
        seen.add(f.name);
        fields.push(f);
      }
    }
  }
  return fields;
}

export function FunnelSetupDialog({
  open,
  onClose,
  onApply,
  boards,
  bestGuessConfig,
  currentOverrides,
}: FunnelSetupDialogProps) {
  // Local draft state — initialized from currentOverrides or bestGuessConfig
  const defaultColumns = useMemo(
    () => buildColumnOverridesFromBestGuess(boards, bestGuessConfig),
    [boards, bestGuessConfig],
  );

  const [columns, setColumns] = useState<ColumnOverride[]>(
    currentOverrides?.columns ?? defaultColumns,
  );
  const [amountFieldId, setAmountFieldId] = useState<number | null>(
    currentOverrides?.deal_amount_field_id ?? bestGuessConfig.deal_amount_field_id,
  );

  const numberFields = useMemo(() => collectNumberFields(boards), [boards]);

  // Re-sync draft when dialog opens with new currentOverrides
  const handleEnter = useCallback(() => {
    setColumns(currentOverrides?.columns ?? defaultColumns);
    setAmountFieldId(currentOverrides?.deal_amount_field_id ?? bestGuessConfig.deal_amount_field_id);
  }, [currentOverrides, defaultColumns, bestGuessConfig]);

  // Column toggle
  const handleToggleColumn = useCallback((columnId: number) => {
    setColumns((prev) =>
      prev.map((c) => (c.column_id === columnId ? { ...c, enabled: !c.enabled } : c)),
    );
  }, []);

  // Column role change
  const handleSetRole = useCallback((columnId: number, role: ColumnRole) => {
    setColumns((prev) =>
      prev.map((c) => (c.column_id === columnId ? { ...c, role } : c)),
    );
  }, []);

  // Amount field change
  const handleAmountFieldChange = useCallback((fieldId: number | null) => {
    setAmountFieldId(fieldId);
  }, []);

  // Apply
  const handleApply = useCallback(() => {
    onApply({
      columns,
      deal_amount_field_id: amountFieldId,
      metric_mode: amountFieldId != null ? 'amount' : 'count',
    });
  }, [onApply, columns, amountFieldId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionProps={{ onEnter: handleEnter }}
      PaperProps={{ sx: { borderRadius: 3, maxHeight: '80vh' } }}
    >
      <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 700, pb: 0.5, pt: 3, px: 3 }}>
        Настройка воронки
      </DialogTitle>

      <DialogContent sx={{ px: 3, pt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
          Мы настроили воронку автоматически. Проверьте этапы, итоговые колонки и поле с суммой.
        </Typography>

        {/* ── Boards & columns ────────────────────────── */}
        {boards.map((board, boardIndex) => {
          const boardColumns = columns.filter((c) => c.board_id === board.id);

          return (
            <Box key={board.id}>
              {boardIndex > 0 && <Divider sx={{ my: 2 }} />}

              {/* Board header */}
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
                {board.name}
              </Typography>

              {/* Columns */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 1 }}>
                {board.columns.map((col) => {
                  const colState = boardColumns.find((c) => c.column_id === col.id);
                  const enabled = colState?.enabled ?? false;
                  const role = colState?.role ?? 'stage';

                  return (
                    <Box
                      key={col.id}
                      sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
                    >
                      <Switch
                        checked={enabled}
                        onChange={() => handleToggleColumn(col.id)}
                        size="small"
                        sx={SWITCH_SX}
                      />

                      <Typography
                        variant="body2"
                        sx={{
                          minWidth: 100,
                          fontWeight: 500,
                          color: enabled ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {col.name}
                      </Typography>

                      <FormControl size="small" sx={{ minWidth: 180, ml: 'auto' }}>
                        <Select
                          value={enabled ? role : 'stage'}
                          onChange={(e) =>
                            handleSetRole(col.id, e.target.value as ColumnRole)
                          }
                          disabled={!enabled}
                          renderValue={(value) => {
                            const opt = ROLE_OPTIONS.find((r) => r.value === value);
                            if (!opt) return null;
                            return (
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <RoleDot color={enabled ? opt.color : '#e0e0e0'} />
                                {opt.label}
                              </Box>
                            );
                          }}
                          sx={{ fontSize: '0.8125rem' }}
                        >
                          {ROLE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <RoleDot color={opt.color} />
                                {opt.label}
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          );
        })}

        {numberFields.length > 0 && (
          <>
            {/* ── Metric section ──────────────────────────── */}
            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
              Что считаем
            </Typography>

            <FormControl size="small" fullWidth>
              <InputLabel id="amount-field-label">Поле с суммой</InputLabel>
              <Select
                labelId="amount-field-label"
                label="Поле с суммой"
                value={amountFieldId ?? ''}
                onChange={(e) => {
                  const val = e.target.value as string | number;
                  handleAmountFieldChange(val === '' ? null : Number(val));
                }}
                sx={{ fontSize: '0.875rem' }}
              >
                <MenuItem value="">
                  <Typography variant="body2" color="text.secondary">
                    Считать по количеству сделок
                  </Typography>
                </MenuItem>
                {numberFields.map((f) => (
                  <MenuItem key={f.id} value={f.id}>
                    {f.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            textTransform: 'uppercase',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            borderColor: 'rgba(0,0,0,0.23)',
            color: 'text.primary',
          }}
        >
          Отмена
        </Button>
        <Button
          variant="contained"
          onClick={handleApply}
          sx={{
            textTransform: 'uppercase',
            fontSize: '0.8125rem',
            fontWeight: 600,
            letterSpacing: '0.04em',
            bgcolor: '#7b1fa2',
            '&:hover': { bgcolor: '#6a1b9a' },
          }}
        >
          Применить
        </Button>
      </DialogActions>
    </Dialog>
  );
}
