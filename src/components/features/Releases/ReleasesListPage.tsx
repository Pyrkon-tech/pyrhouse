import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EditIcon from '@mui/icons-material/Edit';
import { useNavigate } from 'react-router-dom';
import { getReleasesAPI } from '../../../services/releaseService';
import { useAuth } from '../../../hooks/useAuth';
import type { Release, ReleaseStatus } from '../../../types/release.types';

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const StatusChip: React.FC<{ status: ReleaseStatus }> = ({ status }) =>
  status === 'completed' ? (
    <Chip icon={<CheckCircleIcon />} label="Zakończone" color="success" size="small" />
  ) : (
    <Chip icon={<EditIcon />} label="Roboczy" color="warning" size="small" />
  );

const ReleasesListPage: React.FC = () => {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const canCreate = userRole === 'admin' || userRole === 'moderator' || userRole === 'dispatcher';

  const fetchReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getReleasesAPI(statusFilter ? { status: statusFilter } : undefined);
      setReleases(data);
    } catch (err: any) {
      setError(err.message || 'Błąd pobierania listy wydań');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReleases();
  }, [fetchReleases]);

  return (
    <Box
      sx={{
        margin: '0 auto',
        padding: { xs: 2, sm: 3 },
        maxWidth: '1400px',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          mb: 3,
          gap: 2,
          borderBottom: '1px solid',
          borderColor: 'divider',
          pb: 2,
        }}
      >
        <Box>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: 'primary.main' }}>
            Demontażkon
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Trwałe wydania sprzętu do dostawców po zakończeniu eventu
          </Typography>
        </Box>
        {canCreate && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => navigate('/releases/create')}
            sx={{ borderRadius: 1, px: 3, flexShrink: 0 }}
          >
            Nowe wydanie
          </Button>
        )}
      </Box>

      {/* Filters */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            displayEmpty
          >
            <MenuItem value="">Wszystkie</MenuItem>
            <MenuItem value="draft">Robocze</MenuItem>
            <MenuItem value="completed">Zakończone</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
          <CircularProgress />
        </Box>
      ) : releases.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            p: 5,
            backgroundColor: 'background.default',
            borderRadius: 2,
            border: '1px dashed',
            borderColor: 'divider',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Brak wydań
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {statusFilter ? 'Brak wydań o wybranym statusie.' : 'Utwórz pierwsze wydanie sprzętu do dostawcy.'}
          </Typography>
          {canCreate && (
            <Button variant="contained" onClick={() => navigate('/releases/create')}>
              Utwórz wydanie
            </Button>
          )}
        </Box>
      ) : (
        <Grid container spacing={2}>
          {releases.map((release) => (
            <Grid item xs={12} sm={6} md={4} key={release.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: release.status === 'draft' ? 'warning.light' : 'success.light',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() => navigate(`/releases/${release.id}`)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {release.reference}
                    </Typography>
                    <StatusChip status={release.status} />
                  </Box>

                  <Divider sx={{ mb: 1.5 }} />

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                    {release.origin_label && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Pochodzenie:</Typography>
                        <Chip label={release.origin_label} size="small" variant="outlined" />
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        {release.status === 'completed' ? 'Potwierdzone:' : 'Utworzone:'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(release.completed_at ?? release.created_at)}
                      </Typography>
                    </Box>
                    {release.created_by_name && (
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">Autor:</Typography>
                        <Typography variant="body2">{release.created_by_name}</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default ReleasesListPage;
