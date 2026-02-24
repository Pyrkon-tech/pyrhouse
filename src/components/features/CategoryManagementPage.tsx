import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  CircularProgress,
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
  DialogContentText,
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
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import EditIcon from '@mui/icons-material/Edit';
import { useCategories } from '../../hooks/useCategories';
import * as Icons from '@mui/icons-material';
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

  // State for managing add modal
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', label: '', type: '', pyr_id: '' });
  const [showAdditionalOptions, setShowAdditionalOptions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // State for delete confirmation modal
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<number | null>(null);

  // State for edit modal
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editFormData, setEditFormData] = useState({ label: '', type: '', pyr_id: '', name: '' });

  const { snackbar, showSnackbar, closeSnackbar } = useSnackbarMessage();

  // Dodajemy stany na błędy formularza
  const [addFormErrors, setAddFormErrors] = useState<{ pyr_id?: string }>({});
  const [editFormErrors, setEditFormErrors] = useState<{ pyr_id?: string }>({});

  const handleOpenAddModal = () => {
    setAddModalOpen(true);
    setNewCategory({ name: '', label: '', type: '', pyr_id: '' });
    setShowAdditionalOptions(false);
  };

  const handleCloseAddModal = () => {
    setAddModalOpen(false);
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
      handleCloseAddModal();
    } catch (err: any) {
      // Obsługa walidacji PyrID z backendu
      if (err && typeof err === 'object') {
        if (err.details && typeof err.details === 'string' && err.details.includes("PatchItemCategoryRequest.PyrID")) {
          setAddFormErrors({ ...addFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
          return;
        }
        if (err.error && err.code === 'invalid_request_payload') {
          showSnackbar('error', err.error + (err.details ? `: ${err.details}` : ''));
          return;
        }
        if ('message' in err) {
          showSnackbar('error', err.message || err.details || 'Wystąpił nieoczekiwany błąd');
          return;
        }
      }
      showSnackbar('error', err.message || err.details || 'Wystąpił nieoczekiwany błąd');
    }
  };

  const handleOpenDeleteModal = (categoryId: number) => {
    setCategoryToDelete(categoryId);
    setDeleteModalOpen(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalOpen(false);
    setCategoryToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (categoryToDelete) {
      try {
        await deleteCategory(categoryToDelete);
        showSnackbar('success', 'Kategoria została usunięta pomyślnie!', undefined, 3000);
        handleCloseDeleteModal();
      } catch (err: any) {
        if (err && typeof err === 'object' && 'message' in err) {
          showSnackbar('error', err.message, err.details, null);
        } else {
          showSnackbar('error', err.message || 'Wystąpił nieoczekiwany błąd podczas usuwania kategorii.', undefined, null);
        }
        handleCloseDeleteModal();
      }
    }
  };

  const handleOpenEditModal = (category: Category) => {
    setEditingCategory(category);
    setEditFormData({
      label: category.label,
      type: category.type,
      pyr_id: category.pyr_id || '',
      name: category.name || ''
    });
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditingCategory(null);
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
    if (!editingCategory) return;

    if (editFormData.pyr_id && !/^[a-zA-Z0-9]{1,3}$/.test(editFormData.pyr_id)) {
      setEditFormErrors({ ...editFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
      return;
    }

    setEditFormErrors({});

    try {
      const updateData: Partial<Category> = {};
      
      // Dodaj do updateData tylko te pola, które się zmieniły
      if (editFormData.label !== editingCategory.label) {
        updateData.label = editFormData.label;
      }
      if (editFormData.type !== editingCategory.type) {
        updateData.type = editFormData.type as 'asset' | 'stock';
      }
      if (editFormData.pyr_id !== editingCategory.pyr_id) {
        updateData.pyr_id = editFormData.pyr_id;
      }
      if (editFormData.name !== editingCategory.name) {
        updateData.name = editFormData.name;
      }

      // Wykonaj aktualizację tylko jeśli są jakieś zmiany
      if (Object.keys(updateData).length > 0) {
        await updateCategory(editingCategory.id, updateData);
        await refreshCategories();
        showSnackbar('success', 'Kategoria została zaktualizowana pomyślnie!', undefined, 3000);
        handleCloseEditModal();
      } else {
        handleCloseEditModal();
      }
    } catch (err: any) {
      // Obsługa walidacji PyrID z backendu
      if (err && typeof err === 'object') {
        if (err.details && typeof err.details === 'string' && err.details.includes("PatchItemCategoryRequest.PyrID")) {
          setEditFormErrors({ ...editFormErrors, pyr_id: 'PyrID może mieć maksymalnie 3 znaki alfanumeryczne.' });
          return;
        }
        if (err.error && err.code === 'invalid_request_payload') {
          showSnackbar('error', err.error + (err.details ? `: ${err.details}` : ''));
          return;
        }
        if ('message' in err) {
          showSnackbar('error', err.message || err.details || 'Wystąpił nieoczekiwany błąd');
          return;
        }
      }
      showSnackbar('error', err.message || err.details || 'Wystąpił nieoczekiwany błąd');
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
              <Typography component="div" color="text.secondary">
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
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  color="primary"
                  onClick={() => handleOpenEditModal(category)}
                  size="small"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => handleOpenDeleteModal(category.id)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </DataTable>
  );

  const renderMobileCards = () => (
    <Grid container spacing={2}>
      {filteredCategories.map((category) => (
        <Grid item xs={12} key={category.id}>
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
                  <Typography variant="body2" color="text.secondary">Label:</Typography>
                  <Typography variant="body2">{category.label}</Typography>
                </Box>
                {category.name && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">Name:</Typography>
                    <Typography variant="body2">{category.name}</Typography>
                  </Box>
                )}
                {category.pyr_id && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">PyrID:</Typography>
                    <Typography variant="body2">{category.pyr_id}</Typography>
                  </Box>
                )}
              </Box>

              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1,
                  justifyContent: 'flex-end',
                  mt: 2
                }}
              >
                <IconButton
                  color="primary"
                  onClick={() => handleOpenEditModal(category)}
                  size="small"
                >
                  <EditIcon />
                </IconButton>
                <IconButton
                  color="error"
                  onClick={() => handleOpenDeleteModal(category.id)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
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

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', sm: 'row' },
        justifyContent: 'space-between', 
        alignItems: { xs: 'flex-start', sm: 'center' }, 
        marginBottom: 3,
        gap: 2,
        borderBottom: '1px solid',
        borderColor: 'divider',
        pb: 2
      }}>
        <Typography 
          variant="h4" 
          component="h1" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            color: 'primary.main',
            mb: { xs: 1, sm: 0 }
          }}
        >
          Kategorie
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleOpenAddModal}
          sx={{
            borderRadius: 1,
            px: 3
          }}
        >
          Dodaj Kategorię
        </Button>
      </Box>

      <Box sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', md: 'row' }, 
        gap: 2, 
        marginBottom: 3,
        backgroundColor: 'background.default',
        p: 2,
        borderRadius: 1
      }}>
        <TextField
          label="Szukaj kategorii"
          variant="outlined"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          InputProps={{
            sx: { 
              borderRadius: 1,
              height: '36px',
              '& input': {
                height: '36px',
                padding: '0 12px',
              }
            },
            startAdornment: (
              <Icons.Search sx={{ color: 'text.secondary', mr: 1 }} />
            )
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          p: 5,
          flexDirection: 'column',
          gap: 2
        }}>
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            Ładowanie kategorii...
          </Typography>
        </Box>
      ) : filteredCategories.length === 0 ? (
        <Box sx={{ 
          textAlign: 'center', 
          p: 5,
          backgroundColor: 'background.default',
          borderRadius: 2,
          border: '1px dashed',
          borderColor: 'divider'
        }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Brak kategorii
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchQuery ? 'Spróbuj zmienić kryteria wyszukiwania' : 'Dodaj nową kategorię'}
          </Typography>
          {searchQuery && (
            <Button 
              variant="outlined" 
              onClick={() => setSearchQuery('')}
              sx={{ 
                borderRadius: 1,
                px: 3
              }}
            >
              Wyczyść wyszukiwanie
            </Button>
          )}
        </Box>
      ) : (
        isMobile ? renderMobileCards() : renderTable()
      )}

      <Dialog 
        open={isAddModalOpen} 
        onClose={handleCloseAddModal}
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: { xs: '90%', sm: 400 }
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
            variant="text"
            color="primary"
            onClick={() => setShowAdditionalOptions((prev) => !prev)}
            sx={{ mb: 2 }}
          >
            {showAdditionalOptions ? (
              <>
                <ExpandLessIcon /> Ukryj dodatkowe opcje
              </>
            ) : (
              <>
                <ExpandMoreIcon /> Pokaż dodatkowe opcje
              </>
            )}
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
          <Button 
            onClick={handleCloseAddModal}
            sx={{ borderRadius: 1 }}
          >
            Anuluj
          </Button>
          <Button 
            onClick={handleAddCategory} 
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{ borderRadius: 1 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Dodaj'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxWidth: '500px',
            width: '100%'
          }
        }}
      >
        <DialogTitle>Potwierdź usunięcie</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz usunąć tę kategorię?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteModal} variant="outlined">
            Anuluj
          </Button>
          <Button 
            onClick={handleConfirmDelete} 
            variant="contained" 
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Usuń'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog 
        open={isEditModalOpen} 
        onClose={handleCloseEditModal}
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxWidth: '500px',
            width: '100%'
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
            label="Name (Opcjonalne)"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            fullWidth
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button 
            onClick={handleCloseEditModal}
            sx={{ borderRadius: 1 }}
          >
            Anuluj
          </Button>
          <Button 
            onClick={handleEditCategory} 
            variant="contained" 
            color="primary"
            disabled={loading}
            sx={{ borderRadius: 1 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Zapisz'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoryManagementPage;
