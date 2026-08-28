// 포트폴리오 그리드/데이터 월용 저해상도 파생 이미지(320/640px 폭) 일괄 생성.
// 원본은 public/portfolio/art/art-NN.webp(이미 중간 해상도로 준비된 자산) 그대로 두고,
// public/portfolio/art/art-NN-{320,640}.webp 를 새로 만든다.
// 원본이 해당 폭보다 작으면 확대하지 않고 원본 크기 그대로 저장한다(withoutEnlargement).
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'public', 'portfolio', 'art');
const WIDTHS = [320, 640];

async function run() {
  const files = fs.readdirSync(SRC_DIR).filter(f => /^art-\d+\.webp$/.test(f));
  console.log(`대상 원본 ${files.length}개, 파생본 ${files.length * WIDTHS.length}개 생성 시작...`);
  let made = 0, skipped = 0;
  for (const file of files) {
    const id = file.match(/^art-(\d+)\.webp$/)[1];
    const srcPath = path.join(SRC_DIR, file);
    for (const w of WIDTHS) {
      const outPath = path.join(SRC_DIR, `art-${id}-${w}.webp`);
      if (fs.existsSync(outPath)) { skipped++; continue; }
      await sharp(srcPath)
        .resize({ width: w, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toFile(outPath);
      made++;
    }
  }
  console.log(`완료: 새로 생성 ${made}개, 이미 존재해 건너뜀 ${skipped}개`);
}

run().catch(e => { console.error(e); process.exit(1); });
