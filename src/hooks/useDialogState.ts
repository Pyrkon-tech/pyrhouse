import { useState, useCallback } from 'react';

/**
 * Zarządza stanem dialogów add/edit/delete dla dowolnego typu encji.
 *
 * Eliminuje ~15 linii powtarzanego boilerplate state w każdej stronie CRUD.
 *
 * @example
 * const dialogs = useDialogState<Origin>();
 *
 * <Button onClick={dialogs.openAdd}>Dodaj</Button>
 * <IconButton onClick={() => dialogs.openEdit(item)} />
 * <IconButton onClick={() => dialogs.openDelete(item)} />
 *
 * <AddDialog open={dialogs.addOpen} onClose={dialogs.closeAdd} />
 * <EditDialog open={dialogs.isEditOpen} item={dialogs.editItem} onClose={dialogs.closeEdit} />
 * <ConfirmDialog open={dialogs.isDeleteOpen} item={dialogs.deleteItem} onClose={dialogs.closeDelete} />
 */
export function useDialogState<T>() {
  const [addOpen, setAddOpen] = useState(false);
  const [editItem, setEditItem] = useState<T | null>(null);
  const [deleteItem, setDeleteItem] = useState<T | null>(null);

  const openAdd = useCallback(() => setAddOpen(true), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);

  const openEdit = useCallback((item: T) => setEditItem(item), []);
  const closeEdit = useCallback(() => setEditItem(null), []);

  const openDelete = useCallback((item: T) => setDeleteItem(item), []);
  const closeDelete = useCallback(() => setDeleteItem(null), []);

  return {
    // Add
    addOpen,
    openAdd,
    closeAdd,
    // Edit
    editItem,
    openEdit,
    closeEdit,
    isEditOpen: editItem !== null,
    // Delete
    deleteItem,
    openDelete,
    closeDelete,
    isDeleteOpen: deleteItem !== null,
  };
}
