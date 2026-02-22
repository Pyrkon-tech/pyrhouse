import React from 'react';
import { Box } from '@mui/material';
import ServiceDeskForm from './ServiceDeskForm';
import logo from '../../../assets/images/p-logo.svg';

const PublicServiceDeskForm: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        background: 'linear-gradient(135deg, #6a82fb 0%, #fc5c7d 100%)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        p: { xs: 0.5, sm: 2 },
      }}
    >
      <Box
        sx={{
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
        }}
      >
        <Box sx={{ mb: { xs: 1, sm: 2 }, pt: { xs: 1, sm: 3 } }}>
          <img src={logo} alt="Pyrkon logo" style={{ width: 56 }} />
        </Box>
        <ServiceDeskForm
          title="Zgłoś problem ze sprzętem"
          subtitle="Formularz kontaktu z Technicznymi"
          hidePriority={true}
        />
      </Box>
    </Box>
  );
};

export default PublicServiceDeskForm; 