// benchmark_ios_geekbench / benchmark_android_antutu 시딩 스크립트.
// 실행 전 supabase/migrations/20260909_create_device_benchmark_tables.sql을 Supabase SQL
// Editor에서 먼저 실행해 테이블을 만들어둬야 함(이 스크립트가 쓰는 REST API 키로는 DDL 불가).
//
// 출처:
//  - iOS: https://browser.geekbench.com/ios-benchmarks (Geekbench 7, 2026-09-09 사용자 제공 캡처)
//  - Android/기타: https://www.antutu.com/web/ranking (AnTuTu V11, 2026.8 업데이트, 2026-09-09 조회)
const fs = require('node:fs');

for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const match = line.match(/^\s*([^#][^=]*)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^['"]|['"]$/g, '');
}

const base = process.env.SUPABASE_URL?.replace(/\/$/, '');
const key = process.env.SUPABASE_SECRET_KEY;
if (!base || !key) throw new Error('SUPABASE_URL or SUPABASE_SECRET_KEY is missing');

// ---- iOS: device -> chip ----
const IOS_CHIP = {
  'iPad Pro 13-inch (M5)': 'Apple M5', 'iPad Pro 11-inch (M5)': 'Apple M5',
  'iPad Pro 13-inch (M4)': 'Apple M4', 'iPad Pro 11-inch (M4)': 'Apple M4',
  'iPhone 17 Pro Max': 'Apple A19 Pro', 'iPhone 17 Pro': 'Apple A19 Pro', 'iPhone Air': 'Apple A19 Pro',
  'iPhone 17': 'Apple A19',
  'iPhone 16 Pro': 'Apple A18 Pro', 'iPhone 16 Pro Max': 'Apple A18 Pro',
  'iPhone 16 Plus': 'Apple A18', 'iPhone 16': 'Apple A18', 'iPhone 16e': 'Apple A18',
  'iPad Air 11-inch (7th generation)': 'Apple M3', 'iPad Air 13-inch (7th generation)': 'Apple M3',
  'iPad mini (7th generation)': 'Apple A17 Pro',
  'iPhone 15 Pro Max': 'Apple A17 Pro', 'iPhone 15 Pro': 'Apple A17 Pro',
  'iPhone 14 Pro': 'Apple A16 Bionic', 'iPhone 14 Pro Max': 'Apple A16 Bionic',
  'iPad Air 13-inch (M2)': 'Apple M2', 'iPad Air 11-inch (M2)': 'Apple M2',
  'iPad (11th generation)': 'Apple A16',
  'iPad Pro (11-inch, 4th generation)': 'Apple M2', 'iPad Pro (12.9-inch, 6th generation)': 'Apple M2',
  'iPhone 15 Plus': 'Apple A16 Bionic', 'iPhone 15': 'Apple A16 Bionic',
  'iPad Pro (11-inch 3rd generation)': 'Apple M1', 'iPad Pro (12.9-inch 5th generation)': 'Apple M1',
  'iPad Air (5th generation)': 'Apple M1',
  'iPhone 13 Pro Max': 'Apple A15 Bionic', 'iPhone 13 Pro': 'Apple A15 Bionic',
  'iPhone 14 Plus': 'Apple A15 Bionic', 'iPhone 14': 'Apple A15 Bionic',
  'iPhone SE (3rd generation)': 'Apple A15 Bionic', 'iPhone 13 mini': 'Apple A15 Bionic', 'iPhone 13': 'Apple A15 Bionic',
  'iPad mini (6th generation)': 'Apple A15 Bionic',
  'iPhone 12 Pro Max': 'Apple A14 Bionic', 'iPhone 12 Pro': 'Apple A14 Bionic',
  'iPhone 12 Mini': 'Apple A14 Bionic', 'iPhone 12': 'Apple A14 Bionic',
  'iPad Air (4th generation)': 'Apple A14 Bionic', 'iPad (10th generation)': 'Apple A14 Bionic',
  'iPhone 11 Pro Max': 'Apple A13 Bionic', 'iPhone 11': 'Apple A13 Bionic', 'iPhone 11 Pro': 'Apple A13 Bionic',
  'iPad (9th generation)': 'Apple A13 Bionic', 'iPhone SE (2nd generation)': 'Apple A13 Bionic',
  'iPad Pro 11-inch (2nd generation)': 'Apple A12Z Bionic', 'iPad Pro 12.9-inch (4th generation)': 'Apple A12Z Bionic',
  'iPad Pro (12.9-inch 3rd Generation)': 'Apple A12X Bionic', 'iPad Pro (11-inch)': 'Apple A12X Bionic',
  'iPhone XS': 'Apple A12 Bionic', 'iPhone XS Max': 'Apple A12 Bionic',
  'iPad Air (3rd generation)': 'Apple A12 Bionic', 'iPad (8th generation)': 'Apple A12 Bionic',
  'iPad mini (5th generation)': 'Apple A12 Bionic', 'iPhone XR': 'Apple A12 Bionic',
};

// ---- iOS: [device, score] per metric (source 표 순서 그대로, 중복 기기명은 서로 다른 실측 샘플) ----
const IOS_SINGLE = [['iPad Pro 13-inch (M5)',3559],['iPad Pro 11-inch (M5)',3532],['iPad Pro 13-inch (M4)',3216],['iPad Pro 11-inch (M4)',3209],['iPad Pro 11-inch (M4)',3201],['iPad Pro 13-inch (M4)',3186],['iPhone 17 Pro Max',3166],['iPhone 17 Pro',3153],['iPhone Air',3034],['iPhone 17',2982],['iPhone 16 Pro',2892],['iPhone 16 Pro Max',2866],['iPhone 16 Plus',2801],['iPhone 16',2790],['iPad Air 11-inch (7th generation)',2750],['iPad Air 13-inch (7th generation)',2740],['iPhone 16e',2703],['iPad mini (7th generation)',2594],['iPhone 15 Pro Max',2528],['iPhone 15 Pro',2506],['iPhone 14 Pro',2370],['iPad Air 13-inch (M2)',2362],['iPad (11th generation)',2356],['iPad Air 11-inch (M2)',2356],['iPhone 14 Pro Max',2355],['iPad Pro (11-inch, 4th generation)',2344],['iPad Pro (12.9-inch, 6th generation)',2342],['iPhone 15 Plus',2264],['iPhone 15',2239],['iPad Pro (11-inch 3rd generation)',2193],['iPad Pro (12.9-inch 5th generation)',2158],['iPad Air (5th generation)',2145],['iPhone 13 Pro Max',2118],['iPhone 13 Pro',2105],['iPhone 14 Plus',2095],['iPhone 14',2080],['iPhone SE (3rd generation)',2023],['iPhone 13 mini',1975],['iPhone 13',1962],['iPhone 12 Pro Max',1933],['iPad Air (4th generation)',1917],['iPad mini (6th generation)',1914],['iPhone 12 Pro',1884],['iPad (10th generation)',1860],['iPhone 12 Mini',1842],['iPhone 12',1797],['iPhone 11 Pro Max',1566],['iPhone 11',1526],['iPhone 11 Pro',1500],['iPad (9th generation)',1463],['iPad Pro 11-inch (2nd generation)',1388],['iPad Pro 12.9-inch (4th generation)',1385],['iPad Pro (12.9-inch 3rd Generation)',1372],['iPhone SE (2nd generation)',1371],['iPad Pro (11-inch)',1342],['iPhone XS',1295],['iPhone XS Max',1271],['iPad Air (3rd generation)',1234],['iPad (8th generation)',1172],['iPad mini (5th generation)',1093],['iPhone XR',1035]];
const IOS_MULTI = [['iPad Pro 13-inch (M5)',15298],['iPad Pro 11-inch (M5)',14984],['iPad Pro 13-inch (M4)',13835],['iPad Pro 11-inch (M4)',13716],['iPad Pro 13-inch (M4)',13534],['iPad Pro 11-inch (M4)',13212],['iPad Air 13-inch (7th generation)',11930],['iPad Air 11-inch (7th generation)',11850],['iPad Air 11-inch (M2)',9975],['iPad Air 13-inch (M2)',9916],['iPad Pro (11-inch, 4th generation)',9903],['iPad Pro (12.9-inch, 6th generation)',9880],['iPhone 17 Pro Max',8793],['iPhone 17 Pro',8758],['iPad Pro (11-inch 3rd generation)',8756],['iPad Pro (12.9-inch 5th generation)',8660],['iPad Air (5th generation)',8507],['iPhone Air',8457],['iPhone 17',8258],['iPhone 16 Pro',7779],['iPhone 16 Pro Max',7679],['iPhone 16 Plus',7601],['iPhone 16',7553],['iPhone 16e',7223],['iPad mini (7th generation)',6921],['iPhone 15 Pro Max',6866],['iPhone 15 Pro',6824],['iPhone 14 Pro',6400],['iPhone 14 Pro Max',6378],['iPhone 15 Plus',5974],['iPhone 15',5955],['iPad (11th generation)',5788],['iPhone 13 Pro Max',5483],['iPhone 13 Pro',5437],['iPhone 14 Plus',5424],['iPhone 14',5394],['iPhone SE (3rd generation)',5133],['iPad Pro 12.9-inch (4th generation)',5131],['iPad Pro 11-inch (2nd generation)',5118],['iPad Pro (12.9-inch 3rd Generation)',5063],['iPad mini (6th generation)',5030],['iPhone 13 mini',5023],['iPhone 13',4985],['iPad Pro (11-inch)',4875],['iPad Air (4th generation)',4725],['iPhone 12 Pro Max',4701],['iPad (10th generation)',4490],['iPhone 12 Pro',4473],['iPhone 12 Mini',4319],['iPhone 12',4229],['iPhone 11 Pro Max',3631],['iPad (9th generation)',3602],['iPhone 11 Pro',3451],['iPhone 11',3321],['iPad Air (3rd generation)',2986],['iPad mini (5th generation)',2780],['iPad (8th generation)',2726],['iPhone SE (2nd generation)',2718],['iPhone XS',2715],['iPhone XS Max',2543],['iPhone XR',2402]];
const IOS_METAL = [['iPad Pro 13-inch (M5)',71769],['iPad Pro 11-inch (M5)',70804],['iPad Pro 11-inch (M4)',53445],['iPad Pro 13-inch (M4)',53271],['iPad Pro 11-inch (M4)',52780],['iPad Pro 13-inch (M4)',52398],['iPad Air 11-inch (7th generation)',45000],['iPad Air 13-inch (7th generation)',44562],['iPad Pro (12.9-inch, 6th generation)',43011],['iPad Pro (11-inch, 4th generation)',42876],['iPhone 17 Pro Max',42677],['iPhone 17 Pro',42427],['iPad Air 13-inch (M2)',39128],['iPad Air 11-inch (M2)',37709],['iPhone Air',37033],['iPhone 17',35057],['iPad Pro (11-inch 3rd generation)',28318],['iPad Pro (12.9-inch 5th generation)',27690],['iPhone 16 Pro',27363],['iPhone 16 Pro Max',27107],['iPad Air (5th generation)',26340],['iPhone 16',26009],['iPhone 16 Plus',26004],['iPhone 15 Pro Max',23320],['iPhone 15 Pro',22958],['iPhone 16e',22471],['iPad mini (7th generation)',21283],['iPhone 14 Pro',20240],['iPhone 14 Pro Max',19893],['iPhone 15',18480],['iPhone 15 Plus',18413],['iPhone 13 Pro',17019],['iPhone 13 Pro Max',16799],['iPhone 14',16385],['iPad (11th generation)',16256],['iPad Pro (12.9-inch 3rd Generation)',16143],['iPhone 14 Plus',16139],['iPad mini (6th generation)',15850],['iPad Pro 11-inch (2nd generation)',14778],['iPhone SE (3rd generation)',14751],['iPhone 13',14664],['iPhone 13 mini',14468],['iPad Air (4th generation)',14462],['iPad Pro 12.9-inch (4th generation)',13977],['iPad Pro (11-inch)',13792],['iPad (10th generation)',13625],['iPhone 12 Mini',12728],['iPhone 12 Pro',12625],['iPhone 12',12436],['iPhone 12 Pro Max',12149],['iPhone 11 Pro',10419],['iPhone 11',9596],['iPhone 11 Pro Max',9486],['iPad (9th generation)',8063],['iPhone SE (2nd generation)',7741],['iPad Air (3rd generation)',7573],['iPhone XS',6367],['iPad mini (5th generation)',6330],['iPhone XS Max',6005],['iPad (8th generation)',5763],['iPhone XR',4215]];

const iosRows = [
  ...IOS_SINGLE.map(([device, score]) => ({ device, chip: IOS_CHIP[device], metric: 'single_core', score })),
  ...IOS_MULTI.map(([device, score]) => ({ device, chip: IOS_CHIP[device], metric: 'multi_core', score })),
  ...IOS_METAL.map(([device, score]) => ({ device, chip: IOS_CHIP[device], metric: 'metal', score })),
];
if (iosRows.some(row => !row.chip)) throw new Error('IOS_CHIP 매핑 누락: ' + iosRows.find(row => !row.chip).device);

// ---- Android/기타: [rank, device, total_score] (antutu.com/web/ranking, V11, 2026.8 업데이트) ----
const ANDROID_RANKING = [
  [1,'Red Magic 11 Pro',4013168],[2,'iQOO 15',3758268],[3,'Poco F8 Ultra',3651476],[4,'REDMI K90 Pro Max',3622315],
  [5,'OnePlus 15',3606149],[6,'Xiaomi 17 Ultra',3600724],[7,'Galaxy S26 Ultra',3463142],[8,'vivo X300 Pro',3326259],
  [9,'Mi 17',3248535],[10,'Mi 17T Pro',3182664],[11,'REDMI K90',3077585],[12,'vivo X300',3037992],
  [13,'Poco F8 Pro',3024818],[14,'HONOR Magic8 Pro',3023211],[15,'iQOO Z11 Turbo',2968990],[16,'Poco F7 Ultra',2932885],
  [17,'Mi 15',2914100],[18,'Galaxy S26',2827538],[19,'iQOO 15R',2817788],[20,'Galaxy Z Fold8',2814251],
  [21,'OnePlus Ace 6T',2788201],[22,'iQOO Z10 Turbo+',2786169],[23,'Galaxy S25 Ultra',2780751],[24,'Galaxy S25+',2763072],
  [25,'REDMI Turbo 5 Max',2726802],[26,'Poco X8 Pro Max',2604459],[27,'Mi 15T Pro',2583659],[28,'Galaxy S25',2583039],
  [29,'realme GT 7',2415876],[30,'iQOO Neo10',2337347],[31,'iQOO Z10 Turbo Pro',2294302],[32,'iQOO Neo 10',2266281],
  [33,'OPPO K13 Turbo Pro 5G',2244450],[34,'REDMI Turbo 4 Pro',2221665],[35,'Galaxy S24 Ultra',2201149],[36,'Poco F7',2199079],
  [37,'Mi 14T Pro',2129644],[38,'Mi 17T',2026828],[39,'realme GT 7T',2018141],[40,'Galaxy S25 FE',2000659],
  [41,'Poco X8 Pro',1977887],[42,'Infinix GT 50 Pro',1959760],[43,'Galaxy S24+',1876702],[44,'Poco X7 Pro',1874182],
  [45,'Galaxy S24 FE',1849346],[46,'Galaxy S24',1820628],[47,'Poco F6 Pro',1756020],[48,'Poco F6',1704455],
  [49,'Galaxy S23+',1695011],[50,'Redmi Turbo 3',1689352],[51,'iQOO Neo 10R',1686701],[52,'Galaxy S23 Ultra',1684869],
  [53,'TECNO POVA 7 Ultra 5G',1673316],[54,'Galaxy S23',1656761],[55,'Infinix GT 30 Pro',1591019],[56,'Mi 14T',1559755],
  [57,'Motorola Edge 60 Pro',1537550],[58,'Poco X6 Pro 5G',1525486],[59,'Galaxy A57',1359649],[60,'Motorola Edge 70',1336693],
  [61,'Poco F5',1260756],[62,'Infinix GT 20 Pro',1256100],[63,'Galaxy A56',1223886],[64,'Mi 13T',1183282],
  [65,'Mi 11T Pro',1035727],[66,'Redmi Note 13 Pro+',1015859],[67,'Poco F3',998482],[68,'Galaxy A55 5G',996960],
  [69,'Motorola Edge 70 Fusion',990586],[70,'REDMI Note 15 Pro+',975892],[71,'Poco F4',961250],[72,'Poco M8 Pro',946831],
  [73,'Redmi Note 14 Pro+',917150],[74,'HONOR X9d 5G',911340],[75,'Infinix NOTE 60',907438],[76,'Infinix GT 30',906794],
  [77,'Infinix NOTE 60 Pro',905521],[78,'Google Pixel 6a',901837],[79,'Infinix NOTE 50S 5G',886115],[80,'Galaxy S20 FE 5G',881404],
  [81,'realme P4x 5G',876440],[82,'REDMI Note 15 Pro',876387],[83,'Galaxy S20 FE 4G',872944],[84,'Motorola Moto G86 5G',869478],
  [85,'Motorola Edge 60 Fusion',862996],[86,'Poco M8',837903],[87,'REDMI Note 15',825374],[88,'TECNO POVA 7 5G',825080],
  [89,'vivo T4x 5G',825052],[90,'Galaxy A36 5G',816934],[91,'Redmi Note 14 Pro',804731],[92,'Poco X7',803683],
  [93,'Poco X3 Pro',797072],[94,'Poco X5 Pro 5G',781764],[95,'TECNO POVA Curve 5G',765777],[96,'Galaxy S21 5G',759668],
  [97,'Galaxy A26',754064],[98,'Infinix NOTE Edge',750153],[99,'Galaxy A35 5G',739266],[100,'Galaxy A54',737262],
  [101,'Galaxy S21 FE 5G',725133],[102,'Poco M7 Pro 5G',661238],[103,'Redmi Note 14 5G',660807],[104,'Motorola Moto G56',657941],
  [105,'Galaxy A17 5G',603772],[106,'nubia Neo3 5G',601751],[107,'Infinix HOT 60 Pro+',582651],[108,'Infinix NOTE 40',575446],
  [109,'Infinix NOTE 50 Pro',570562],[110,'Infinix HOT 50 Pro+',566719],[111,'Redmi Note 14 4G',565160],[112,'Redmi Note 13 Pro',563419],
  [113,'TECNO POVA 7 Neo',561891],[114,'Poco M6 Pro',555618],[115,'Redmi Note 14 Pro 4G',550286],[116,'Galaxy A17 4G',547742],
  [117,'Galaxy A07',528428],[118,'Galaxy A16',510132],
];
const androidRows = ANDROID_RANKING.map(([rank, device, total_score]) => ({ rank, device, total_score }));

async function upsert(table, rows, conflictCol) {
  const url = `${base}/rest/v1/${table}${conflictCol ? `?on_conflict=${conflictCol}` : ''}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      Prefer: conflictCol ? 'resolution=merge-duplicates,return=minimal' : 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!response.ok) throw new Error(`${table}: ${response.status} ${(await response.text()).slice(0, 500)}`);
}

async function count(table) {
  const response = await fetch(`${base}/rest/v1/${table}?select=id`, {
    headers: { apikey: key, Prefer: 'count=exact' },
  });
  return response.headers.get('content-range')?.split('/')[1] ?? '?';
}

async function main() {
  // benchmark_ios_geekbench는 유니크 제약이 없어(원본에 동일 기기명 중복 샘플 존재) 재실행 시
  // 중복 삽입될 수 있음 — 매번 지우고 새로 채움(전량 참고자료 테이블이라 안전).
  const del = await fetch(`${base}/rest/v1/benchmark_ios_geekbench?id=not.is.null`, {
    method: 'DELETE', headers: { apikey: key, Prefer: 'return=minimal' },
  });
  if (!del.ok) throw new Error(`benchmark_ios_geekbench delete: ${del.status} ${(await del.text()).slice(0, 300)}`);

  await upsert('benchmark_ios_geekbench', iosRows, null);
  await upsert('benchmark_android_antutu', androidRows, 'device');

  console.log(`IOS_ROWS_INSERTED=${iosRows.length}`);
  console.log(`ANDROID_ROWS_UPSERTED=${androidRows.length}`);
  console.log(`IOS_TABLE_COUNT=${await count('benchmark_ios_geekbench')}`);
  console.log(`ANDROID_TABLE_COUNT=${await count('benchmark_android_antutu')}`);
}

main().catch(error => { console.error(`SEED_ERROR=${error.message}`); process.exitCode = 1; });
