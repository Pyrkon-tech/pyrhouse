import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  Link,
  List,
  ListItem,
  Paper,
  Switch,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { DataTable, DataTableEmptyRow, DataTableLoadingRow } from '../../ui';
import { useAuth } from '../../../hooks/useAuth';
import { useNotification } from '../../../context/NotificationContext';
import {
  allowlistShopAccountAPI,
  createShopInviteAPI,
  getShopAccountsAPI,
  getShopInvitesAPI,
  getShopSettingsAPI,
  revokeShopInviteAPI,
  setShopAccountActiveAPI,
} from '../../../services/shopAdminService';
import type { CreatedShopInvite, ShopAccessSource, ShopAccount, ShopInvite, ShopSettings } from '../../../types/shop.types';
import ShopAdminTabs from './ShopAdminTabs';
import { ACCESS_SOURCE_LABEL, INVITE_STATUS_VIEW, fmtDateTime, shopErrorMessage } from './shopFormat';

const SOURCE_COLOR: Record<ShopAccessSource, 'default' | 'secondary' | 'primary'> = {
  domain: 'default',
  allowlist: 'secondary',
  invite: 'primary',
};

const ShopAccessPage: React.FC = () => {
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const { showSuccess, showError } = useNotification();

  const [accounts, setAccounts] = useState<ShopAccount[]>([]);
  const [invites, setInvites] = useState<ShopInvite[]>([]);
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [created, setCreated] = useState<CreatedShopInvite | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [acc, inv] = await Promise.all([getShopAccountsAPI(), getShopInvitesAPI()]);
      setAccounts(acc);
      setInvites(inv);
    } catch (err) {
      setError(shopErrorMessage(err, 'Nie udało się pobrać dostępów'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Settings are admin-only; moderators get the generic policy text.
    if (isAdmin) getShopSettingsAPI().then(setSettings).catch(() => setSettings(null));
  }, [load, isAdmin]);

  const run = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await fn();
      showSuccess(success);
      await load();
      return true;
    } catch (err) {
      showError(shopErrorMessage(err, 'Operacja nie powiodła się'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addAllowlist = async () => {
    if (await run(() => allowlistShopAccountAPI(email.trim()), 'Dodano do allowlisty')) setEmail('');
  };

  const createInvite = async () => {
    setBusy(true);
    try {
      setCreated(await createShopInviteAPI(label.trim()));
      setLabel('');
      await load();
    } catch (err) {
      showError(shopErrorMessage(err, 'Nie udało się utworzyć zaproszenia'));
    } finally {
      setBusy(false);
    }
  };

  const inviteLink = created ? created.url ?? `/invite/${created.token}` : '';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      showSuccess('Link skopiowany');
    } catch {
      showError('Nie udało się skopiować — zaznacz link ręcznie');
    }
  };

  const domains = settings?.auto_domains.map((d) => `@${d}`).join(', ') || '@pyrkon.pl';
  const autoJoin = settings ? settings.domain_auto_join : true;

  return (
    <Box>
      <ShopAdminTabs active="access" />

      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' }, alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1, minWidth: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <ShieldOutlinedIcon color="secondary" />
            <Typography variant="body2" sx={{ flexGrow: 1 }}>
              <strong>
                {autoJoin ? `Każde konto Google Workspace ${domains} wchodzi automatycznie.` : 'Automatyczne wejście z domeny jest wyłączone.'}
              </strong>{' '}
              Osoby spoza domeny potrzebują allowlisty lub zaproszenia. Konta sklepu nie dają dostępu do magazynu.
              Zablokowanie konta działa od razu.
            </Typography>
            {isAdmin && (
              <Link component={RouterLink} to="/shop-admin/settings" sx={{ whiteSpace: 'nowrap' }}>Zmień politykę</Link>
            )}
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}

          <DataTable>
            <TableHead>
              <TableRow>
                <TableCell>Osoba</TableCell>
                <TableCell>Skąd dostęp</TableCell>
                <TableCell>Ostatnio</TableCell>
                <TableCell align="right">Zamówienia</TableCell>
                <TableCell>Aktywne</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <DataTableLoadingRow colSpan={5} />
              ) : accounts.length === 0 ? (
                <DataTableEmptyRow colSpan={5} message="Nikt jeszcze się nie zalogował" />
              ) : (
                accounts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Typography sx={{ color: a.active ? 'text.primary' : 'text.secondary' }}>{a.display_name || '—'}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{a.email}</Typography>
                    </TableCell>
                    <TableCell><Chip size="small" variant="outlined" color={SOURCE_COLOR[a.access_source]} label={ACCESS_SOURCE_LABEL[a.access_source]} /></TableCell>
                    <TableCell>{a.logged_in ? fmtDateTime(a.last_login_at) : 'czeka na 1. logowanie'}</TableCell>
                    <TableCell align="right">{a.orders_count}</TableCell>
                    <TableCell>
                      <Switch
                        checked={a.active}
                        disabled={busy}
                        onChange={() => run(() => setShopAccountActiveAPI(a.id, !a.active), a.active ? 'Konto zablokowane' : 'Konto odblokowane')}
                        slotProps={{ input: { 'aria-label': `Dostęp aktywny: ${a.email}` } }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </DataTable>
        </Box>

        <Paper component="aside" sx={{ width: { xs: '100%', lg: 420 }, flex: 'none', p: 3, display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="h6">Dodaj do allowlisty</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                size="small"
                fullWidth
                label="E-mail konta Google"
                placeholder="np. ktos@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
              <Button variant="outlined" onClick={addAllowlist} disabled={busy || !email.includes('@')}>Dodaj</Button>
            </Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Konto połączy się przy pierwszym logowaniu tym adresem.
            </Typography>
          </Box>

          <Divider />

          <Box component="section" sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="h6">Link z zaproszeniem</Typography>
            <TextField
              size="small"
              label="Dla kogo (etykieta)"
              placeholder="np. Ochrona — Jan"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              helperText="Link jest jednorazowy i ważny 48 godzin."
              slotProps={{ htmlInput: { maxLength: 255 } }}
            />
            <Button variant="contained" startIcon={<LinkIcon />} onClick={createInvite} disabled={busy || !label.trim()}>
              Generuj jednorazowy link
            </Button>
            {created && (
              <Alert severity="info" icon={false}>
                <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>
                  Skopiuj teraz — link pokazujemy tylko raz ({created.invite.label}).
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Typography component="code" sx={{ fontFamily: 'monospace', fontSize: 13, wordBreak: 'break-all', flexGrow: 1 }}>
                    {inviteLink}
                  </Typography>
                  <Tooltip title="Kopiuj link">
                    <IconButton onClick={copy} aria-label="Kopiuj link"><ContentCopyIcon fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
                {!created.url && (
                  <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                    Backend nie zna adresu sklepu (SHOP_URL) — dopisz przed ścieżką adres sklepu.
                  </Typography>
                )}
              </Alert>
            )}
            <List dense disablePadding>
              {invites.map((inv) => {
                const st = INVITE_STATUS_VIEW[inv.status];
                const detail =
                  inv.status === 'active' ? `do ${fmtDateTime(inv.expires_at)}`
                    : inv.status === 'used' ? `${fmtDateTime(inv.used_at)}${inv.used_by_email ? ` · ${inv.used_by_email}` : ''}`
                    : inv.status === 'expired' ? fmtDateTime(inv.expires_at)
                    : fmtDateTime(inv.revoked_at);
                return (
                  <ListItem
                    key={inv.id}
                    disableGutters
                    secondaryAction={
                      inv.status === 'active' ? (
                        <Button size="small" color="error" disabled={busy} onClick={() => run(() => revokeShopInviteAPI(inv.id), 'Zaproszenie unieważnione')}>
                          Unieważnij
                        </Button>
                      ) : undefined
                    }
                    sx={{ pr: inv.status === 'active' ? 12 : 0 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap>{inv.label}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        <Chip size="small" label={st.label} color={st.color} variant="outlined" sx={{ height: 18, mr: 1 }} />
                        {detail}
                      </Typography>
                    </Box>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ShopAccessPage;
