import React from 'react';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import { useNavigate } from 'react-router-dom';
import { Box } from '@mui/material';

interface BreadcrumbsComponentProps {
  pathnames: string[];
  translations?: { [key: string]: string };
}

const defaultTranslations: { [key: string]: string } = {
  home: 'Strona Główna',
  quests: 'Zamówienia',
  create: 'Utwórz',
  locations: 'Lokalizacje',
  categories: 'Kategorie',
  transfers: 'Transfery',
  ongoing: 'Aktywne',
  warehouses: 'Magazyny',
  users: 'Użytkownicy',
  list: 'Magazyn',
  'add-item': 'Nowy sprzęt',
  reservations: 'Rezerwacje PYR'
};

const BreadcrumbsComponent: React.FC<BreadcrumbsComponentProps> = ({ pathnames, translations = {} }) => {
  const navigate = useNavigate();
  const combinedTranslations = { ...defaultTranslations, ...translations };

  return (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link 
          underline="hover" 
          color="inherit" 
          onClick={() => navigate('/')}
          sx={{ cursor: 'pointer' }}
        >Home</Link>
        {pathnames.length > 0 && pathnames.map((value, index) => {

          let to = `/${pathnames.slice(0, index + 1).join('/')}`;
          if (value === 'equipment') {
            value = 'list';
            to = '/list';
          }
          const displayName = combinedTranslations[value.toLowerCase()] || (value.charAt(0).toUpperCase() + value.slice(1));
          return (
            <Link
              underline="hover"
              color="inherit"
              key={to}
              onClick={() => navigate(to)}
              sx={{ cursor: 'pointer' }}
            >
              {displayName}
            </Link>
          );
        })}
      </Breadcrumbs>
    </Box>
  );
};

export default BreadcrumbsComponent;
