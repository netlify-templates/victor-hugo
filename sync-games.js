#!/usr/bin/env node

const _ = require('lodash');
const dotenv = require('dotenv');
const fs = require('fs');
const s3 = require('s3');

dotenv.config();

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
  formatData(JSON.parse(buffer.toString()));
});

const formatData = function(games) {
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
                image: `${_.kebabCase(game.short_name)}.png`
              };
            })
        };
      })
      .filter(category => category.games.length > 0);

    return {
      grade,
      categories: gradeCategories
    };
  });

  fs.writeFileSync('./site/data/games.json', JSON.stringify(result, null, 4));
}
