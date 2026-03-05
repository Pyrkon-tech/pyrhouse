import type { Volunteer } from '../types';

export const MOCK_VOLUNTEERS: Volunteer[] = [
  { id: 1, username: 'marek_dev', discord_username: 'marek_dev', avatar_url: null, fullname: 'Marek Nowak', status: 'available', current_mission: null },
  { id: 2, username: 'ania_tech', discord_username: 'ania_tech', avatar_url: null, fullname: 'Anna Wiśniewska', status: 'available', current_mission: null },
  { id: 3, username: 'piotr_log', discord_username: 'piotr_log', avatar_url: null, fullname: 'Piotr Zieliński', status: 'available', current_mission: null },
  { id: 4, username: 'kasia_org', discord_username: 'kasia_org', avatar_url: null, fullname: 'Katarzyna Kowalczyk', status: 'on_mission', current_mission: 'Pawilon 5' },
  { id: 5, username: 'tomek_av', discord_username: 'tomek_av', avatar_url: null, fullname: 'Tomasz Lewandowski', status: 'on_mission', current_mission: 'Pawilon 3A' },
  { id: 6, username: 'ola_deko', discord_username: null, avatar_url: null, fullname: 'Aleksandra Dąbrowska', status: 'offline', current_mission: null },
  { id: 7, username: 'bartek_it', discord_username: 'bartek_it', avatar_url: null, fullname: 'Bartosz Wójcik', status: 'available', current_mission: null },
  { id: 8, username: 'gosia_med', discord_username: 'gosia_med', avatar_url: null, fullname: 'Małgorzata Kamińska', status: 'available', current_mission: null },
];
