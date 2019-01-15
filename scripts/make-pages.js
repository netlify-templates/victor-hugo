#!/usr/bin/env node

const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const s3 = require('s3');
const util = require('util');
const {
  GAMES_ROOT,
  GRADES_ROOT,
  REPO_ROOT,
  SKILLS_ROOT,
  grades,
  gradeLabels,
  clearDirectory,
  downloadGameData,
  getGameURL,
  getGrade,
  slugify
} = require('./helpers');

const readdir = util.promisify(fs.readdir);
const unlink = util.promisify(fs.unlink);
const writeFile = util.promisify(fs.writeFile);


// Main function for the whole script
async function main() {
  await cleanDirs();

  const data = await downloadGameData();

  writeGamesListData(data);
  writeGamesSingleData(data);
  createGamePages(data);
  createGradePages(data);

  const skillData = await writeSkillsData(data);
  createSkillPages(skillData);

  writeGradesData(data);
}


// Remove all the data and content files
const cleanDirs = async function() {
  const paths = [
    `${REPO_ROOT}/site/data/${GAMES_ROOT}`,
    `${REPO_ROOT}/site/content/${GAMES_ROOT}`,
    `${REPO_ROOT}/site/data/${SKILLS_ROOT}`,
    `${REPO_ROOT}/site/content/${SKILLS_ROOT}`
  ];
  return await Promise.all(paths.map(path => clearDirectory(path)));
}


// Create the games data file for the list page
const writeGamesListData = async function(data) {
  const { categories, games } = data;

  const result = grades.map(function(grade) {
    const gradeGames = games.filter(game => game.level.startsWith(grade));

    const gradeCategories = categories
      .map(function(category) {
        return {
          name: category.name,
          games: gradeGames
            .filter(game => game.category === category.name)
            .sort((a, b) => a.levelIndex - b.levelIndex)
            .map(game => _gameData(game))
        };
      })
      .filter(attrs => attrs.games.length > 0);

    return {
      grade: gradeLabels[grade],
      categories: gradeCategories
    };
  });

  const fileData = JSON.stringify(result, null, 4);
  return await writeFile(
    `${REPO_ROOT}/site/data/${GAMES_ROOT}/_index.json`, fileData
  );
}


// Create the games data files for the single pages
const writeGamesSingleData = async function(data) {
  const { games } = data;

  for (const game of games) {
    const fileData = JSON.stringify({'standards': game.standards}, null, 4);
    await writeFile(
      `${REPO_ROOT}/site/data/${GAMES_ROOT}/${slugify(game.page_title)}.json`,
      fileData
    );
  }
}


// Create the skills data file for the list page
const writeSkillsData = async function(data) {
  const { categories, games } = data;
  const result = categories
    .map(function(category) {
      return {
        category,
        games: games
          .filter(game => game.category === category.name)
          .sort((a, b) => a.levelIndex - b.levelIndex)
          .map(game => _gameData(game))
      };
    })
    .filter(attrs => attrs.games.length > 0);

  const fileData = JSON.stringify(result, null, 4);
  await writeFile(`${REPO_ROOT}/site/data/${SKILLS_ROOT}.json`, fileData);

  return result;
}


// Create the grade levels data file
const writeGradesData = async function(data) {
  const fileData = JSON.stringify(data.grades, null, 4);
  return await writeFile(`${REPO_ROOT}/site/data/${GRADES_ROOT}.json`, fileData);
}


// Create the individual game pages
const createGamePages = async function(data) {
  const { games } = data;
  const gamesDir = `${REPO_ROOT}/site/content/${GAMES_ROOT}`;

  // Make the games list page
  const indexData = [
    '+++',
    'title = "Math Games | MathBRIX"',
    'description = "A complete list of every MathBRIX game"',
    `url = "/${GAMES_ROOT}"`,
    '+++'
  ].join('\n');
  await writeFile(`${gamesDir}/_index.md`, indexData);

  // Make the single game pages
  for (const game of games) {
    const data = [
      '+++',
      `airtableid = "${game.airtable_id}"`,
      `title = "${game.serp_title}"`,
      `pagetitle = "${game.page_title}"`,
      `description = "${game.serp_description}"`,
      `pagedescription = "${game.page_description}"`,
      `slug = "${slugify(game.page_title)}"`,
      `url = "${getGameURL(game)}"`,
      `grade = "${getGrade(game)}"`,
      `category = "${game.category}"`,
      `gametype = "${game.game}"`,
      `subgametype = "${game.subgame}"`,
      `image = "${slugify(game.subgame)}"`,
      '+++'
    ].join('\n');
    const path = `${gamesDir}/${slugify(game.page_title)}.md`;
    await writeFile(path, data);
  }
}


// Create individual grade level pages
const createGradePages = async function (data) {
  const { grades } = data;
  const gradesDir = `${REPO_ROOT}/site/content/${GRADES_ROOT}`;

  for (const grade of grades) {
    const data = [
      '+++',
      `name = "${grade.name}"`,
      `alternatename = "${grade.alternate_name}"`,
      `alternatename2 = "${grade.alternate_name_2}"`,
      `title = "${grade.serp_title}"`,
      `pagetitle = "${grade.page_title}"`,
      `description = "${grade.full_description}"`,
      `url = "${slugify(grade.name)}"`,
      '+++'
    ].join('\n');
    const path = `${gradesDir}/${slugify(grade.name)}.md`;
    await writeFile(path, data);
  }
}


// Create the individual skill pages
const createSkillPages = async function(categoryData) {
  const skillsDir = `${REPO_ROOT}/site/content/${SKILLS_ROOT}`;

  // Make the skills list page
  const indexData = [
    '+++',
    'title = "Math Skills | MathBRIX"',
    'description = "A complete list of every math skill that MathBRIX teaches"',
    `url = "/${SKILLS_ROOT}"`,
    '+++'
  ].join('\n');
  await writeFile(`${skillsDir}/_index.md`, indexData);

  // Make the single skill pages
  for (const { category } of categoryData) {
    const data = [
      '+++',
      `title = "${category.title} | MathBRIX"`,
      `pagetitle = "${category.title}"`,
      `description = "${category.full_description}"`,
      `url = "/${SKILLS_ROOT}/${slugify(category.name)}"`,
      '+++'
    ].join('\n');
    const path = `${skillsDir}/${slugify(category.name)}.md`;
    await writeFile(path, data);
  }
}


const _gameData = function(game) {
  return {
    name: game.page_title,
    slug: slugify(game.page_title),
    url: getGameURL(game),
    image: slugify(game.subgame)
  };
}


main();
