import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { Transfer } from '../../../../types/transfer.types';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { format } from 'date-fns';

interface TransferListProps {
  transfers: Transfer[];
  onViewTransfer: (transfer: Transfer) => void;
}

export const TransferList: React.FC<TransferListProps> = ({ transfers, onViewTransfer }) => {
  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>ID</TableCell>
            <TableCell>From Location</TableCell>
            <TableCell>To Location</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Transfer Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {transfers.map((transfer) => (
            <TableRow key={transfer.id}>
              <TableCell>{transfer.id}</TableCell>
              <TableCell>{transfer.from_location.name}</TableCell>
              <TableCell>{transfer.to_location.name}</TableCell>
              <TableCell>{transfer.status}</TableCell>
              <TableCell>
                {format(new Date(transfer.transfer_date), 'dd.MM.yyyy HH:mm')}
              </TableCell>
              <TableCell>
                <Tooltip title="View Details">
                  <IconButton 
                    onClick={() => onViewTransfer(transfer)}
                    size="small"
                  >
                    <VisibilityIcon />
                  </IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}; 