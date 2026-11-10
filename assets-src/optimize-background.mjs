/* Original generated BURNED background: texture-preserving delivery conversion. */
import sharp from 'sharp';
import fs from 'node:fs/promises';

const input = 'public/assets/under-plasma.png';
const output = 'public/assets/under-plasma.webp';
await sharp(input)
  .webp({quality:90,effort:6,smartSubsample:true})
  .toFile(output);
const [source,result,metadata] = await Promise.all([
  fs.stat(input), fs.stat(output), sharp(output).metadata(),
]);
console.log(JSON.stringify({
  input, output, width:metadata.width, height:metadata.height,
  sourceBytes:source.size, outputBytes:result.size,
  savingsPercent:Number(((1-result.size/source.size)*100).toFixed(1)),
  settings:{quality:90,effort:6,smartSubsample:true},
},null,2));
