import fs from 'fs';
import path from 'path';

// Read logo.jpg and remove white background pixels
const inputPath = 'c:/Users/dell/Downloads/PayVerse (1)/public/logo.jpg';

console.log('Checking logo file exists:', fs.existsSync(inputPath));
