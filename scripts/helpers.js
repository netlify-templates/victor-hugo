const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const s3 = require('s3');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);
const writeFile = util.promisify(fs.writeFile);


const REPO_ROOT = '..';

const GAMES_ROOT = 'games';

const SKILLS_ROOT = 'skills';

const grades = ['Kindergarten', 'Grade 1', 'Grade 2'];

const gradeLabels = {
  'Kindergarten': 'Kindergarten',
  'Grade 1': '1st Grade',
  'Grade 2': '2nd Grade'
};

const result = dotenv.config({
  path: path.join(REPO_ROOT, '.env')
});

if (result.error) {
  throw result.error;
}


const downloadGameData = function() {
  return new Promise(function(resolve) {
    const client = s3.createClient({
      s3Options: {
        accessKeyId: process.env.AWS_KEY,
        secretAccessKey: process.env.AWS_SECRET,
        region: 'us-west-2'
      }
    });

    client.downloadBuffer({
      Bucket: 'mathbrix-assets',
      Key: 'brochure-site-games.json'
    }).on('end', function(buffer) {
      const data = JSON.parse(buffer.toString());
      resolve(data);
    });
  });
}

const getGameURL = function(game) {
  const gradeSlug = slugify(getGrade(game));
  const gameSlug = slugify(game.title);
  return `/${gradeSlug}/${gameSlug}`;
}

const getGrade = function(game) {
  const grade = grades.find(g => game.level.startsWith(g));
  return gradeLabels[grade];
}

const slugify = function(val) {
  return val
    .replace(/[\s_,:\(\)]/g, '-')
    .replace(/[']/g, '')
    .replace(/--/g, '-')
    .replace(/-$/g, '')
    .toLowerCase();
}


Object.assign(exports, {
  GAMES_ROOT,
  REPO_ROOT,
  SKILLS_ROOT,
  grades,
  gradeLabels,
  downloadGameData,
  getGameURL,
  getGrade,
  slugify
});
