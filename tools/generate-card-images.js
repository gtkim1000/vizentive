// 도넛/네트워크 가상공간 카드용 저해상도 파생 이미지(320/640/1024px 폭) 일괄 생성.
// 실제 원본(public/portfolio/originals/original-NN.webp)은 그대로 두고,
// public/portfolio/cards/card-NN-{320,640,1024}.webp 를 새로 만든다.
// 원본이 해당 폭보다 작으면 확대하지 않고 원본 크기 그대로 저장한다(withoutEnlargement).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'public', 'portfolio', 'originals');
const OUT_DIR = path.join(__dirname, '..', 'public', 'portfolio', 'cards');
const WIDTHS = [320, 640, 1024];

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const files = fs.readdirSync(SRC_DIR).filter(f => /^original-\d+\.webp$/.test(f));
  console.log(`대상 원본 ${files.length}개, 파생본 ${files.length * WIDTHS.length}개 생성 시작...`);
  let made = 0, skipped = 0;
  for (const file of files) {
    const id = file.match(/^original-(\d+)\.webp$/)[1];
    const srcPath = path.join(SRC_DIR, file);
    for (const w of WIDTHS) {
      const outPath = path.join(OUT_DIR, `card-${id}-${w}.webp`);
      if (fs.existsSync(outPath)) { skipped++; continue; }
      await sharp(srcPath)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(outPath);
      made++;
    }
  }
  console.log(`완료: 새로 생성 ${made}개, 이미 존재해 건너뜀 ${skipped}개`);
}

run().catch(e => { console.error(e); process.exit(1); });
