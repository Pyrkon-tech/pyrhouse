import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import TransferFormCore from './components/TransferFormCore';

const TransferPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const questId = location.state?.questId as string | undefined;

  return (
    <TransferFormCore
      questId={questId}
      onSuccess={(transferId) => {
        if (questId) navigate(`/quests/${questId}`);
        else navigate(transferId ? `/transfers/${transferId}` : '/transfers');
      }}
      onCancel={() => navigate(-1)}
    />
  );
};

export default TransferPage;
