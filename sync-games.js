#!/usr/bin/env node

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const s3 = require('s3');
const util = require('util');

const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);
const writeFile = util.promisify(fs.writeFile);


dotenv.config();


const CONTENT_ROOT = 'games';

const URL_ROOT = 'games';

const grades = ['Kindergarten', 'Grade 1', 'Grade 2'];

const gradeLabels = {
  'Kindergarten': 'Kindergarten',
  'Grade 1': '1st Grade',
  'Grade 2': '2nd Grade'
};


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
  writeGamesData(data);
  createGamePages(data);
});


// Create the games data file for the list page
const writeGamesData = async function(data) {
  const { categories, games } = data;

  const result = grades.map(function(grade) {
    const gradeGames = games.filter(game => game.level.startsWith(grade));

    const gradeCategories = categories
      .map(function(category) {
        return {
          name: category,
          games: gradeGames
            .filter(game => game.category === category)
            .map(function(game) {
              return {
                name: game.title,
                slug: _slugify(game.title),
                url: _getGameURL(game),
                image: _slugify(game.subgame)
              };
            })
        };
      })
      .filter(category => category.games.length > 0);

    return {
      grade: gradeLabels[grade],
      categories: gradeCategories
    };
  });

  const fileData = JSON.stringify(result, null, 4);
  return await writeFile(`./site/data/${CONTENT_ROOT}.json`, fileData);
}


// Create the individual game pages
const createGamePages = async function(data) {
  const { games } = data;
  const gamesDir = `./site/content/${CONTENT_ROOT}`;

  // Remove all the game pages
  const files = await readdir(gamesDir);
  await Promise.all(
    files.map(f => unlink(path.join(gamesDir, f)))
  );

  // Make the games list page
  const indexData = [
    '+++',
    'title = "Math Games"',
    `url = "/${URL_ROOT}"`,
    '+++'
  ].join('\n');
  await writeFile(`${gamesDir}/_index.md`, indexData);

  // Make the single game pages
  for (const game of games) {
    const data = [
      '+++',
      `title = "${game.title}"`,
      `url = "${_getGameURL(game)}"`,
      `grade = "${_getGrade(game)}"`,
      `gametype = "${game.game}"`,
      `subgametype = "${game.subgame}"`,
      '+++'
    ].join('\n');
    const path = `${gamesDir}/${_slugify(game.title)}.md`;
    await writeFile(path, data);
  }
}


const _getGameURL = function(game) {
  const gradeSlug = _slugify(_getGrade(game));
  const gameSlug = _slugify(game.title);
  return `/${URL_ROOT}/${gradeSlug}/${gameSlug}`;
}

const _getGrade = function(game) {
  const grade = grades.find(g => game.level.startsWith(g));
  return gradeLabels[grade];
}

const _slugify = function(val) {
  return val
    .replace(/[\s_,:\(\)]/g, '-')
    .replace(/[']/g, '')
    .replace(/--/g, '-')
    .replace(/-$/g, '')
    .toLowerCase();
}
