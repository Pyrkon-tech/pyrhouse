import type { Zone } from '../types';

export const ZONES: Zone[] = [
  { id: 'congress', label: 'PCC',
    aliases: ['kongresowe', 'centrum kongresowe', 'ck', 'congress', 'poznań congress center', 'congress center', 'aula', 'centrum', 'pcc', '15', 'hala 15', 'pawilon 15'],
    points: [[388,334],[522,299],[547,358],[439,395],[441,414],[486,430],[473,452],[500,467],[528,548],[473,630],[263,552]] },

  { id: 'paw7a', label: '7A',
    aliases: ['7a', 'hala 7a', 'pawilon 7a'],
    points: [[560,192],[610,375],[769,345],[720,163]] },

  { id: 'paw7', label: '7',
    aliases: ['7', 'hala 7', 'pawilon 7', 'hall 7', 'h7'],
    points: [[720,163],[769,345],[925,315],[875,133]] },

  { id: 'paw8a', label: '8A',
    aliases: ['8a', 'hala 8a', 'pawilon 8a'],
    points: [[610,378],[770,349],[806,470],[645,500]] },

  { id: 'paw8', label: '8',
    aliases: ['8', 'hala 8', 'pawilon 8', 'hall 8', 'h8'],
    points: [[770,349],[804,470],[960,440],[927,320]] },

  { id: 'paw13', label: '13',
    aliases: ['13', 'hala 13', 'pawilon 13'],
    points: [[834,514],[849,582],[930,555],[912,500]] },

  { id: 'paw14', label: '14',
    aliases: ['14', 'hala 14', 'pawilon 14'],
    points: [[778,523],[800,605],[722,620],[700,540]] },

  { id: 'paw6a', label: '6A',
    aliases: ['6a', 'hala 6a', 'pawilon 6a'],
    points: [[1165,312],[1190,405],[1615,325],[1587,235]] },

  { id: 'paw6', label: '6',
    aliases: ['6', 'hala 6', 'pawilon 6', 'hall 6', 'h6'],
    points: [[1590,233],[1613,305],[1806,270],[1785,200]] },

  { id: 'paw5a', label: '5A',
    aliases: ['5a', 'hala 5a', 'pawilon 5a'],
    points: [[937,518],[960,595],[1234,544],[1210,466]] },

  { id: 'paw5', label: '5',
    aliases: ['5', 'hala 5', 'pawilon 5', 'hall 5', 'h5'],
    points: [[1210,466],[1250,595],[1805,495],[1765,361]] },

  { id: 'paw1', label: '1',
    aliases: ['1', 'hala 1', 'pawilon 1', 'hall 1', 'h1'],
    points: [[134,580],[429,684],[378,767],[85,665]] },

  { id: 'paw2', label: '2',
    aliases: ['2', 'hala 2', 'pawilon 2', 'hall 2', 'h2'],
    points: [[547,728],[851,832],[796,922],[506,818]] },

  { id: 'paw4', label: '4',
    aliases: ['4', 'hala 4', 'pawilon 4', 'hall 4', 'h4'],
    points: [[1498,604],[1514,675],[1861,622],[1840,547]] },

  { id: 'paw10', label: '10',
    aliases: ['10', 'hala 10', 'pawilon 10'],
    points: [[1260,643],[1431,611],[1451,671],[1373,685],[1363,649],[1265,667]] },

  { id: 'paw11', label: '11',
    aliases: ['11', 'hala 11', 'pawilon 11', 'iglica'],
    shape: 'ellipse',
    points: [[1183,837],[1222,849],[1259,845],[1291,759],[1267,743],[1224,735],[1187,732],[1151,790],[1161,819]] },

  { id: 'paw3', label: '3',
    aliases: ['3', 'hala 3', 'pawilon 3', 'hall 3', 'h3', '3b', 'hala 3b'],
    points: [[1457,869],[1473,932],[1445,938],[1452,965],[1608,935],[1612,955],[1852,910],[1820,802]] },

  { id: 'paw3a', label: '3A',
    aliases: ['3a', 'hala 3a', 'pawilon 3a'],
    points: [[1794,701],[1860,921],[2075,878],[2005,661]] },
];
