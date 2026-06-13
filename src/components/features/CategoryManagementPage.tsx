import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Select,
  MenuItem,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Grid,
  useMediaQuery,
  useTheme,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import { DataTable } from '../ui/DataTable';
import { Button } from '../ui/Button';
import { PageHeader, SearchBar, PageLoader, EmptyState, ConfirmDialog } from '../ui';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import { useCategories } from '../../hooks/useCategories';
import { useDialogState } from '../../hooks/useDialogState';
import { useAuth } from '../../hooks/useAuth';
import { AppSnackbar } from '../ui/AppSnackbar';
import { useSnackbarMessage } from '../../hooks/useSnackbarMessage';

interface Category {
  id: number;
  name?: string;
  label: string;
  type: 'asset' | 'stock';
  pyr_id?: string;
}

const CategoryManagementPage: React.FC = () => {
  const { categories, loading, error, addCategory, deleteCategory, updateCategory, setError, refreshCategories } = useCategories();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { userRole } = useAuth();
  const canCreate = userRole === 'admin' || userRole === 'moderator' || userRole === 'dispatcher';
  const canDelete = userRole === 'admin' || userRole === 'moderator';
  const canUpdate = userRole === 'admin';

  const dialogs = useDialogState<Category>();

  const [newCategory, setNewCategory] = useState({ name: '', label: '', type: '', pyr_id: '' });
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editFormData, setEditFormData] = useState({ label: '', type: '', pyr_id: '', name: '' });

  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  // Dodajemy stany na błędy formularza
  const [addFormErrors, setAddFormErrors] = useState<{ pyr_id?: string }>({});
  const [editFormErrors, setEditFormErrors] = useState<{ pyr_id?: string }>({});

  const handleOpenAddModal = () => {
    dialogs.openAdd();
    setNewCategory({ name: '', label: '', type: '', pyr_id: '' });
    setShowAdditionalOptions(false);
  };

  const handleCloseAddModal = () => {
    dialogs.closeAdd();
  };

  // Walidacja PyrID przy zmianie w formularzu dodawania
  const handleAddPyrIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewCategory({ ...newCategory, pyr_id: value });
    if (value && !/^[a-zA-Z0-9]{1,3}$/.test(value)) {
      setAddFormErrors({ ...addFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
    } else {
      setAddFormErrors({ ...addFormErrors, pyr_id: undefined });
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.label || !newCategory.type) {
      showSnackbar('error', 'Label i Typ są wymagane.');
      return;
    }
    if (newCategory.pyr_id && !/^[a-zA-Z0-9]{1,3}$/.test(newCategory.pyr_id)) {
      setAddFormErrors({ ...addFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
      return;
    }

    setAddFormErrors({});

    const payload: { label: string; type: 'asset' | 'stock'; name?: string; pyr_id?: string } = {
      label: newCategory.label,
      type: newCategory.type as 'asset' | 'stock',
    };

    if (newCategory.name.trim()) {
      payload.name = newCategory.name;
    }

    if (newCategory.pyr_id.trim()) {
      payload.pyr_id = newCategory.pyr_id;
    }

    try {
      await addCategory(payload);
      dialogs.closeAdd();
    } catch (err) {
      const e = (err ?? {}) as { message?: string; details?: string; error?: string; code?: string };
      // Obsługa walidacji PyrID z backendu
      if (e.details && typeof e.details === 'string' && e.details.includes("PatchItemCategoryRequest.PyrID")) {
        setAddFormErrors({ ...addFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
        return;
      }
      if (e.error && e.code === 'invalid_request_payload') {
        showSnackbar('error', e.error + (e.details ? `: ${e.details}` : ''));
        return;
      }
      showSnackbar('error', e.message || e.details || 'Wystąpił nieoczekiwany błąd');
    }
  };

  const handleOpenDeleteModal = (category: Category) => {
    dialogs.openDelete(category);
  };

  const handleConfirmDelete = async () => {
    if (!dialogs.deleteItem) return;
    try {
      await deleteCategory(dialogs.deleteItem.id);
      showSnackbar('success', 'Kategoria została usunięta pomyślnie!', undefined, 3000);
      dialogs.closeDelete();
    } catch (err) {
      const e = (err ?? {}) as { message?: string; details?: string };
      showSnackbar('error', e.message || 'Wystąpił nieoczekiwany błąd podczas usuwania kategorii.', e.details, null);
      dialogs.closeDelete();
    }
  };

  const handleOpenEditModal = (category: Category) => {
    dialogs.openEdit(category);
    setEditFormData({
      label: category.label,
      type: category.type,
      pyr_id: category.pyr_id || '',
      name: category.name || ''
    });
  };

  const handleCloseEditModal = () => {
    dialogs.closeEdit();
    setEditFormData({ label: '', type: '', pyr_id: '', name: '' });
  };

  // Walidacja PyrID przy zmianie w formularzu edycji
  const handleEditPyrIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditFormData({ ...editFormData, pyr_id: value });
    if (value && !/^[a-zA-Z0-9]{1,3}$/.test(value)) {
      setEditFormErrors({ ...editFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
    } else {
      setEditFormErrors({ ...editFormErrors, pyr_id: undefined });
    }
  };

  const handleEditCategory = async () => {
    if (!dialogs.editItem) return;

    if (editFormData.pyr_id && !/^[a-zA-Z0-9]{1,3}$/.test(editFormData.pyr_id)) {
      setEditFormErrors({ ...editFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
      return;
    }

    setEditFormErrors({});

    try {
      const updateData: Partial<Category> = {};

      // Dodaj do updateData tylko te pola, które się zmieniły
      if (editFormData.label !== dialogs.editItem.label) {
        updateData.label = editFormData.label;
      }
      if (editFormData.type !== dialogs.editItem.type) {
        updateData.type = editFormData.type as 'asset' | 'stock';
      }
      if (editFormData.pyr_id !== dialogs.editItem.pyr_id) {
        updateData.pyr_id = editFormData.pyr_id;
      }
      if (editFormData.name !== dialogs.editItem.name) {
        updateData.name = editFormData.name;
      }

      // Wykonaj aktualizację tylko jeśli są jakieś zmiany
      if (Object.keys(updateData).length > 0) {
        await updateCategory(dialogs.editItem.id, updateData);
        await refreshCategories();
        showSnackbar('success', 'Kategoria została zaktualizowana pomyślnie!', undefined, 3000);
        handleCloseEditModal();
      } else {
        handleCloseEditModal();
      }
    } catch (err) {
      const e = (err ?? {}) as { message?: string; details?: string; error?: string; code?: string };
      // Obsługa walidacji PyrID z backendu
      if (e.details && typeof e.details === 'string' && e.details.includes("PatchItemCategoryRequest.PyrID")) {
        setEditFormErrors({ ...editFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
        return;
      }
      if (e.error && e.code === 'invalid_request_payload') {
        showSnackbar('error', e.error + (e.details ? `: ${e.details}` : ''));
        return;
      }
      showSnackbar('error', e.message || e.details || 'Wystąpił nieoczekiwany błąd');
    }
  };

  // Sortowanie kategorii po ID, a w przypadku duplikatów po typie (asset, stock)
  const sortedCategories = [...categories].sort((a, b) => {
    if (a.id !== b.id) return a.id - b.id;
    if (a.type === b.type) return 0;
    if (a.type === 'asset') return -1;
    return 1;
  });

  const filteredCategories = sortedCategories.filter(category =>
    (category.label || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (category.pyr_id || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTable = () => (
    <DataTable>
      <TableHead>
        <TableRow>
          {['ID', 'Label (Name)', 'PyrID', 'Typ', 'Akcje'].map((field) => (
            <TableCell key={field}>{field}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {filteredCategories.map((category) => (
          <TableRow key={category.id}>
            <TableCell>
              <Typography component="div" sx={{ fontWeight: 500 }}>
                {category.id}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography component="div">
                {category.label} {category.name ? `(${category.name})` : ''}
              </Typography>
            </TableCell>
            <TableCell>
              <Typography component="div" sx={{
                color: "text.secondary"
              }}>
                {category.pyr_id || '-'}
              </Typography>
            </TableCell>
            <TableCell>
              <Chip
                label={category.type === 'asset' ? 'Sprzęt' : 'Magazyn'}
                color={category.type === 'asset' ? 'primary' : 'secondary'}
                size="small"
              />
            </TableCell>
            <TableCell>
              {(canUpdate || canDelete) && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {canUpdate && (
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEditModal(category)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton
                      color="error"
                      onClick={() => handleOpenDeleteModal(category)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );

  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {filteredCategories.map((category) => (
        <Grid size={{ xs: 12 }} key={category.id}>
          <Card
            sx={{
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              '&:hover': {
                bgcolor: 'action.hover',
              },
              transition: 'background-color 0.2s ease'
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                  ID: {category.id}
                </Typography>
                <Chip
                  label={category.type === 'asset' ? 'Sprzęt' : 'Magazyn'}
                  color={category.type === 'asset' ? 'primary' : 'secondary'}
                  size="small"
                />
              </Box>

              <Divider sx={{ my: 1 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{
                    color: "text.secondary"
                  }}>Label:</Typography>
                  <Typography variant="body2">{category.label}</Typography>
                </Box>
                {category.name && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>Name:</Typography>
                    <Typography variant="body2">{category.name}</Typography>
                  </Box>
                )}
                {category.pyr_id && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" sx={{
                      color: "text.secondary"
                    }}>PyrID:</Typography>
                    <Typography variant="body2">{category.pyr_id}</Typography>
                  </Box>
                )}
              </Box>

              {(canUpdate || canDelete) && (
                <Box
                  sx={{
                    display: 'flex',
                    gap: 1,
                    justifyContent: 'flex-end',
                    mt: 2
                  }}
                >
                  {canUpdate && (
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenEditModal(category)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                  {canDelete && (
                    <IconButton
                      color="error"
                      onClick={() => handleOpenDeleteModal(category)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        if (typeof setError === 'function') setError(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, setError]);

  return (
    <Box sx={{
      margin: '0 auto',
      padding: { xs: 2, sm: 3, md: 3 },
      maxWidth: '1400px',
      backgroundColor: 'background.paper',
      borderRadius: 2,
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
    }}>
      <AppSnackbar
        open={snackbar.open}
        type={snackbar.type}
        message={snackbar.message}
        details={snackbar.details}
        onClose={closeSnackbar}
        autoHideDuration={snackbar.autoHideDuration}
      />
      <PageHeader
        title="Kategorie"
        subtitle={`${filteredCategories.length} kategorii`}
        actions={
          canCreate ? (
            <Button variant="primary" leftIcon={<AddIcon />} onClick={handleOpenAddModal}>
              Dodaj Kategorię
            </Button>
          ) : undefined
        }
      />
      <Box sx={{ mb: 3 }}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          label="Szukaj kategorii"
          width="100%"
        />
      </Box>
      {loading ? (
        <PageLoader message="Ładowanie kategorii..." />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          message="Brak kategorii"
          description={searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Dodaj nową kategorię'}
          action={searchQuery ? { label: 'Wyczyść wyszukiwanie', onClick: () => setSearchQuery('') } : undefined}
        />
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}
      <Dialog
        open={dialogs.addOpen}
        onClose={handleCloseAddModal}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              minWidth: { xs: '90%', sm: 400 }
            }
          }
        }}
      >
        <DialogTitle>
          Dodaj Kategorię
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Nazwa"
            value={newCategory.label}
            onChange={(e) => setNewCategory({ ...newCategory, label: e.target.value })}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
          />

          <Select
            value={newCategory.type}
            onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value })}
            displayEmpty
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="" disabled>
              Wybierz typ
            </MenuItem>
            <MenuItem value="asset">Sprzęt (pyr_code)</MenuItem>
            <MenuItem value="stock">Zasoby (magazyn)</MenuItem>
          </Select>

          <Button
            variant="ghost"
            leftIcon={showAdditionalOptions ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            onClick={() => setShowAdditionalOptions((prev) => !prev)}
            sx={{ mb: 2 }}
          >
            {showAdditionalOptions ? 'Ukryj dodatkowe opcje' : 'Pokaż dodatkowe opcje'}
          </Button>

          <Collapse in={showAdditionalOptions}>
            <TextField
              label="PyrID (Opcjonalne)"
              value={newCategory.pyr_id}
              onChange={handleAddPyrIdChange}
              fullWidth
              sx={{ mb: 2 }}
              error={!!addFormErrors.pyr_id}
              helperText={addFormErrors.pyr_id}
            />

            <TextField
              label="Alternatywna nazwa kategorii (Opcjonalne)"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
              fullWidth
              sx={{ mb: 2 }}
            />
          </Collapse>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="ghost" onClick={handleCloseAddModal}>
            Anuluj
          </Button>
          <Button variant="primary" onClick={handleAddCategory} loading={loading}>
            Dodaj
          </Button>
        </DialogActions>
      </Dialog>
      <ConfirmDialog
        open={dialogs.isDeleteOpen}
        title="Potwierdź usunięcie"
        message="Czy na pewno chcesz usunąć tę kategorię?"
        confirmLabel="Usuń"
        confirmColor="error"
        loading={loading}
        onConfirm={handleConfirmDelete}
        onClose={dialogs.closeDelete}
      />
      <Dialog
        open={dialogs.isEditOpen}
        onClose={handleCloseEditModal}
        slotProps={{
          paper: {
            sx: {
              borderRadius: 2,
              maxWidth: '500px',
              width: '100%'
            }
          }
        }}
      >
        <DialogTitle>
          Edytuj Kategorię
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Label"
            value={editFormData.label}
            onChange={(e) => setEditFormData({ ...editFormData, label: e.target.value })}
            fullWidth
            sx={{ mt: 2, mb: 2 }}
          />

          <Select
            value={editFormData.type}
            onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
            displayEmpty
            fullWidth
            sx={{ mb: 2 }}
          >
            <MenuItem value="" disabled>
              Wybierz typ
            </MenuItem>
            <MenuItem value="asset">Sprzęt (pyr_code)</MenuItem>
            <MenuItem value="stock">Zasoby (magazyn)</MenuItem>
          </Select>

          <TextField
            label="PyrID (Opcjonalne)"
            value={editFormData.pyr_id}
            onChange={handleEditPyrIdChange}
            fullWidth
            sx={{ mb: 2 }}
            error={!!editFormErrors.pyr_id}
            helperText={editFormErrors.pyr_id}
          />

          <TextField
            label="Name"
            value={editFormData.name}
            fullWidth
            disabled
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="ghost" onClick={handleCloseEditModal}>
            Anuluj
          </Button>
          <Button variant="primary" onClick={handleEditCategory} loading={loading}>
            Zapisz
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManagementPage;
