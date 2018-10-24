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
const URL_ROOT = 'math-games';


const client = s3.createClient({
  s3Options: {
    accessKeyId: process.env.AWS_KEY,
    secretAccessKey: process.env.AWS_SECRET,
    region: 'us-west-2'
  }
});


client.downloadBuffer({
  Bucket: 'mathbrix-assets',
  Key: 'games.json'
}).on('end', function(buffer) {
  const data = JSON.parse(buffer.toString());
  writeGamesData(data);
  createGamePages(data);
});


// Create the games data file for the list page
const writeGamesData = async function(games) {
  const grades = ['Kindergarten', 'Grade 1', 'Grade 2'];

  const categories = [
    'Counting',
    'Reading and Writing Numerals',
    'Comparison',
    'Classification',
    'Add and Subtract within 5',
    'Add and Subtract within 10',
    'Base Ten Recognition',
    'Add and Subtract within 20',
    'Even and Odd Numbers',
    'Multiplication Precursor',
    'Add and Subtract within 100',
    'Add and Subtract within 1000'
  ];

  const gradeLabels = {
    'Kindergarten': 'Kindergarten',
    'Grade 1': '1st Grade',
    'Grade 2': '2nd Grade'
  };

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
                name: game.full_name,
                slug: _slugify(game.short_name),
                verboseSlug: _slugify(game.full_name)
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
const createGamePages = async function(games) {
  const gamesDir = `./site/content/${CONTENT_ROOT}`;

  // Remove all the game pages
  const files = await readdir(gamesDir);
  await Promise.all(
    files.map(f => unlink(path.join(gamesDir, f)))
  );

  const indexData = [
    '+++',
    'title = "Math Games"',
    `url = "/${URL_ROOT}"`,
    '+++'
  ].join('\n');
  await writeFile(`${gamesDir}/_index.md`, indexData);

  for (const game of games) {
    const data = [
      '+++',
      `title = "${game.full_name}"`,
      `url = "/${URL_ROOT}/${_slugify(game.full_name)}"`,
      '+++'
    ].join('\n');
    const path = `${gamesDir}/${_slugify(game.full_name)}.md`;
    await writeFile(path, data);
  }
}


const _slugify = function(val) {
  return val.replace(/[\s_]/g, '-').toLowerCase();
}
