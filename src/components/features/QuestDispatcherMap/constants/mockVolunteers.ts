import type { Volunteer } from '../types';

export const MOCK_VOLUNTEERS: Volunteer[] = [
  { id: 1, user_id: 101, username: 'marek_dev', discord_username: 'marek_dev', avatar_url: null, fullname: 'Marek Nowak', status: 'available', current_mission: null },
  { id: 2, user_id: 102, username: 'ania_tech', discord_username: 'ania_tech', avatar_url: null, fullname: 'Anna Wiśniewska', status: 'available', current_mission: null },
  { id: 3, user_id: 103, username: 'piotr_log', discord_username: 'piotr_log', avatar_url: null, fullname: 'Piotr Zieliński', status: 'available', current_mission: null },
  { id: 4, user_id: 104, username: 'kasia_org', discord_username: 'kasia_org', avatar_url: null, fullname: 'Katarzyna Kowalczyk', status: 'on_mission', current_mission: 'Pawilon 5' },
  { id: 5, user_id: 105, username: 'tomek_av', discord_username: 'tomek_av', avatar_url: null, fullname: 'Tomasz Lewandowski', status: 'on_mission', current_mission: 'Pawilon 3A' },
  { id: 6, user_id: null, username: 'ola_deko', discord_username: null, avatar_url: null, fullname: 'Aleksandra Dąbrowska', status: 'offline', current_mission: null },
  { id: 7, user_id: 107, username: 'bartek_it', discord_username: 'bartek_it', avatar_url: null, fullname: 'Bartosz Wójcik', status: 'available', current_mission: null },
  { id: 8, user_id: 108, username: 'gosia_med', discord_username: 'gosia_med', avatar_url: null, fullname: 'Małgorzata Kamińska', status: 'available', current_mission: null },
];
