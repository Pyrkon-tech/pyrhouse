import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Info } from '@mui/icons-material';
import SerialNumberEditor from './SerialNumberEditor';
import QuantityEditor from './QuantityEditor';
import type { EquipmentDetailsData } from './types';

interface BasicInfoSectionProps {
  details: EquipmentDetailsData;
  type: string;
  canEditQuantity: boolean;
  onSaveSerial: (serial: string) => Promise<boolean>;
  onSaveQuantity: (quantity: number) => Promise<boolean>;
  onSerialScanned: () => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  details,
  type,
  canEditQuantity,
  onSaveSerial,
  onSaveQuantity,
  onSerialScanned,
}) => {
  const theme = useTheme();

  const columnSx = {
    p: { xs: 1.5, sm: 2 },
    bgcolor: theme.palette.mode === 'dark' ? 'background.default' : 'grey.50',
    borderRadius: 1,
    border: '1px solid',
    borderColor: 'divider',
  };

  return (
    <>
      {/* Nagłówek sekcji */}
      <Box sx={{
        display: 'flex',
        gap: 2,
        pb: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        flexDirection: { xs: 'column', sm: 'row' },
        alignItems: { xs: 'flex-start', sm: 'center' }
      }}>
        <Box sx={{
          p: 1,
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Info color="primary" />
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Podstawowe informacje
        </Typography>
      </Box>
      {/* Główne informacje */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
        gap: { xs: 2, sm: 3 }
      }}>
        {/* Lewa kolumna */}
        <Box sx={columnSx}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  mb: 0.5,
                  display: 'block'
                }}>
                Identyfikator
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                #{details.id}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  mb: 0.5,
                  display: 'block'
                }}>
                Kategoria
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {details.category?.label || 'N/A'}
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  mb: 0.5,
                  display: 'block'
                }}>
                Lokalizacja
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {details.location?.name || 'N/A'} {details.location?.pavilion ? `(${details.location?.pavilion})` : ''}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Prawa kolumna */}
        <Box sx={columnSx}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography
                variant="caption"
                sx={{
                  color: "text.secondary",
                  mb: 0.5,
                  display: 'block'
                }}>
                Pochodzenie
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {details.origin || 'N/A'}
              </Typography>
            </Box>
            {type === 'asset' && (
              <Box>
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      mb: 0.5,
                      display: 'block'
                    }}>
                    PYR Code
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {details.pyrcode || 'N/A'}
                  </Typography>
                </Box>
                <Box sx={{ mt: 1 }}>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      mb: 0.5,
                      display: 'block'
                    }}>
                    Numer seryjny
                  </Typography>
                  <SerialNumberEditor
                    serial={details.serial}
                    onSave={onSaveSerial}
                    onScanComplete={onSerialScanned}
                  />
                </Box>
              </Box>
            )}
            {type === 'stock' && (
              <QuantityEditor
                quantity={details.quantity}
                canEdit={canEditQuantity}
                onSave={onSaveQuantity}
              />
            )}
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default BasicInfoSection;
